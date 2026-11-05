const { getDb } = require('../db');
const {
  HttpError, toObjectId, getPaginacion, toDate, traducirErrorMongo,
} = require('../utils/http');

const ventas = () => getDb().collection('ventas');
const vehiculos = () => getDb().collection('vehiculos');
const clientes = () => getDb().collection('clientes');

function prepararPago(p, campo = 'pagos') {
  const monto = Number(p?.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new HttpError(400, `El campo "${campo}.monto" debe ser un número mayor que 0`);
  }
  if (!p.metodo) throw new HttpError(400, `El campo "${campo}.metodo" es obligatorio`);
  return { fecha: p.fecha ? toDate(p.fecha, `${campo}.fecha`) : new Date(), monto, metodo: String(p.metodo) };
}

async function crearVenta(req, res) {
  const b = req.body || {};
  for (const c of ['numero_factura', 'vehiculo_id', 'cliente_id', 'monto_total', 'metodo_pago']) {
    if (b[c] === undefined || b[c] === '') throw new HttpError(400, `El campo "${c}" es obligatorio`);
  }
  const vehiculoId = toObjectId(b.vehiculo_id);
  const clienteId = toObjectId(b.cliente_id);
  const montoTotal = Number(b.monto_total);
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    throw new HttpError(400, 'El campo "monto_total" debe ser un número mayor que 0');
  }
  const pagos = Array.isArray(b.pagos) ? b.pagos.map((p) => prepararPago(p)) : [];
  if (pagos.reduce((s, p) => s + p.monto, 0) > montoTotal) {
    throw new HttpError(400, 'La suma de los pagos supera el monto total de la venta');
  }

  if (!(await clientes().findOne({ _id: clienteId }, { projection: { _id: 1 } }))) {
    throw new HttpError(404, 'Cliente no encontrado');
  }

  const vehiculo = await vehiculos().findOneAndUpdate(
    { _id: vehiculoId, estado: 'disponible' },
    { $set: { estado: 'vendido' } },
  );
  if (!vehiculo) {
    const existe = await vehiculos().findOne({ _id: vehiculoId }, { projection: { estado: 1 } });
    if (!existe) throw new HttpError(404, 'Vehículo no encontrado');
    throw new HttpError(409, `El vehículo no está disponible (estado: ${existe.estado})`);
  }

  const venta = {
    numero_factura: String(b.numero_factura),
    fecha: b.fecha ? toDate(b.fecha, 'fecha') : new Date(),
    vehiculo_id: vehiculoId,
    cliente_id: clienteId,
    monto_total: montoTotal,
    metodo_pago: b.metodo_pago,
    pagos,
  };
  if (b.observaciones !== undefined) venta.observaciones = String(b.observaciones);

  try {
    const r = await ventas().insertOne(venta);
    res.status(201).json({ _id: r.insertedId, ...venta });
  } catch (err) {
    await vehiculos().updateOne({ _id: vehiculoId }, { $set: { estado: 'disponible' } });
    throw traducirErrorMongo(err);
  }
}

async function agregarPago(req, res) {
  const _id = toObjectId(req.params.id);
  const pago = prepararPago(req.body, 'pago');
  const venta = await ventas().findOne({ _id }, { projection: { monto_total: 1, pagos: 1 } });
  if (!venta) throw new HttpError(404, 'Venta no encontrada');
  const pagado = (venta.pagos || []).reduce((s, p) => s + p.monto, 0);
  if (pagado + pago.monto > venta.monto_total) {
    throw new HttpError(400, `El pago excede el saldo pendiente (${(venta.monto_total - pagado).toFixed(2)})`);
  }
  try {
    const r = await ventas().findOneAndUpdate({ _id }, { $push: { pagos: pago } }, { returnDocument: 'after' });
    res.status(201).json(r);
  } catch (err) {
    throw traducirErrorMongo(err);
  }
}

async function obtenerVentas(req, res) {
  const { page, limit, skip } = getPaginacion(req.query);
  const { fechaInicio, fechaFin, metodo_pago, cliente_id, vehiculo_id } = req.query;
  const filtro = {};
  if (metodo_pago) filtro.metodo_pago = metodo_pago;
  if (cliente_id) filtro.cliente_id = toObjectId(cliente_id);
  if (vehiculo_id) filtro.vehiculo_id = toObjectId(vehiculo_id);
  if (fechaInicio || fechaFin) {
    filtro.fecha = {};
    if (fechaInicio) filtro.fecha.$gte = toDate(fechaInicio, 'fechaInicio');
    if (fechaFin) filtro.fecha.$lte = toDate(fechaFin, 'fechaFin');
  }
  const [data, total] = await Promise.all([
    ventas().find(filtro).sort({ fecha: -1 }).skip(skip).limit(limit).toArray(),
    ventas().countDocuments(filtro),
  ]);
  res.json({ data, page, limit, total });
}

async function obtenerVentaPorId(req, res) {
  const [venta] = await ventas().aggregate([
    { $match: { _id: toObjectId(req.params.id) } },
    { $lookup: { from: 'vehiculos', localField: 'vehiculo_id', foreignField: '_id', as: 'vehiculo' } },
    { $lookup: { from: 'clientes', localField: 'cliente_id', foreignField: '_id', as: 'cliente' } },
    { $unwind: { path: '$vehiculo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
    { $addFields: { total_pagado: { $sum: '$pagos.monto' } } },
    { $addFields: { saldo_pendiente: { $subtract: ['$monto_total', '$total_pagado'] } } },
  ]).toArray();
  if (!venta) throw new HttpError(404, 'Venta no encontrada');
  res.json(venta);
}

async function eliminarVenta(req, res) {
  const venta = await ventas().findOneAndDelete({ _id: toObjectId(req.params.id) });
  if (!venta) throw new HttpError(404, 'Venta no encontrada');
  await vehiculos().updateOne({ _id: venta.vehiculo_id }, { $set: { estado: 'disponible' } });
  res.json({ mensaje: 'Venta eliminada y vehículo devuelto a disponible', _id: venta._id });
}

module.exports = { crearVenta, agregarPago, obtenerVentas, obtenerVentaPorId, eliminarVenta };
