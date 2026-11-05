const { getDb } = require('../db');

const redondear = (campo) => ({ $round: [campo, 2] });

async function ventasMensuales(req, res) {
  const data = await getDb().collection('ventas').aggregate([
    {
      $group: {
        _id: { anio: { $year: '$fecha' }, mes: { $month: '$fecha' } },
        total_vendido: { $sum: '$monto_total' },
        cantidad_ventas: { $sum: 1 },
      },
    },
    { $sort: { '_id.anio': 1, '_id.mes': 1 } },
    {
      $project: {
        _id: 0, anio: '$_id.anio', mes: '$_id.mes', cantidad_ventas: 1,
        total_vendido: redondear('$total_vendido'),
      },
    },
  ]).toArray();
  res.json({ data });
}

async function gananciaPorMarca(req, res) {
  const data = await getDb().collection('ventas').aggregate([
    { $lookup: { from: 'vehiculos', localField: 'vehiculo_id', foreignField: '_id', as: 'vehiculo' } },
    { $unwind: '$vehiculo' },
    {
      $addFields: {
        costo: { $add: ['$vehiculo.costo_compra', { $sum: '$vehiculo.reparaciones.costo' }] },
      },
    },
    {
      $group: {
        _id: '$vehiculo.marca',
        vehiculos_vendidos: { $sum: 1 },
        ingresos: { $sum: '$monto_total' },
        costo_total: { $sum: '$costo' },
      },
    },
    {
      $project: {
        _id: 0, marca: '$_id', vehiculos_vendidos: 1,
        ingresos: redondear('$ingresos'),
        costo_total: redondear('$costo_total'),
        ganancia_neta: redondear({ $subtract: ['$ingresos', '$costo_total'] }),
      },
    },
    { $sort: { ganancia_neta: -1 } },
  ]).toArray();
  res.json({ data });
}

async function inventarioDisponible(req, res) {
  const data = await getDb().collection('vehiculos').aggregate([
    { $match: { estado: 'disponible' } },
    { $addFields: { dias: { $dateDiff: { startDate: '$fecha_ingreso', endDate: '$$NOW', unit: 'day' } } } },
    {
      $group: {
        _id: '$marca',
        disponibles: { $sum: 1 },
        valor_inventario: { $sum: '$precio' },
        promedio_dias_inventario: { $avg: '$dias' },
      },
    },
    {
      $project: {
        _id: 0, marca: '$_id', disponibles: 1,
        valor_inventario: redondear('$valor_inventario'),
        promedio_dias_inventario: { $round: ['$promedio_dias_inventario', 0] },
      },
    },
    { $sort: { disponibles: -1 } },
  ]).toArray();
  res.json({ data });
}

module.exports = { ventasMensuales, gananciaPorMarca, inventarioDisponible };
