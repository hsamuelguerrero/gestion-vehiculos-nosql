const { Router } = require('express');
const c = require('../controllers/vehiculosController');

const router = Router();

router.post('/', c.crear);
router.get('/', c.listar);
router.get('/:id', c.obtener);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);
router.post('/:id/reparaciones', c.agregarReparacion);

module.exports = router;
