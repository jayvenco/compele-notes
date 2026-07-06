import db from './db.js';

export function requireUser(req, res, next) {
  const userId = req.header('x-user-id') || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Missing user' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Unknown user' });
  req.userId = userId;
  next();
}
