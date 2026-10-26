const { getDb } = require('../db');
const {
  HttpError, toObjectId, getPaginacion, getOrden, escapeRegex, toDate, pick, traducirErrorMongo,
} = require('../utils/http');

const col = () => getDb().collection('vehiculos');

const CAMPOS = ['vin', 'marca', 'modelo', 'anio', 'precio', 'costo_compra', 'kilometraje', 'estado', 'fecha_ingreso', 'caracteristicas', 'reparaciones'];

const ORDEN = {
  precio: 'precio', anio: 'anio', kilometraje: 'kilometraje',
  fecha_ingreso: 'fecha_ingreso', marca: 'marca', modelo: 'modelo',
};

function prepararVehiculo(body, esNuevo) {
  const doc = pick(body || {}, CAMPOS);
  if (doc.vin) doc.vin = String(doc.vin).toUpperCase();
  if (doc.fecha_ingreso !== undefined) doc.fecha_ingreso = toDate(doc.fecha_ingreso, 'fecha_ingreso');
  if (Array.isArray(doc.reparaciones)) {
    doc.reparaciones = doc.reparaciones.map((r) => ({ ...r, fecha: toDate(r.fecha, 'reparaciones.fecha') }));
  }
  if (esNuevo) {
    doc.estado = doc.estado || 'disponible';
    doc.fecha_ingreso = doc.fecha_ingreso || new Date();
    doc.reparaciones = doc.reparaciones || [];
  }
  return doc;
}

async function crear(req, res) {
  const doc = prepararVehiculo(req.body, true);
  if (doc.estado === 'vendido') {
    throw new HttpError(400, 'Un vehículo nuevo no puede registrarse como vendido; use POST /ventas');
  }
  try {
    const r = await col().insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
  } catch (err) {
    throw traducirErrorMongo(err);
  }
}

async function listar(req, res) {
  const q = req.query;
  const filtro = {};

  if (q.marca) filtro.marca = { $regex: `^${escapeRegex(q.marca)}$`, $options: 'i' };
  if (q.modelo) filtro.modelo = { $regex: escapeRegex(q.modelo), $options: 'i' };
  if (q.estado) filtro.estado = { $in: String(q.estado).split(',') };

  const rango = (min, max) => {
    const r = {};
    if (min !== undefined && min !== '') r.$gte = Number(min);
    if (max !== undefined && max !== '') r.$lte = Number(max);
    return Object.keys(r).length ? r : undefined;
  };
  const anio = rango(q.anio_min, q.anio_max);
  const precio = rango(q.precio_min, q.precio_max);
  const km = rango(undefined, q.km_max);
  if (anio) filtro.anio = anio;
  if (precio) filtro.precio = precio;
  if (km) filtro.kilometraje = km;
  for (const [k, v] of Object.entries({ anio, precio, km })) {
    if (v && Object.values(v).some(Number.isNaN)) throw new HttpError(400, `Filtro numérico inválido (${k})`);
  }

  if (q.transmision) filtro['caracteristicas.transmision'] = q.transmision;
  if (q.combustible) filtro['caracteristicas.combustible'] = q.combustible;
  if (q.color) filtro['caracteristicas.color'] = { $regex: `^${escapeRegex(q.color)}$`, $options: 'i' };

  if (q.con_reparaciones === 'true') filtro['reparaciones.0'] = { $exists: true };
  if (q.con_reparaciones === 'false') filtro.$or = [{ reparaciones: { $size: 0 } }, { reparaciones: { $exists: false } }];
  if (q.reparacion_costo_min) filtro.reparaciones = { $elemMatch: { costo: { $gte: Number(q.reparacion_costo_min) } } };

  const { page, limit, skip } = getPaginacion(q);
  const sort = getOrden(q, ORDEN, 'fecha_ingreso');

  const [data, total] = await Promise.all([
    col().find(filtro).sort(sort).skip(skip).limit(limit).toArray(),
    col().countDocuments(filtro),
  ]);
  res.json({ data, page, limit, total });
}

async function obtener(req, res) {
  const v = await col().findOne({ _id: toObjectId(req.params.id) });
  if (!v) throw new HttpError(404, 'Vehículo no encontrado');
  res.json(v);
}

async function actualizar(req, res) {
  const _id = toObjectId(req.params.id);
  const cambios = prepararVehiculo(req.body, false);
  delete cambios.reparaciones;
  if (Object.keys(cambios).length === 0) throw new HttpError(400, 'No se envió ningún campo para actualizar');
  if (cambios.estado === 'vendido') throw new HttpError(400, 'Para marcar un vehículo como vendido use POST /ventas');

  const actual = await col().findOne({ _id });
  if (!actual) throw new HttpError(404, 'Vehículo no encontrado');
  if (actual.estado === 'vendido' && cambios.estado) {
    throw new HttpError(409, 'No se puede cambiar el estado de un vehículo vendido');
  }

  try {
    const v = await col().findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: 'after' });
    res.json(v);
  } catch (err) {
    throw traducirErrorMongo(err);
  }
}

async function agregarReparacion(req, res) {
  const _id = toObjectId(req.params.id);
  const { descripcion, costo, fecha } = req.body || {};
  const reparacion = { descripcion, costo, fecha: fecha ? toDate(fecha, 'fecha') : new Date() };
  try {
    const v = await col().findOneAndUpdate(
      { _id },
      { $push: { reparaciones: reparacion } },
      { returnDocument: 'after' },
    );
    if (!v) throw new HttpError(404, 'Vehículo no encontrado');
    res.status(201).json(v);
  } catch (err) {
    throw traducirErrorMongo(err);
  }
}

async function eliminar(req, res) {
  const _id = toObjectId(req.params.id);
  const v = await col().findOne({ _id });
  if (!v) throw new HttpError(404, 'Vehículo no encontrado');

  const tieneVenta = await getDb().collection('ventas').countDocuments({ vehiculo_id: _id }, { limit: 1 });
  if (v.estado === 'vendido' || tieneVenta) {
    throw new HttpError(409, 'No se puede eliminar un vehículo que tiene una venta registrada');
  }
  await col().deleteOne({ _id });
  res.json({ mensaje: 'Vehículo eliminado', _id });
}

module.exports = { crear, listar, obtener, actualizar, agregarReparacion, eliminar };
