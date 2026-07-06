import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { UPLOADS_DIR } from '../db.js';
import { requireUser } from '../middleware.js';

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error('Unsupported image type'));
    cb(null, true);
  },
});

const router = express.Router();
router.use(requireUser);

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

export default router;
