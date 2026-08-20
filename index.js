require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
// Render akan otomatis memberikan nilai PORT, jika di lokal gunakan 3000
const port = process.env.PORT || 5000; 

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function startServer() {
  try {
    // 1. Hubungkan ke database
    await client.connect();
    console.log("Berhasil terhubung ke MongoDB!");

    // 2. Buat rute web dasar
    app.get('/', (req, res) => {
      res.send('Aplikasi ChemWebApp berjalan dan terhubung ke database!');
    });

    // 3. Jalankan server web
    app.listen(port, () => {
      console.log(`Server berjalan di port ${port}`);
    });

  } catch (error) {
    console.error("Gagal memulai server:", error.message);
  }
}

startServer();