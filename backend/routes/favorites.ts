import { Router } from 'express';
import { 
  getFavorites, 
  addFavorite, 
  removeFavorite, 
  checkFavorite,
  toggleFavorite 
} from '../controllers/favoritesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/favorites - Obtener todos los favoritos del usuario
router.get('/', authenticateToken, getFavorites);

// POST /api/favorites - Agregar a favoritos
router.post('/', authenticateToken, addFavorite);

// DELETE /api/favorites/:carId - Eliminar de favoritos
router.delete('/:carId', authenticateToken, removeFavorite);

// GET /api/favorites/check/:carId - Verificar si está en favoritos
router.get('/check/:carId', authenticateToken, checkFavorite);

// POST /api/favorites/toggle/:carId - Toggle favorito
router.post('/toggle/:carId', authenticateToken, toggleFavorite);

export default router;
