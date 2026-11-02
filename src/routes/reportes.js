const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

router.get('/ventas-mensuales', reportesController.ventasMensuales);
router.get('/ganancia-por-marca', reportesController.gananciaPorMarca);
router.get('/inventario', reportesController.inventarioDisponible);

module.exports = router;