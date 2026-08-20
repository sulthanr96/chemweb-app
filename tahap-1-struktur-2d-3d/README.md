# Tahap 1 — SMILES → Struktur 2D & 3D

Input notasi SMILES (atau gambar strukturnya langsung), lihat molekulnya sebagai struktur 2D dan model 3D yang bisa diputar/zoom di browser.

## Cara pakai
Buka `index.html` langsung di browser (butuh koneksi internet — semua library dimuat dari CDN). Ketik SMILES di tab "Ketik SMILES", atau gambar struktur di tab "Gambar Struktur" lalu klik "Pakai struktur ini".

Bisa juga dibuka dengan parameter URL untuk langsung memuat SMILES tertentu:
```
index.html?smiles=CC(=O)Oc1ccccc1C(=O)O
```
Dipakai Tahap 2 untuk deep-link dari hasil pencarian PubChem.

## Stack
- **RDKit.js** (WASM) — parsing SMILES, render 2D, descriptor kimia (formula, MW, LogP, TPSA, HBD/HBA).
- **3Dmol.js** — render & interaksi model 3D (drag putar, scroll zoom).
- **JSME** — editor gambar struktur molekul (GWT, dimuat async dari CDN).
- **OpenBabel (WASM, via cheminfo-to-web)** — generate koordinat 3D (operasi `Gen3D`) untuk SMILES apa pun secara lokal di browser.
- **PubChem PUG REST** — fallback generate 3D kalau OpenBabel gagal/belum siap (hanya untuk senyawa yang terdaftar di PubChem).

## Kenapa dua lapis untuk 3D?
RDKit.js versi WASM tidak punya generator konformer 3D (ETKDG) — lihat [rdkit-js#338](https://github.com/rdkit/rdkit-js/issues/338). Jadi RDKit dipakai untuk parsing/validasi/2D, sementara OpenBabel WASM menghasilkan koordinat 3D. Build OpenBabel WASM ini berasal dari proyek komunitas (non-resmi), jadi ada fallback ke PubChem PUG REST kalau lapis pertama gagal.

## Fitur
- Input SMILES real-time (debounced) + editor gambar struktur (JSME), dipisah sebagai tab.
- Preset senyawa umum (aspirin, kafein, etanol, benzena, glukosa, ibuprofen).
- Formula molekul, berat molekul, SMILES kanonik (+ tombol salin).
- Descriptor tambahan: LogP, jumlah H-bond donor/akseptor, TPSA.
- Unduh struktur 2D (SVG) dan 3D (MOL).
- Toggle gaya viewer 3D: Stick+Sphere / Space-filling / Wireframe, plus reset kamera.
- Hint validasi SMILES yang lebih spesifik (kurung tak seimbang, angka cincin ganjil).
- Aksesibilitas dasar: label tersembunyi untuk input, focus outline yang terlihat, `prefers-reduced-motion` dihormati.
- Responsif ke mobile, termasuk lebar editor JSME yang menyesuaikan lebar layar.

## Status
Selesai dibangun dan dipoles UI/UX-nya. Jadi fondasi untuk Tahap 2 (pencarian nama & sifat) via deep-link `?smiles=`.
