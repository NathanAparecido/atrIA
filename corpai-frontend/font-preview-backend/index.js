const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 80;
const DATA_DIR = process.env.DATA_DIR || '/data';
const FONTS_DIR = process.env.FONTS_DIR || path.join(DATA_DIR, 'fonts');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.jsonl');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = /\.(ttf|otf|woff2?)$/i;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

if (ADMIN_PASSWORD === 'changeme') {
  console.warn(
    '[font-preview] ATENCAO: ADMIN_PASSWORD nao configurada — usando padrao inseguro "changeme". ' +
    'Defina FONT_PREVIEW_ADMIN_PASSWORD no ambiente do compose.'
  );
}

fs.mkdirSync(FONTS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Basic Auth ──────────────────────────────────────────────
function basicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Respostas Font Preview"');
    return res.status(401).send('Autenticacao requerida.');
  }
  let user = '', pass = '';
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    user = decoded.slice(0, i);
    pass = decoded.slice(i + 1);
  } catch {
    /* fallthrough */
  }
  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="Respostas Font Preview"');
  return res.status(401).send('Credenciais invalidas.');
}

// ─── Helpers ─────────────────────────────────────────────────
function readSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  const content = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// ─── App ─────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '256kb' }));

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.use('/fonts', express.static(FONTS_DIR, {
  immutable: true,
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
}));

// ─── Fontes (públicas) ───────────────────────────────────────
app.get('/api/fonts', (_req, res) => {
  fs.readdir(FONTS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(files.filter((f) => ALLOWED_EXT.test(f)).sort());
  });
});

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
app.post('/api/fonts/upload', upload.array('fonts', 20), (req, res) => {
  res.json({ uploaded: (req.files || []).map((f) => f.filename) });
});

// ─── Submissões ──────────────────────────────────────────────
app.post('/api/submissions', (req, res) => {
  const { name, choices } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome obrigatorio' });
  }
  if (!choices || typeof choices !== 'object') {
    return res.status(400).json({ error: 'Escolhas invalidas' });
  }
  const record = {
    timestamp: new Date().toISOString(),
    ip: req.ip || '',
    userAgent: (req.headers['user-agent'] || '').slice(0, 250),
    name: name.trim().slice(0, 100),
    choices,
  };
  fs.appendFile(SUBMISSIONS_FILE, JSON.stringify(record) + '\n', (err) => {
    if (err) {
      console.error('[font-preview] Falha ao salvar submissao:', err);
      return res.status(500).json({ error: 'Falha ao salvar' });
    }
    res.json({ ok: true });
  });
});

app.get('/api/submissions', basicAuth, (_req, res) => {
  try {
    res.json(readSubmissions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/respostas', basicAuth, (_req, res) => {
  const records = readSubmissions().reverse();
  const rows = records.map((r) => {
    const ts = new Date(r.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const choices = Object.entries(r.choices || {}).map(([area, v]) => `
      <div class="ch">
        <span class="lbl">${escapeHtml(area)}</span>
        <span class="val">${escapeHtml(v.font || '-')} · ${escapeHtml(String(v.weight || '-'))} · ${escapeHtml(String(v.size || '-'))}px</span>
      </div>
    `).join('');
    return `
      <article class="card">
        <header>
          <h2>${escapeHtml(r.name)}</h2>
          <time>${escapeHtml(ts)}</time>
        </header>
        <div class="choices">${choices}</div>
      </article>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Respostas — Font Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Orbitron:wght@900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#020617;color:#f1f5f9;padding:32px 20px;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto}
h1{font-family:Orbitron;font-weight:900;font-size:24px;letter-spacing:-.03em;background:radial-gradient(ellipse 190% 65% at 8% 92%,#c020a8 0%,transparent 48%),radial-gradient(ellipse 110% 190% at 92% 8%,#00b8a8 0%,transparent 48%),radial-gradient(ellipse 130% 110% at 38% 42%,#5828c8 0%,transparent 52%),#180848;-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:#94a3b8;font-size:13px;margin-bottom:20px}
.actions{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.btn{display:inline-block;padding:8px 14px;border-radius:8px;border:1px solid rgba(0,184,168,.4);background:rgba(0,184,168,.08);color:rgba(0,184,168,.9);text-decoration:none;font-size:12px;font-weight:600;cursor:pointer}
.btn:hover{background:rgba(0,184,168,.15)}
.empty{padding:48px 24px;text-align:center;color:#64748b;background:#0f172a;border-radius:14px;border:1px dashed #1e293b}
.card{background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:18px 22px;margin-bottom:14px;transition:border-color .2s}
.card:hover{border-color:rgba(0,184,168,.25)}
.card header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #1e293b;flex-wrap:wrap}
.card h2{font-size:16px;font-weight:700;color:#f1f5f9}
.card time{font-size:11px;color:#64748b;font-variant-numeric:tabular-nums}
.choices{display:grid;gap:6px;grid-template-columns:1fr}
@media(min-width:600px){.choices{grid-template-columns:1fr 1fr}}
.ch{display:flex;gap:10px;font-size:12px;padding:4px 0;align-items:baseline}
.lbl{color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px;width:115px;flex-shrink:0}
.val{color:#f1f5f9;font-variant-numeric:tabular-nums}
</style>
</head>
<body>
<div class="wrap">
  <h1>Respostas — Font Preview</h1>
  <p class="sub">${records.length} submiss${records.length === 1 ? 'ão' : 'ões'} no total</p>
  <div class="actions">
    ${records.length > 0 ? '<a class="btn" href="/api/submissions" target="_blank">Exportar JSON</a>' : ''}
    <a class="btn" href="/">Voltar ao site</a>
  </div>
  ${records.length === 0 ? '<div class="empty">Nenhuma submissao ainda.</div>' : rows}
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[font-preview] listening on :${PORT}`);
  console.log(`[font-preview] fonts=${FONTS_DIR}`);
  console.log(`[font-preview] submissions=${SUBMISSIONS_FILE}`);
  console.log(`[font-preview] admin user=${ADMIN_USER}`);
});
