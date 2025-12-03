import express from 'express';
import {
  register,
  login,
  getProfile,
  verifyToken,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  validateResetToken
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Verificación de email (públicas)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Recuperación de contraseña (públicas)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/validate-reset-token/:token', validateResetToken);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, getProfile);
router.get('/verify', authenticateToken, verifyToken);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;