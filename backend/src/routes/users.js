import express from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, created_at FROM users ORDER BY name').all();
  res.json(users);
});

router.post('/', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const existing = db.prepare('SELECT id, name, created_at FROM users WHERE name = ?').get(name);
  if (existing) return res.json(existing);

  const user = { id: uuid(), name, created_at: new Date().toISOString() };
  db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(
    user.id,
    user.name,
    user.created_at
  );

  const defaultCategories = ['Personal', 'Work', 'Ideas'];
  const insertCat = db.prepare(
    'INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  );
  for (const name of defaultCategories) {
    insertCat.run(uuid(), user.id, name, new Date().toISOString());
  }

  res.status(201).json(user);
});

export default router;
