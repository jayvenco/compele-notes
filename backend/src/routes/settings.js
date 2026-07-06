import express from 'express';
import db from '../db.js';
import { requireUser } from '../middleware.js';

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.userId);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.put('/', (req, res) => {
  const body = req.body || {};
  const upsert = db.prepare(
    `INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
  );
  for (const [key, value] of Object.entries(body)) {
    upsert.run(req.userId, key, String(value));
  }
  const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.userId);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

export default router;
