# Tahap 3 — Database Pribadi / Koleksi Senyawa

Menyimpan senyawa hasil Tahap 1 (viewer SMILES) dan Tahap 2 (pencarian PubChem) ke koleksi pribadi, lalu mengelolanya (cari, filter tag, edit catatan, hapus).

## Perubahan arsitektur

Sampai Tahap 2, aplikasi ini murni file HTML statis (dibuka langsung tanpa server). Mulai Tahap 3, aplikasi butuh **backend + database**, karena data koleksi harus tersimpan permanen dan bisa diakses dari halaman manapun.

- **Backend**: Node.js + Express (`server.js`), serve Tahap 1/2/3 sebagai static files sekaligus REST API `/api/compounds`.
- **Database**: MongoDB Atlas (cloud), diakses via Mongoose. Connection string di `.env` (`MONGODB_URI`).
- **Auth**: tidak ada — MVP ini single-user tanpa login, sesuai keputusan awal proyek.

## Menjalankan

```bash
npm install
npm start
```

Server jalan di `http://localhost:3000` (atau `$PORT` kalau di-set). Pastikan `.env` berisi `MONGODB_URI` yang valid (whitelist IP di Atlas kalau perlu, atau pakai `0.0.0.0/0` untuk dev).

- `/` — halaman selamat datang
- `/tahap1` — Tahap 1 (Struktur 2D & 3D)
- `/tahap2` — Tahap 2 (Pencarian Sifat)
- `/tahap3` — Tahap 3 (Koleksi Senyawa) ← halaman ini
- `/api/compounds` — REST API koleksi (lihat di bawah)

## Model data (`Compound`)

| Field | Tipe | Keterangan |
|---|---|---|
| `cid` | Number | CID PubChem, kalau berasal dari Tahap 2 |
| `name`, `iupacName` | String | Nama tampilan & nama IUPAC |
| `canonicalSmiles` | String | **Wajib** |
| `molecularFormula`, `molecularWeight` | String / Number | |
| `logp`, `tpsa`, `hbd`, `hba`, `rotatableBonds`, `monoisotopicMass` | Number | Descriptor sifat |
| `imageType` | `'svg' \| 'png-data' \| 'none'` | `svg` = SVG mentah dari RDKit (Tahap 1), `png-data` = base64 data URL hasil fetch PNG PubChem (Tahap 2) |
| `imageData` | String | Isi gambar sesuai `imageType` |
| `tags` | [String] | |
| `notes` | String | |
| `source` | `'manual' \| 'tahap1' \| 'tahap2'` | |

Gambar disimpan langsung (bukan hanya URL PubChem) supaya tidak rusak kalau URL berubah/expired.

## API

- `POST /api/compounds` — simpan senyawa baru
- `GET /api/compounds?q=&tag=&page=&limit=` — list + cari (nama/formula/IUPAC/SMILES) + filter tag + pagination
- `GET /api/compounds/tags` — daftar tag unik
- `GET /api/compounds/:id` — detail
- `PUT /api/compounds/:id` — update `name`, `iupacName`, `tags`, `notes`
- `DELETE /api/compounds/:id` — hapus

## Integrasi dengan Tahap 1 & 2

Tombol **"☆ Simpan ke koleksi"** ditambahkan di kedua halaman:

- **Tahap 1**: muncul begitu SMILES valid ter-parse. Mengirim SMILES kanonik, descriptor RDKit (LogP/HBD/HBA/TPSA), dan SVG struktur 2D langsung.
- **Tahap 2**: muncul di action bar hasil pencarian. Mengirim semua properti PubChem, lalu meng-fetch gambar PNG PubChem dan mengubahnya jadi base64 data URL sebelum dikirim ke API (bukan menyimpan URL mentahnya).

## Belum dikerjakan / rencana lanjutan

- Edit `name`/`iupacName` langsung dari kartu koleksi (saat ini hanya tag & catatan yang bisa diedit dari UI Tahap 3)
- Import/export Excel koleksi (pola sudah dikuasai dari proyek pendataan mentoring sebelumnya, reuse kalau dibutuhkan)
- Link "buka di Tahap 1" dari kartu koleksi (pakai deep-link `?smiles=`)
