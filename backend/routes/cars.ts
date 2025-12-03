import express from 'express';
import {
  getAllCars,
  getCarById,
  checkAvailability,
  getCarsBySegment,
  getAlternativeCars,
  createCar,
  updateCar,
  updateCarStatus,
  deleteCar
} from '../controllers/carsController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Rutas públicas
router.get('/', getAllCars);
router.get('/segment/:segment', getCarsBySegment);
router.get('/alternatives', getAlternativeCars);
router.get('/:id', getCarById);
router.post('/check-availability', checkAvailability);

// Rutas protegidas - Solo Admin
router.post('/', authenticateToken, isAdmin, createCar);
router.put('/:id', authenticateToken, isAdmin, updateCar);
router.patch('/:id/status', authenticateToken, isAdmin, updateCarStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteCar);

export default router;