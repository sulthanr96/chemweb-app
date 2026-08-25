# Tahap 4 — Komparasi Senyawa & Tanimoto Similarity

Membandingkan dua molekul secara berdampingan (*side-by-side*) untuk menganalisis kemiripan struktur molekuler (skor *Tanimoto Similarity*) dan perbedaan sifat fisikokimia (&Delta; Delta) secara instan di browser.

## Fitur Utama

1. **Input Fleksibel untuk 2 Senyawa:**
   - Memasukkan notasi SMILES langsung atau mengetik nama senyawa (otomatis dicocokkan ke PubChem API).
   - Tombol preset perbandingan molekul populer (Aspirin vs Asam Salisilat, Kafein vs Teobromin, Ibuprofen vs Naproxen, Etanol vs Metanol).
   - Dukungan deep-link URL: `?smilesA=...&smilesB=...` untuk memuat langsung dari Tahap 1, Tahap 2, atau kartu koleksi di Tahap 3.

2. **Kalkulasi Tanimoto Similarity (0.00 – 1.00 / 0% – 100%):**
   - Menggunakan sidik jari molekuler topologi RDKit.js WASM (*Morgan / Pattern Fingerprints*).
   - Visualisasi meter progresif dan interpretasi farmakologis (identik, analog kuat, moderat, hingga berbeda).

3. **Tabel Selisih Sifat Fisikokimia (&Delta; Delta):**
   - Membandingkan Berat Molekul (MW), LogP, TPSA, H-Bond Donors (HBD), H-Bond Acceptors (HBA), Ikatan Dapat Diputar (RotB), Heavy Atoms, Rings, dan Massa Monoisotopik.
   - Penyorotan selisih nilai positif/negatif secara dinamis.

4. **Analisis Drug-Likeness Lipinski Berdampingan:**
   - Evaluasi kelayakan kedua obat sekaligus menurut Aturan Lipinski dan Veber.

5. **Ekspor Laporan Komparasi:**
   - Unduh ringkasan perbandingan dan skor kemiripan dalam format spreadsheet CSV.

## Stack
- **RDKit.js** (WASM) — parsing SMILES, pembangkitan struktur 2D SVG, kalkulasi deskriptor fisiko-kimia, dan ekstraksi fingerprint molekuler.
- **PubChem PUG REST** — pencarian nama ke canonical SMILES untuk input Senyawa A & B.
- **ChemApp Shared Core** (`/public/nav-theme.js` & `/public/nav-theme.css`) — navbar terpadu, tema Dark/Light, dan kalkulasi Lipinski.
