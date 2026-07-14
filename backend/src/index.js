import express from 'express';
import cors from 'cors';
import { UPLOADS_DIR } from './db.js';

import usersRouter from './routes/users.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';
import notesRouter from './routes/notes.js';
import imagesRouter from './routes/images.js';
import backupRouter from './routes/backup.js';
import settingsRouter from './routes/settings.js';
import boardsRouter from './routes/boards.js';
import apikeysRouter from './routes/apikeys.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/images', imagesRouter);
app.use('/api/backup', backupRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/keys', apikeysRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Notes API listening on port ${PORT}`);
});
