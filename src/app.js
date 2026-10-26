const express = require('express');
const { connectToDatabase } = require('./db');
const { HttpError } = require('./utils/http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Express y MongoDB en línea' });
});

app.use('/vehiculos', require('./routes/vehiculos'));
app.use('/clientes', require('./routes/clientes'));

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.detalles) body.detalles = err.detalles;
    return res.status(err.status).json(body);
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
  });
}

if (require.main === module) startServer();

module.exports = app;
