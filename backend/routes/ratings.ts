import express from 'express';
import {
  rateCarAndService,
  rateUser,
  getCarRatings,
  getUserRatings,
  getRatingByReservation
} from '../controllers/ratingsController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/user-rating', authenticateToken, rateCarAndService);
router.post('/admin-rating', authenticateToken, isAdmin, rateUser);
router.get('/car/:carId', getCarRatings);
router.get('/user/:userId', getUserRatings);
router.get('/reservation/:reservationId', authenticateToken, getRatingByReservation);

export default router;