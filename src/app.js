const express = require('express');
const { connectToDatabase } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta base de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Express y MongoDB en línea' });
});

async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
  });
}

startServer();