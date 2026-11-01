const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.post('/', ventasController.crearVenta);
router.post('/:id/pagos', ventasController.agregarPago);
router.get('/', ventasController.obtenerVentas);
router.get('/:id', ventasController.obtenerVentaPorId);
router.delete('/:id', ventasController.eliminarVenta);

module.exports = router;