const { ObjectId } = require('mongodb');

class HttpError extends Error {
  constructor(status, message, detalles) {
    super(message);
    this.status = status;
    this.detalles = detalles;
  }
}

function toObjectId(id) {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) {
    throw new HttpError(400, `El id "${id}" no es un ObjectId válido`);
  }
  return new ObjectId(id);
}

function getPaginacion(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function getOrden(query, permitidos, porDefecto) {
  const campo = permitidos[query.sort] ? query.sort : porDefecto;
  const direccion = String(query.order).toLowerCase() === 'desc' ? -1 : 1;
  return { [permitidos[campo]]: direccion };
}

function escapeRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toDate(valor, campo) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new HttpError(400, `El campo "${campo}" debe ser una fecha válida (ej. 2025-03-10)`);
  }
  return fecha;
}

function pick(obj, campos) {
  const out = {};
  for (const c of campos) if (obj[c] !== undefined) out[c] = obj[c];
  return out;
}

function traducirErrorMongo(err) {
  if (err.code === 121) {
    return new HttpError(400, 'Los datos no cumplen las reglas de validación de la base de datos', err.errInfo?.details);
  }
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue || {})[0] || 'campo único';
    return new HttpError(409, `Ya existe un registro con ese ${campo}: ${err.keyValue?.[campo]}`);
  }
  return err;
}

module.exports = { HttpError, toObjectId, getPaginacion, getOrden, escapeRegex, toDate, pick, traducirErrorMongo };
