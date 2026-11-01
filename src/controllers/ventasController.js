const { getDb } = require('../db');
const { toObjectId, HttpError, getPaginacion } = require('../utils/http');

const crearVenta = async (req, res) => {
    try {
        const db = getDb();
        const { numero_factura, fecha, vehiculo_id, cliente_id, monto_total, metodo_pago, pagos, observaciones } = req.body;

        // 1 y 2: Validar Vehículo y Cliente
        const vehiculo = await db.collection('vehiculos').findOne({ _id: toObjectId(vehiculo_id) });
        if (!vehiculo) return res.status(404).json({ error: "Vehículo no encontrado" });
        if (vehiculo.estado !== 'disponible') return res.status(409).json({ error: "El vehículo no está disponible (Estado: " + vehiculo.estado + ")" });

        const cliente = await db.collection('clientes').findOne({ _id: toObjectId(cliente_id) });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        // 3: Guardar la venta
        const nuevaVenta = {
            numero_factura,
            fecha: new Date(fecha || Date.now()),
            vehiculo_id: toObjectId(vehiculo_id),
            cliente_id: toObjectId(cliente_id),
            monto_total: parseFloat(monto_total),
            metodo_pago,
            pagos: pagos ? pagos.map(p => ({ ...p, fecha: new Date(p.fecha), monto: parseFloat(p.monto) })) : [],
            observaciones
        };
        const result = await db.collection('ventas').insertOne(nuevaVenta);

        // 4: Marcar vehículo como vendido
        await db.collection('vehiculos').updateOne(
            { _id: toObjectId(vehiculo_id) },
            { $set: { estado: 'vendido' } }
        );

        res.status(201).json({ data: { _id: result.insertedId, ...nuevaVenta } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const agregarPago = async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { fecha, monto, metodo } = req.body;

        const nuevoPago = { fecha: new Date(fecha), monto: parseFloat(monto), metodo };

        const result = await db.collection('ventas').updateOne(
            { _id: toObjectId(id) },
            { $push: { pagos: nuevoPago } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ error: "Venta no encontrada" });
        res.status(200).json({ data: "Pago registrado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerVentas = async (req, res) => {
    try {
        const db = getDb();
        const { page, limit, skip } = getPaginacion(req.query);
        const { fechaInicio, fechaFin, metodo_pago } = req.query;

        let filtro = {};
        if (metodo_pago) filtro.metodo_pago = metodo_pago;
        if (fechaInicio && fechaFin) {
            filtro.fecha = { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) };
        }

        const data = await db.collection('ventas').find(filtro).skip(skip).limit(limit).toArray();
        const total = await db.collection('ventas').countDocuments(filtro);

        res.status(200).json({ data, page, limit, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerVentaPorId = async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        const venta = await db.collection('ventas').aggregate([
            { $match: { _id: toObjectId(id) } },
            { $lookup: { from: 'vehiculos', localField: 'vehiculo_id', foreignField: '_id', as: 'vehiculo' } },
            { $lookup: { from: 'clientes', localField: 'cliente_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$vehiculo' },
            { $unwind: '$cliente' }
        ]).toArray();

        if (venta.length === 0) return res.status(404).json({ error: "Venta no encontrada" });
        res.status(200).json({ data: venta[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarVenta = async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        const venta = await db.collection('ventas').findOne({ _id: toObjectId(id) });
        if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

        await db.collection('ventas').deleteOne({ _id: toObjectId(id) });
        
        // Regresar vehículo a disponible
        await db.collection('vehiculos').updateOne(
            { _id: toObjectId(venta.vehiculo_id) },
            { $set: { estado: 'disponible' } }
        );

        res.status(200).json({ data: "Venta eliminada y vehículo liberado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { crearVenta, agregarPago, obtenerVentas, obtenerVentaPorId, eliminarVenta };