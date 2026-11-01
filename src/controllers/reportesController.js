const { getDb } = require('../db');

const ventasMensuales = async (req, res) => {
    try {
        const db = getDb();
        const reporte = await db.collection('ventas').aggregate([
            {
                $group: {
                    _id: { mes: { $month: "$fecha" }, anio: { $year: "$fecha" } },
                    totalVendido: { $sum: "$monto_total" },
                    cantidadVentas: { $sum: 1 }
                }
            },
            { $sort: { "_id.anio": 1, "_id.mes": 1 } }
        ]).toArray();

        res.status(200).json({ data: reporte });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const gananciaPorMarca = async (req, res) => {
    try {
        const db = getDb();
        const reporte = await db.collection('ventas').aggregate([
            {
                $lookup: { from: "vehiculos", localField: "vehiculo_id", foreignField: "_id", as: "vehiculo" }
            },
            { $unwind: "$vehiculo" },
            {
                $addFields: { totalReparaciones: { $sum: "$vehiculo.reparaciones.costo" } }
            },
            {
                $group: {
                    _id: "$vehiculo.marca",
                    ingresosTotales: { $sum: "$monto_total" },
                    costoTotal: { $sum: { $add: ["$vehiculo.costo_compra", "$totalReparaciones"] } },
                    gananciaNeta: {
                        $sum: { $subtract: ["$monto_total", { $add: ["$vehiculo.costo_compra", "$totalReparaciones"] }] }
                    }
                }
            },
            { $sort: { gananciaNeta: -1 } }
        ]).toArray();

        res.status(200).json({ data: reporte });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const inventarioDisponible = async (req, res) => {
    try {
        const db = getDb();
        const reporte = await db.collection('vehiculos').aggregate([
            { $match: { estado: "disponible" } },
            {
                $addFields: {
                    diasEnInventario: { $dateDiff: { startDate: "$fecha_ingreso", endDate: new Date(), unit: "day" } }
                }
            },
            {
                $group: {
                    _id: "$marca",
                    vehiculosDisponibles: { $sum: 1 },
                    promedioDiasInventario: { $avg: "$diasEnInventario" }
                }
            }
        ]).toArray();

        res.status(200).json({ data: reporte });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { ventasMensuales, gananciaPorMarca, inventarioDisponible };