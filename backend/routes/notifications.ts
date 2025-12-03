import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  processReminders,
  getUnreadCount
} from '../controllers/notificationsController';

const router = express.Router();

// Rutas protegidas para usuarios autenticados
router.get('/', authenticateToken, getUserNotifications);
router.get('/unread-count', authenticateToken, getUnreadCount);
router.patch('/:id/read', authenticateToken, markAsRead);
router.patch('/mark-all-read', authenticateToken, markAllAsRead);
router.delete('/:id', authenticateToken, deleteNotification);

// Ruta admin para procesar recordatorios manualmente
router.post('/process-reminders', authenticateToken, isAdmin, processReminders);

export default router;
