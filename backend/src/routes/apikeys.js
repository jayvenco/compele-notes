import express from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireUser } from '../middleware.js';

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const keys = db
    .prepare(
      'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(req.userId);
  res.json(keys);
});

router.post('/', (req, res) => {
  const name = (req.body?.name || 'My key').trim();
  const rawKey = 'notes_' + crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.slice(0, 14); // "notes_" + 8 hex chars
  const id = uuid();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, name, prefix, hash, now);

  // Return the raw key only once
  res.status(201).json({ id, name, key_prefix: prefix, key: rawKey, created_at: now });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(
    req.params.id, req.userId
  );
  res.status(204).end();
});

export default router;
