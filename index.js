require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000; 

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function startServer() {
  try {
    await client.connect();
    console.log("Berhasil terhubung ke MongoDB!");

    // Menjadikan folder Tahap 1 bisa diakses di URL /tahap1
    app.use('/tahap1', express.static(path.join(__dirname, 'tahap-1-struktur-2d-3d')));

    // Menjadikan folder Tahap 2 bisa diakses di URL /tahap2
    app.use('/tahap2', express.static(path.join(__dirname, 'tahap-2-pencarian-sifat')));

    // Halaman utama (opsional, sebagai navigasi)
    app.get('/', (req, res) => {
      res.send(`
        <h1>Selamat Datang di ChemWebApp</h1>
        <ul>
          <li><a href="/tahap1">Buka Tahap 1: Struktur 2D & 3D</a></li>
          <li><a href="/tahap2">Buka Tahap 2: Pencarian Sifat</a></li>
        </ul>
      `);
    });

    app.listen(port, () => {
      console.log(`Server berjalan di port ${port}`);
    });

  } catch (error) {
    console.error("Gagal memulai server:", error.message);
  }
}

startServer();