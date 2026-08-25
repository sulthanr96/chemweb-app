# Tahap 5 — Laboratorium Reaksi Kimia & Desain Sintesis

Modul simulasi reaksi kimia organik, analisis diskoneksi retrosintesis molekul obat, dan kalkulator stoikiometri rendemen sintesis berbasis RDKit WebAssembly.

## Fitur Utama

1. **Simulator Reaksi Kimia Interaktif (Reaktan A + Reaktan B ➔ Produk):**
   - Katalog reaksi organik klasik & sintesis obat:
     - Sintesis Aspirin (Esterifikasi Fenol)
     - Sintesis Parasetamol (Asilasi Amina)
     - Sintesis Benzokain (Esterifikasi Fischer PABA + Etanol)
     - Sintesis Eter Williamson (Fenol + Etil Halida)
     - Pembentukan Ikatan Peptida (Dipeptida Gly-Ala)
   - Masukkan pasangan SMILES kustom, hitung berat molekul, dan bentuk produk reaksi secara instan.
   - Tombol pengiriman produk: buka di **Tahap 1 (2D/3D Viewer)**, **Tahap 4 (Komparasi Bahan Awal vs Produk)**, atau simpan ke **Tahap 3 (Database Koleksi)**.

2. **Analisis Retrosintesis Obat (Target ➔ Prekursor):**
   - Menganalisis molekul obat target (Aspirin, Parasetamol, Benzokain, Ibuprofen, dll.).
   - Menampilkan diskoneksi ikatan kunci (ikatan ester, ikatan amida, eter) beserta visualisasi 2D kedua senyawa pemula (*precursor starting materials*).

3. **Kalkulator Stoikiometri & Rendemen (% Yield):**
   - Menghitung mol reaktan berdasarkan massa (gram).
   - Menentukan pereaksi pembatas (*limiting reagent*) secara otomatis.
   - Menghitung massa teoritis produk (gram) dan persentase rendemen riil dari hasil eksperimen laboratorium.

## Stack
- **RDKit.js** (WASM) — parsing SMILES, pembangkitan struktur 2D SVG, dan deskriptor molekul.
- **ChemApp Shared Engine** (`/public/nav-theme.js` & `/public/nav-theme.css`) — navbar terpadu, tema Dark/Light, dan komunikasi antar-tahap.
