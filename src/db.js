const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://root:password123@localhost:27017/concesionario_db?authSource=admin';
const client = new MongoClient(uri);

let dbConnection;

async function connectToDatabase() {
  try {
    if (!dbConnection) {
      await client.connect();
      dbConnection = client.db('concesionario_db');
      console.log('MongoDB conectado exitosamente a concesionario_db');
    }
    return dbConnection;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

function getDb() {
  return dbConnection;
}

module.exports = { connectToDatabase, getDb, client };