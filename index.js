require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path'); // Tambahan modul path

const app = express();
const port = process.env.PORT || 5000; 

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function startServer() {
  try {
    await client.connect();
    console.log("Berhasil terhubung ke MongoDB!");

    // Menjadikan folder 'tahap-1-struktur-2d-3d' sebagai tampilan utama halaman web
    app.use(express.static(path.join(__dirname, 'tahap-1-struktur-2d-3d')));

    app.listen(port, () => {
      console.log(`Server berjalan di port ${port}`);
    });

  } catch (error) {
    console.error("Gagal memulai server:", error.message);
  }
}

startServer();