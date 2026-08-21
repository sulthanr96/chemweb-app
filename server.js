require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const compoundsRouter = require('./routes/compounds');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ALLOWED_ORIGIN opsional di .env (pisah koma), kalau tidak diset dibuka untuk semua
// origin — cocok untuk dev lokal, tapi sebaiknya diisi kalau nanti deploy publik.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use(cors(ALLOWED_ORIGIN ? { origin: ALLOWED_ORIGIN.split(',').map((s) => s.trim()) } : {}));
app.use(express.json({ limit: '5mb' })); // limit dinaikkan karena SVG struktur ikut dikirim

// --- Rate limiter sederhana (in-memory, tanpa dependency tambahan) khusus untuk
// endpoint yang menulis data, supaya /api/compounds tidak gampang disalahgunakan.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30; // maksimal 30 request tulis per menit per IP
const rateLimitHits = new Map();
function writeRateLimiter(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitHits.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(key, { windowStart: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi sebentar lagi.' });
  }
  next();
}

// --- Static tiap tahap, dipetakan ke rute bersih ---
app.use('/tahap1', express.static(path.join(__dirname, 'tahap-1-struktur-2d-3d')));
app.use('/tahap2', express.static(path.join(__dirname, 'tahap-2-pencarian-sifat')));
app.use('/tahap3', express.static(path.join(__dirname, 'tahap-3-database-koleksi')));

// --- API ---
app.use('/api/compounds', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return writeRateLimiter(req, res, next);
  }
  next();
});
app.use('/api/compounds', compoundsRouter);

// --- Halaman utama ---
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ChemWebApp</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1115; color: #eaeaea; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  main { max-width: 480px; padding: 2rem; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  p.sub { color: #999; margin-top: 0; margin-bottom: 1.5rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  a.stage-link { display: block; padding: 0.9rem 1.1rem; background: #1a1d24; border: 1px solid #2a2e38; border-radius: 10px; color: #eaeaea; text-decoration: none; transition: border-color .15s; }
  a.stage-link:hover { border-color: #4a9eff; }
</style>
</head>
<body>
<main>
  <h1>Selamat Datang di ChemWebApp</h1>
  <p class="sub">Aplikasi web kimia, dibangun bertahap.</p>
  <ul>
    <li><a class="stage-link" href="/tahap1">Buka Tahap 1: Struktur 2D & 3D</a></li>
    <li><a class="stage-link" href="/tahap2">Buka Tahap 2: Pencarian Sifat</a></li>
    <li><a class="stage-link" href="/tahap3">Buka Tahap 3: Koleksi Senyawa</a></li>
  </ul>
</main>
</body>
</html>`);
});

async function start() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI belum di-set di .env — server tetap jalan tapi API /api/compounds akan gagal.');
  } else {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Terhubung ke MongoDB Atlas');
    } catch (err) {
      console.error('Gagal konek ke MongoDB Atlas:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`ChemWebApp jalan di http://localhost:${PORT}`);
  });
}

start();
