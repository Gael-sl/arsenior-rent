import express from 'express';
import { getCarSpecs } from '../controllers/aiController';

const router = express.Router();

// Ruta pública para obtener especificaciones de un vehículo con IA
router.post('/car-specs', getCarSpecs);

export default router;
