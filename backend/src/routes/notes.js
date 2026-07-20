import express from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireUser } from '../middleware.js';

const router = express.Router();
router.use(requireUser);

function getTagsForNote(noteId) {
  return db
    .prepare(
      `SELECT t.id, t.name FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ? ORDER BY t.name`
    )
    .all(noteId);
}

function serializeNote(row) {
  return {
    ...row,
    pinned: !!row.pinned,
    archived: !!row.archived,
    tasks: JSON.parse(row.tasks_json || '[]'),
    tags: getTagsForNote(row.id),
  };
}

function setNoteTags(noteId, tagIds) {
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  if (!Array.isArray(tagIds) || tagIds.length === 0) return;
  const insert = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) insert.run(noteId, tagId);
}

// GET /api/notes?search=&category=&tag=&type=&color=&completed=&page=&pageSize=
router.get('/', (req, res) => {
  const { search, category, tag, type, color, completed } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));

  let sql = `SELECT DISTINCT n.* FROM notes n`;
  const where = ['n.user_id = ?', 'n.archived = 0'];
  const params = [req.userId];

  if (tag) {
    sql += ` JOIN note_tags nt ON nt.note_id = n.id JOIN tags t ON t.id = nt.tag_id`;
    where.push('t.id = ?');
    params.push(tag);
  }

  if (search) {
    where.push(`(
      n.title LIKE ? OR n.content LIKE ?
      OR EXISTS (SELECT 1 FROM categories c WHERE c.id = n.category_id AND c.name LIKE ?)
      OR EXISTS (
        SELECT 1 FROM note_tags nt2 JOIN tags t2 ON t2.id = nt2.tag_id
        WHERE nt2.note_id = n.id AND t2.name LIKE ?
      )
    )`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('n.category_id = ?');
    params.push(category);
  }
  if (type) {
    where.push('n.type = ?');
    params.push(type);
  }
  if (color) {
    where.push('n.color = ?');
    params.push(color);
  }
  if (req.query.due_today === 'true') {
    where.push(`n.type = 'task' AND date(n.due_date) = date('now', 'localtime')`);
  }
  if (completed === 'true') {
    where.push(`n.type = 'task' AND json_array_length(n.tasks_json) > 0 AND NOT EXISTS (
      SELECT 1 FROM json_each(n.tasks_json) je WHERE json_extract(je.value, '$.done') = 0
    )`);
  } else if (completed === 'false') {
    where.push(`n.type = 'task' AND EXISTS (
      SELECT 1 FROM json_each(n.tasks_json) je WHERE json_extract(je.value, '$.done') = 0
    )`);
  }

  sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY n.pinned DESC, n.updated_at DESC';
  sql += ' LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const rows = db.prepare(sql).all(...params);
  const notes = rows.map(serializeNote);

  res.json({ notes, page, pageSize });
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(serializeNote(row));
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const id = uuid();
  const now = new Date().toISOString();
  const note = {
    id,
    user_id: req.userId,
    title: body.title || '',
    content: body.content || '',
    type: body.type === 'task' ? 'task' : 'note',
    category_id: body.category_id || null,
    color: body.color || 'yellow',
    due_date: body.due_date || null,
    pinned: body.pinned ? 1 : 0,
    archived: 0,
    tasks_json: JSON.stringify(body.tasks || []),
    kanban_column_id: body.kanban_column_id || null,
    kanban_position: body.kanban_position ?? null,
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO notes (id, user_id, title, content, type, category_id, color, due_date, pinned, archived, tasks_json, kanban_column_id, kanban_position, created_at, updated_at)
     VALUES (@id, @user_id, @title, @content, @type, @category_id, @color, @due_date, @pinned, @archived, @tasks_json, @kanban_column_id, @kanban_position, @created_at, @updated_at)`
  ).run(note);

  if (Array.isArray(body.tag_ids)) setNoteTags(id, body.tag_ids);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.status(201).json(serializeNote(row));
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const body = req.body || {};
  const updated = {
    title: body.title ?? existing.title,
    content: body.content ?? existing.content,
    type: body.type ?? existing.type,
    category_id: body.category_id !== undefined ? body.category_id : existing.category_id,
    color: body.color ?? existing.color,
    due_date: body.due_date !== undefined ? body.due_date : existing.due_date,
    pinned: body.pinned !== undefined ? (body.pinned ? 1 : 0) : existing.pinned,
    archived: body.archived !== undefined ? (body.archived ? 1 : 0) : existing.archived,
    tasks_json: body.tasks !== undefined ? JSON.stringify(body.tasks) : existing.tasks_json,
    updated_at: new Date().toISOString(),
    id: req.params.id,
    user_id: req.userId,
  };

  db.prepare(
    `UPDATE notes SET title=@title, content=@content, type=@type, category_id=@category_id,
     color=@color, due_date=@due_date, pinned=@pinned, archived=@archived, tasks_json=@tasks_json,
     updated_at=@updated_at WHERE id=@id AND user_id=@user_id`
  ).run(updated);

  if (Array.isArray(body.tag_ids)) setNoteTags(req.params.id, body.tag_ids);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(serializeNote(row));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

export default router;
