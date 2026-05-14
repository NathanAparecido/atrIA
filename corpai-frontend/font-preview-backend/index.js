const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 80;
const FONTS_DIR = process.env.FONTS_DIR || '/data/fonts';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT = /\.(ttf|otf|woff2?)$/i;

fs.mkdirSync(FONTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: FONTS_DIR,
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const full = path.join(FONTS_DIR, safe);
    if (!fs.existsSync(full)) return cb(null, safe);
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_EXT.test(file.originalname)) {
      return cb(new Error('Apenas .ttf, .otf, .woff, .woff2'));
    }
    cb(null, true);
  },
});

const app = express();

// Frontend estático (HTML do font-preview montado via bind)
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// Serve as fontes salvas
app.use(
  '/fonts',
  express.static(FONTS_DIR, {
    immutable: true,
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
  })
);

// API
app.get('/api/fonts', (_req, res) => {
  fs.readdir(FONTS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(files.filter((f) => ALLOWED_EXT.test(f)).sort());
  });
});

app.post('/api/fonts/upload', upload.array('fonts', 20), (req, res) => {
  res.json({ uploaded: (req.files || []).map((f) => f.filename) });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[font-preview] listening on :${PORT}  fonts=${FONTS_DIR}`);
});
