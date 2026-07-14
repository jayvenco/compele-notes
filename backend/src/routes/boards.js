import express from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireUser } from '../middleware.js';

const router = express.Router();
router.use(requireUser);

const DEFAULT_COLUMNS = [
  { name: 'Backlog', color: 'gray' },
  { name: 'To Do', color: 'blue' },
  { name: 'In Progress', color: 'yellow' },
  { name: 'Done', color: 'green' },
];

function getBoard(boardId, userId) {
  const board = db
    .prepare('SELECT * FROM kanban_boards WHERE id = ? AND user_id = ?')
    .get(boardId, userId);
  if (!board) return null;

  const columns = db
    .prepare('SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position')
    .all(boardId);

  const columnIds = columns.map((c) => c.id);
  const notes =
    columnIds.length > 0
      ? db
          .prepare(
            `SELECT n.*, GROUP_CONCAT(t.id || '::' || t.name) AS tag_list
             FROM notes n
             LEFT JOIN note_tags nt ON nt.note_id = n.id
             LEFT JOIN tags t ON t.id = nt.tag_id
             WHERE n.kanban_column_id IN (${columnIds.map(() => '?').join(',')})
             GROUP BY n.id
             ORDER BY n.kanban_position`
          )
          .all(...columnIds)
      : [];

  const notesByColumn = {};
  for (const n of notes) {
    const tags = n.tag_list
      ? n.tag_list.split(',').map((s) => {
          const [id, name] = s.split('::');
          return { id, name };
        })
      : [];
    const note = {
      ...n,
      pinned: !!n.pinned,
      archived: !!n.archived,
      tasks: JSON.parse(n.tasks_json || '[]'),
      tags,
    };
    delete note.tag_list;
    if (!notesByColumn[n.kanban_column_id]) notesByColumn[n.kanban_column_id] = [];
    notesByColumn[n.kanban_column_id].push(note);
  }

  return {
    ...board,
    columns: columns.map((c) => ({ ...c, notes: notesByColumn[c.id] || [] })),
  };
}

// List boards
router.get('/', (req, res) => {
  const boards = db
    .prepare('SELECT * FROM kanban_boards WHERE user_id = ? ORDER BY created_at')
    .all(req.userId);
  res.json(boards);
});

// Create board
router.post('/', (req, res) => {
  const name = (req.body?.name || 'My Board').trim();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO kanban_boards (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
    id, req.userId, name, now
  );
  const insertCol = db.prepare(
    'INSERT INTO kanban_columns (id, board_id, name, position, color, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  DEFAULT_COLUMNS.forEach((col, i) => insertCol.run(uuid(), id, col.name, i, col.color, now));
  res.status(201).json(getBoard(id, req.userId));
});

// Get board with columns + cards
router.get('/:id', (req, res) => {
  const board = getBoard(req.params.id, req.userId);
  if (!board) return res.status(404).json({ error: 'Not found' });
  res.json(board);
});

// Rename board
router.put('/:id', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = db
    .prepare('UPDATE kanban_boards SET name = ? WHERE id = ? AND user_id = ?')
    .run(name, req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ id: req.params.id, name });
});

// Delete board (unassigns notes from columns)
router.delete('/:id', (req, res) => {
  const cols = db
    .prepare('SELECT id FROM kanban_columns WHERE board_id = ?')
    .all(req.params.id)
    .map((c) => c.id);
  if (cols.length) {
    db.prepare(
      `UPDATE notes SET kanban_column_id = NULL, kanban_position = NULL
       WHERE kanban_column_id IN (${cols.map(() => '?').join(',')})`
    ).run(...cols);
  }
  db.prepare('DELETE FROM kanban_boards WHERE id = ? AND user_id = ?').run(
    req.params.id, req.userId
  );
  res.status(204).end();
});

// Add column
router.post('/:id/columns', (req, res) => {
  const board = db
    .prepare('SELECT id FROM kanban_boards WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const name = (req.body?.name || 'New Column').trim();
  const color = req.body?.color || 'gray';
  const maxPos = db
    .prepare('SELECT MAX(position) as m FROM kanban_columns WHERE board_id = ?')
    .get(req.params.id)?.m ?? -1;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO kanban_columns (id, board_id, name, position, color, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, name, maxPos + 1, color, now);
  res.status(201).json({ id, board_id: req.params.id, name, position: maxPos + 1, color });
});

// Update column (rename / recolor)
router.put('/:id/columns/:colId', (req, res) => {
  const name = req.body?.name;
  const color = req.body?.color;
  if (!name && !color) return res.status(400).json({ error: 'Nothing to update' });
  if (name) {
    db.prepare('UPDATE kanban_columns SET name = ? WHERE id = ? AND board_id = ?').run(
      name.trim(), req.params.colId, req.params.id
    );
  }
  if (color) {
    db.prepare('UPDATE kanban_columns SET color = ? WHERE id = ? AND board_id = ?').run(
      color, req.params.colId, req.params.id
    );
  }
  const col = db.prepare('SELECT * FROM kanban_columns WHERE id = ?').get(req.params.colId);
  res.json(col);
});

// Delete column (unassigns notes)
router.delete('/:id/columns/:colId', (req, res) => {
  db.prepare(
    'UPDATE notes SET kanban_column_id = NULL, kanban_position = NULL WHERE kanban_column_id = ?'
  ).run(req.params.colId);
  db.prepare('DELETE FROM kanban_columns WHERE id = ? AND board_id = ?').run(
    req.params.colId, req.params.id
  );
  res.status(204).end();
});

// Move a note to a column (or remove from board)
router.patch('/:id/move', (req, res) => {
  const { note_id, column_id, position } = req.body || {};
  if (!note_id) return res.status(400).json({ error: 'note_id required' });

  const note = db
    .prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?')
    .get(note_id, req.userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  if (column_id) {
    const col = db
      .prepare('SELECT id FROM kanban_columns WHERE id = ? AND board_id = ?')
      .get(column_id, req.params.id);
    if (!col) return res.status(404).json({ error: 'Column not found' });
  }

  db.prepare(
    'UPDATE notes SET kanban_column_id = ?, kanban_position = ?, updated_at = ? WHERE id = ?'
  ).run(column_id || null, position ?? null, new Date().toISOString(), note_id);

  res.json({ ok: true });
});

export default router;
