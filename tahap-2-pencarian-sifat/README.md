# Tahap 2 — Pencarian Nama & Sifat Senyawa

Cari senyawa berdasarkan nama umum (bukan SMILES) — mis. "aspirin", "kafein", "glukosa" — dan ambil datanya langsung dari PubChem: formula, berat molekul, SMILES kanonik, nama IUPAC, sinonim, dan beberapa deskriptor kimia.

## Cara pakai
Buka `index.html` di browser (butuh koneksi internet). Ketik nama senyawa lalu tekan Enter / klik Cari, atau pilih salah satu preset. Bisa juga deep-link:
```
index.html?q=aspirin
```

Dari hasil pencarian, tombol **"Lihat 2D/3D di Tahap 1"** membuka viewer Tahap 1 dengan SMILES senyawa tersebut sudah otomatis termuat.

## Stack
- **PubChem PUG REST** — tiga panggilan per pencarian:
  1. `compound/name/{nama}/cids/JSON` → resolve nama ke CID.
  2. `compound/cid/{cid}/property/.../JSON` → ambil formula, MW, IUPAC name, canonical SMILES, XLogP, TPSA, HBD/HBA count, rotatable bonds, massa monoisotopik.
  3. `compound/cid/{cid}/synonyms/JSON` → daftar nama lain (ditampilkan maks. 12).
- Gambar struktur diambil langsung dari endpoint PNG PubChem (`compound/cid/{cid}/PNG`), tidak digenerate ulang di client.

## Caching
Hasil pencarian disimpan di `localStorage` browser per nama senyawa (key dinormalisasi lowercase), dengan TTL 7 hari. Tujuannya mengurangi request berulang ke PubChem untuk pencarian yang sama dan tetap responsif kalau PubChem lambat/rate-limit. Ada tombol "Hapus cache" untuk membersihkan manual. Hasil dari cache ditandai dengan tag "DARI CACHE".

## Error handling
- **404 (nama tidak ditemukan)** → pesan spesifik + saran cek ejaan/coba nama lain.
- **429/503 (rate-limited)** → pesan spesifik + saran tunggu beberapa detik.
- **Error jaringan lain** → pesan generik + detail error di hint.

## Status
Selesai dibangun. Terhubung dua arah dengan Tahap 1 (link balik di header, deep-link `?smiles=` ke viewer). Tahap 3 (database pribadi/koleksi senyawa) belum dimulai — nantinya field yang sudah diambil di sini (formula, MW, SMILES, IUPAC name) jadi kandidat kolom yang disimpan per senyawa.
