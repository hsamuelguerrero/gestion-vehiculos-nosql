const { getDb } = require('../db');
const {
  HttpError, toObjectId, getPaginacion, getOrden, escapeRegex, pick, traducirErrorMongo,
} = require('../utils/http');

const col = () => getDb().collection('clientes');

const CAMPOS = ['nombre', 'dui', 'telefono', 'email', 'direccion'];
const ORDEN = { nombre: 'nombre', dui: 'dui', departamento: 'direccion.departamento' };

async function crear(req, res) {
  const doc = pick(req.body || {}, CAMPOS);
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
  if (q.nombre) filtro.nombre = { $regex: escapeRegex(q.nombre), $options: 'i' };
  if (q.dui) filtro.dui = q.dui;
  if (q.email) filtro.email = { $regex: escapeRegex(q.email), $options: 'i' };
  if (q.departamento) filtro['direccion.departamento'] = { $regex: `^${escapeRegex(q.departamento)}$`, $options: 'i' };
  if (q.municipio) filtro['direccion.municipio'] = { $regex: `^${escapeRegex(q.municipio)}$`, $options: 'i' };

  const { page, limit, skip } = getPaginacion(q);
  const sort = getOrden(q, ORDEN, 'nombre');

  const [data, total] = await Promise.all([
    col().find(filtro).sort(sort).skip(skip).limit(limit).toArray(),
    col().countDocuments(filtro),
  ]);
  res.json({ data, page, limit, total });
}

async function obtener(req, res) {
  const c = await col().findOne({ _id: toObjectId(req.params.id) });
  if (!c) throw new HttpError(404, 'Cliente no encontrado');
  res.json(c);
}

async function actualizar(req, res) {
  const _id = toObjectId(req.params.id);
  const cambios = pick(req.body || {}, CAMPOS);
  if (Object.keys(cambios).length === 0) throw new HttpError(400, 'No se envió ningún campo para actualizar');
  try {
    const c = await col().findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: 'after' });
    if (!c) throw new HttpError(404, 'Cliente no encontrado');
    res.json(c);
  } catch (err) {
    throw traducirErrorMongo(err);
  }
}

async function eliminar(req, res) {
  const _id = toObjectId(req.params.id);
  const c = await col().findOne({ _id });
  if (!c) throw new HttpError(404, 'Cliente no encontrado');

  const compras = await getDb().collection('ventas').countDocuments({ cliente_id: _id });
  if (compras > 0) {
    throw new HttpError(409, `No se puede eliminar: el cliente tiene ${compras} compra(s) registrada(s)`);
  }
  await col().deleteOne({ _id });
  res.json({ mensaje: 'Cliente eliminado', _id });
}

module.exports = { crear, listar, obtener, actualizar, eliminar };
