import crypto from 'crypto';
import db from './db.js';

export function requireUser(req, res, next) {
  // 1. API key via Authorization: Bearer <key> or X-API-Key: <key>
  const authHeader = req.header('authorization') || '';
  const apiKey =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    req.header('x-api-key');

  if (apiKey) {
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const record = db
      .prepare('SELECT user_id FROM api_keys WHERE key_hash = ?')
      .get(hash);
    if (!record) return res.status(401).json({ error: 'Invalid API key' });
    db.prepare('UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?').run(
      new Date().toISOString(),
      hash
    );
    req.userId = record.user_id;
    return next();
  }

  // 2. Session via X-User-Id header (browser app)
  const userId = req.header('x-user-id') || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Missing user' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Unknown user' });
  req.userId = userId;
  next();
}
