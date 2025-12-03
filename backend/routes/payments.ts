import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth';
import {
  getUserPayments,
  getReservationPayments,
  registerPayment,
  getAllPayments,
  updatePaymentStatus
} from '../controllers/paymentsController';

const router = express.Router();

// Rutas de usuario
router.get('/my-payments', authenticateToken, getUserPayments);
router.get('/reservation/:reservationId', authenticateToken, getReservationPayments);

// Rutas de admin
router.get('/all', authenticateToken, isAdmin, getAllPayments);
router.post('/register', authenticateToken, isAdmin, registerPayment);
router.patch('/:id/status', authenticateToken, isAdmin, updatePaymentStatus);

export default router;
