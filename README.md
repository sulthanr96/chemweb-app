# ChemWebApp — Suite Kimia Komputasi & Basis Data

Platform web kimia komputasi modular yang dibangun bertahap, menggabungkan kemampuan kalkulasi kimia berbasis WebAssembly di browser (*in-browser WASM*) dengan penyimpanan basis data awan MongoDB Atlas.

## Fitur & Modul

1. **Tahap 1: Visualizer 2D & 3D Interaktif (`/tahap1`)**
   - Render molekul 2D (RDKit.js) & model 3D interaktif yang dapat dirotasi/zoom (3Dmol.js) dengan fitur *Auto-Rotate*.
   - **Penyorot Atom/Ikatan Interaktif:** H-Bond Donors (HBD), H-Bond Acceptors (HBA), Rotatable Bonds, Cincin Aromatik, dan Nomor Atom.
   - **Analisis Lanjutan:** Deteksi Gugus Fungsi (SMARTS), Komposisi Elemental (% Massa Atom), Radar Bioavailabilitas (ADMET Hexagonal SwissADME-style), dan Estimasi Spektroskopi (Puncak Serapan IR & Pergeseran Kimia ¹H-NMR).
   - **Alat Bantu:** Editor gambar JSME, konverter format instan (SMILES/InChI/MolBlock), dan ekspor gambar 2D resolusi tinggi (SVG, PNG Putih 300 DPI, PNG Transparan).

2. **Tahap 2: Pencarian Nama & Sifat Senyawa (`/tahap2`)**
   - Pencarian senyawa berdasarkan nama umum via PubChem PUG REST/VIEW API.
   - Sifat fisikokimia eksperimental (titik leleh, titik didih, densitas, kelarutan, dll.).
   - Identifikasi keselamatan & piktogram bahaya GHS visual.
   - Riwayat pencarian cepat (*Recent Search History Chips*) & tombol cetak lembar fakta (*Print Factsheet*).

3. **Tahap 3: Koleksi Database Pribadi (`/tahap3`)**
   - Manajemen basis data senyawa cloud via MongoDB Atlas & REST API Express.
   - **Pencarian Kemiripan Koleksi:** Cari molekul di database yang memiliki kemiripan struktur tertinggi (skor Tanimoto).
   - Ekspor Koleksi Batch: **CSV (Excel)**, **JSON**, dan **SDF (Format Molekuler Standar Kimia)**.
   - Impor Koleksi Batch: unggah file JSON/CSV/SDF atau tempel teks daftar SMILES.

4. **Tahap 4: Komparasi Senyawa & Tanimoto Similarity (`/tahap4`)**
   - Perbandingan dua senyawa secara berdampingan (*side-by-side*).
   - Kalkulasi skor kemiripan topologi sidik jari molekuler (*Tanimoto Similarity Score* via Morgan Fingerprints RDKit WASM).
   - Tabel selisih properti fisikokimia (&Delta; Delta) secara dinamis & ekspor laporan perbandingan CSV.

5. **Tahap 5: Laboratorium Reaksi Kimia & Desain Sintesis (`/tahap5`)**
   - **Simulator Reaksi Kimia Organik:** Reaktan A + Reaktan B ➔ Produk Utama (Sintesis Aspirin, Parasetamol, Benzokain, Eter Williamson, Peptida, dll.).
   - **Analisis Diskoneksi Retrosintesis Obat:** Target obat ➔ Dekomposisi ke 2 senyawa pemula (*precursor starting materials*).
   - **Kalkulator Stoikiometri & Rendemen:** Menghitung mol, pereaksi pembatas, massa teoritis, dan % yield eksperimen laboratorium.

6. **Sistem Desain & Tema Terpadu (`/public`)**
   - Navbar terpadu konsisten di seluruh 5 modul.
   - Toggle Tema: **Mode Gelap** & **Mode Terang** tersimpan di preferensi pengguna.

---

## Menjalankan secara Lokal

1. **Install dependency**
   ```bash
   npm install
   ```

2. **Siapkan environment**
   ```bash
   cp .env.example .env
   ```
   Isi `.env` dengan `MONGODB_URI` MongoDB Atlas Anda.

3. **Jalankan server**
   ```bash
   npm start
   ```
   Buka `http://localhost:3000`.

---

## Struktur Direktori

```
chemwebapp/
├── server.js                     # Express app: rute statis tiap tahap + REST API
├── models/Compound.js            # Skema Mongoose untuk koleksi senyawa
├── routes/compounds.js           # REST API /api/compounds (CRUD, Batch, Export)
├── public/                       # Aset bersama (nav-theme.css, nav-theme.js)
├── tahap-1-struktur-2d-3d/       # Visualizer 2D/3D + Highlighter + Radar + Spektroskopi
├── tahap-2-pencarian-sifat/      # Pencarian PubChem + GHS Safety + Factsheet
├── tahap-3-database-koleksi/     # Database koleksi pribadi + Similarity Search + Batch Export/Import
├── tahap-4-analisis-komparasi/   # Komparasi 2 senyawa & skor Tanimoto
├── tahap-5-lab-reaksi-sintesis/  # Lab Reaksi Organik + Retrosintesis + Stoikiometri
└── .env.example
```
