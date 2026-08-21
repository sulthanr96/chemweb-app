# ChemWebApp

Aplikasi web kimia yang dibangun bertahap, dari sederhana ke kompleks. Tiap tahap
berdiri sendiri sekaligus jadi fondasi tahap berikutnya. Detail per tahap ada di
README masing-masing folder (`tahap-1-.../README.md`, dst).

## Menjalankan secara lokal

1. **Install dependency**
   ```bash
   npm install
   ```

2. **Siapkan environment**
   ```bash
   cp .env.example .env
   ```
   Lalu isi `.env`:
   - `MONGODB_URI` — connection string MongoDB Atlas (Database → Connect → Drivers).
     Perlu cluster + database user + IP whitelist (boleh `0.0.0.0/0` untuk dev)
     sudah dibuat di Atlas.
   - `PORT` — opsional, default `3000`.
   - `ALLOWED_ORIGIN` — opsional, kosongkan untuk dev lokal.

3. **Jalankan server**
   ```bash
   npm start
   ```
   Buka `http://localhost:3000`.

## Struktur

```
chemwebapp/
├── server.js                     # Express app: serve static tiap tahap + API
├── models/Compound.js            # Skema Mongoose untuk koleksi senyawa (Tahap 3)
├── routes/compounds.js           # REST API /api/compounds
├── tahap-1-struktur-2d-3d/       # SMILES → struktur 2D & 3D (RDKit.js, 3Dmol.js)
├── tahap-2-pencarian-sifat/      # Pencarian nama & sifat senyawa (PubChem API)
├── tahap-3-database-koleksi/     # Koleksi senyawa pribadi (CRUD + MongoDB)
└── .env.example
```

Tahap 1 & 2 murni static HTML (tidak butuh backend untuk jalan sendiri — bisa
dibuka langsung sebagai file, tapi tombol "Simpan ke koleksi" & navigasi rute
bersih (`/tahap1`, `/tahap2`) butuh server ini jalan). Tahap 3 butuh backend +
MongoDB Atlas.

## Alur antar-tahap

- Tahap 1 → Tahap 2: tombol "Sifat lengkap di Tahap 2" membawa SMILES yang
  sedang aktif via `?smiles=...`, langsung dicocokkan ke data PubChem tanpa
  perlu mengetik ulang nama senyawa.
- Tahap 2 → Tahap 1: link "Lihat 2D/3D di Tahap 1" membawa Canonical SMILES
  hasil pencarian.
- Tahap 1/2 → Tahap 3: tombol "Simpan ke koleksi" mengirim data (termasuk
  gambar struktur) ke `/api/compounds`. Senyawa dengan SMILES kanonik yang
  sama tidak diduplikasi — data lama diperkaya/diperbarui.
- Tahap 3 → Tahap 1: tombol "Buka di Tahap 1" pada tiap kartu koleksi.

## Status

Tahap 1, 2, dan 3 sudah diimplementasikan. Tahap 4 (kalkulasi & analisis kimia)
dan Tahap 5 (fitur lanjutan) belum dimulai — lihat README masing-masing folder
tahap untuk detail fitur yang sudah/belum dikerjakan.
