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

// --- Static tiap tahap & assets bersama, dipetakan ke rute bersih ---
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/tahap1', express.static(path.join(__dirname, 'tahap-1-struktur-2d-3d')));
app.use('/tahap2', express.static(path.join(__dirname, 'tahap-2-pencarian-sifat')));
app.use('/tahap3', express.static(path.join(__dirname, 'tahap-3-database-koleksi')));
app.use('/tahap4', express.static(path.join(__dirname, 'tahap-4-analisis-komparasi')));
app.use('/tahap5', express.static(path.join(__dirname, 'tahap-5-lab-reaksi-sintesis')));
app.use('/tahap6', express.static(path.join(__dirname, 'tahap-6-docking-toksikologi')));

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
<title>ChemWebApp — Portal Kimia Komputasi & Koleksi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/public/nav-theme.css">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }
  .hero-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  .hero-header {
    text-align: center;
    margin-bottom: 40px;
  }
  .hero-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 4px 12px;
    border-radius: 999px;
    display: inline-block;
    margin-bottom: 12px;
  }
  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(28px, 5vw, 44px);
    margin: 0 0 12px;
    letter-spacing: -0.02em;
  }
  p.sub {
    color: var(--muted);
    font-size: 16px;
    max-width: 650px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .stage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 20px;
    margin-top: 36px;
  }
  .stage-card {
    display: flex;
    flex-direction: column;
    padding: 24px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    color: var(--ink);
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }
  .stage-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
  }
  .stage-card-icon {
    font-size: 28px;
    margin-bottom: 14px;
  }
  .stage-card-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .stage-card-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  .stage-card-desc {
    color: var(--muted);
    font-size: 13.5px;
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }
  .stage-card-arrow {
    margin-top: 16px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  footer {
    text-align: center;
    padding: 30px;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    border-top: 1px solid var(--line);
  }
</style>
</head>
<body>
<div class="bg-grid"></div>

<header style="display:none;"></header>

<main class="hero-container">
  <div class="hero-header">
    <span class="hero-badge">Cheminformatics Suite Pro</span>
    <h1>Platform Web Kimia Komprehensif</h1>
    <p class="sub">Suite kimia komputasi interaktif: Visualisasi 2D/3D, pencarian PubChem, basis data koleksi, analisis komparasi Tanimoto, dan laboratorium reaksi kimia.</p>
  </div>

  <div class="stage-grid">
    <a class="stage-card" href="/tahap1">
      <div class="stage-card-icon">🔬</div>
      <div class="stage-card-num">Tahap 1</div>
      <div class="stage-card-title">SMILES → Visualizer 2D &amp; 3D</div>
      <p class="stage-card-desc">Visualisasi 2D/3D interaktif, penyorot atom H-Bond &amp; Rotatable Bonds, deteksi gugus fungsi, radar bioavailabilitas, spektroskopi IR/NMR, dan konverter format.</p>
      <div class="stage-card-arrow">Buka Viewer →</div>
    </a>

    <a class="stage-card" href="/tahap2">
      <div class="stage-card-icon">🔍</div>
      <div class="stage-card-num">Tahap 2</div>
      <div class="stage-card-title">Pencarian Nama &amp; Sifat</div>
      <p class="stage-card-desc">Cari senyawa via PubChem PUG REST/VIEW, sifat fisikokimia eksperimental, identifikasi bahaya GHS, riwayat pencarian, dan cetak lembar fakta.</p>
      <div class="stage-card-arrow">Cari Senyawa →</div>
    </a>

    <a class="stage-card" href="/tahap3">
      <div class="stage-card-icon">📚</div>
      <div class="stage-card-num">Tahap 3</div>
      <div class="stage-card-title">Koleksi Database Pribadi</div>
      <p class="stage-card-desc">Manajemen database MongoDB Atlas, filter tag, pencarian kemiripan struktur koleksi (Tanimoto), serta ekspor &amp; impor batch (CSV, JSON, SDF).</p>
      <div class="stage-card-arrow">Buka Koleksi →</div>
    </a>

    <a class="stage-card" href="/tahap4">
      <div class="stage-card-icon">⚖️</div>
      <div class="stage-card-num">Tahap 4</div>
      <div class="stage-card-title">Komparasi &amp; Tanimoto Similarity</div>
      <p class="stage-card-desc">Bandingkan 2 senyawa berdampingan, hitung delta selisih deskriptor (&Delta;), dan kalkulasi skor kemiripan sidik jari molekuler topologi RDKit WASM.</p>
      <div class="stage-card-arrow">Mulai Komparasi →</div>
    </a>

    <a class="stage-card" href="/tahap5">
      <div class="stage-card-icon">⚗️</div>
      <div class="stage-card-num">Tahap 5</div>
      <div class="stage-card-title">Lab Reaksi &amp; Desain Sintesis</div>
      <p class="stage-card-desc">Simulasikan reaksi kimia organik (Esterifikasi, Amida, Reduksi, dll.), diskoneksi retrosintesis obat, serta kalkulator stoikiometri &amp; rendemen.</p>
      <div class="stage-card-arrow">Buka Lab Reaksi →</div>
    </a>

    <a class="stage-card" href="/tahap6">
      <div class="stage-card-icon">🧬</div>
      <div class="stage-card-num">Tahap 6</div>
      <div class="stage-card-title">Docking 3D, Toksikologi &amp; HPLC</div>
      <p class="stage-card-desc">Visualisasi interaksi obat-protein 3D (COX-2, ACE2, Mpro), uji toksikologi AI &amp; CYP450, simulator kromatogram HPLC &amp; plat TLC, serta resep buffer.</p>
      <div class="stage-card-arrow">Buka Studio Docking →</div>
    </a>
  </div>
</main>

<footer>ChemWebApp · Suite Kimia Komputasi Web Modern</footer>

<script src="/public/nav-theme.js"></script>
<script>
  ChemApp.mountChemNavbar(0);
</script>
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
