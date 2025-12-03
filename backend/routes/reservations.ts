import express from 'express';
import {
  createReservation,
  getMyReservations,
  getReservationById,
  confirmDeposit,
  confirmFinalPayment,
  extendReservation,
  earlyReturn,
  createAlternativeReservation,
  getAllReservations,
  getActiveReservations,
  markAsReturned,
  cancelReservation
} from '../controllers/reservationsController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Rutas de usuario (autenticadas)
router.post('/', authenticateToken, createReservation);
router.get('/my-reservations', authenticateToken, getMyReservations);
router.get('/:id', authenticateToken, getReservationById);
router.post('/:reservationId/confirm-deposit', authenticateToken, confirmDeposit);
router.post('/:reservationId/confirm-final', authenticateToken, confirmFinalPayment);
router.post('/extend', authenticateToken, extendReservation);
router.post('/early-return', authenticateToken, earlyReturn);
router.delete('/:reservationId', authenticateToken, cancelReservation);

// Rutas de admin
router.get('/admin/all', authenticateToken, isAdmin, getAllReservations);
router.get('/admin/active', authenticateToken, isAdmin, getActiveReservations);
router.post('/alternative', authenticateToken, isAdmin, createAlternativeReservation);
router.patch('/:reservationId/returned', authenticateToken, isAdmin, markAsReturned);

export default router;