import express from 'express';
import {
  getAllMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  updateMaintenanceStatus,
  deleteMaintenance
} from '../controllers/maintenanceController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.get('/', authenticateToken, isAdmin, getAllMaintenances);
router.get('/:id', authenticateToken, isAdmin, getMaintenanceById);
router.post('/', authenticateToken, isAdmin, createMaintenance);
router.put('/:id', authenticateToken, isAdmin, updateMaintenance);
router.patch('/:id/status', authenticateToken, isAdmin, updateMaintenanceStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteMaintenance);

export default router;