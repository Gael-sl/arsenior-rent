import express from 'express';
import {
  createChecklist,
  getChecklistByReservation,
  uploadPhoto
} from '../controllers/checklistsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, createChecklist);
router.get('/reservation/:reservationId/:type', authenticateToken, getChecklistByReservation);
router.post('/upload-photo', authenticateToken, uploadPhoto);
router.post('/upload-damage', authenticateToken, uploadPhoto);

export default router;