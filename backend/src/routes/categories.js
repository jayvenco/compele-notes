import express from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireUser } from '../middleware.js';

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name')
    .all(req.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = uuid();
  try {
    db.prepare(
      'INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, req.userId, name, new Date().toISOString());
  } catch (e) {
    return res.status(409).json({ error: 'Category already exists' });
  }
  res.status(201).json({ id, user_id: req.userId, name });
});

router.put('/:id', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db
    .prepare('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?')
    .run(name, req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ id: req.params.id, user_id: req.userId, name });
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE notes SET category_id = NULL WHERE category_id = ? AND user_id = ?').run(
    req.params.id,
    req.userId
  );
  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

export default router;
