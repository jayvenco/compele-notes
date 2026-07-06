import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';
import db, { DB_PATH, UPLOADS_DIR } from '../db.js';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.get('/export', (req, res) => {
  db.pragma('wal_checkpoint(TRUNCATE)');

  const zip = new AdmZip();
  zip.addLocalFile(DB_PATH, '', 'notes.db');

  if (fs.existsSync(UPLOADS_DIR)) {
    zip.addLocalFolder(UPLOADS_DIR, 'uploads');
  }

  const buffer = zip.toBuffer();
  const filename = `notes-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

router.post('/import', upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No backup file uploaded' });

  try {
    const zip = new AdmZip(req.file.path);
    const dbEntry = zip.getEntry('notes.db');
    if (!dbEntry) throw new Error('Invalid backup: missing notes.db');

    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    fs.writeFileSync(DB_PATH, dbEntry.getData());
    for (const wal of [`${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
    }

    fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    for (const entry of zip.getEntries()) {
      if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
        const dest = path.join(UPLOADS_DIR, entry.entryName.replace('uploads/', ''));
        fs.writeFileSync(dest, entry.getData());
      }
    }

    res.json({ ok: true, restartRequired: true });
    process.nextTick(() => process.exit(0));
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

export default router;
