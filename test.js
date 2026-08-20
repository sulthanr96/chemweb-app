require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Berhasil terhubung ke MongoDB Atlas!");
  } catch (error) {
    console.error("Gagal terhubung:", error.message);
  } finally {
    await client.close();
  }
}

run();