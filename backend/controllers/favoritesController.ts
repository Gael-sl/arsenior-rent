import { Request, Response } from 'express';
import db from '../config/db';

// Obtener favoritos del usuario
export const getFavorites = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }

    const favorites = db.prepare(`
      SELECT 
        f.id as favoriteId,
        f.createdAt as addedAt,
        c.*
      FROM favorites f
      JOIN cars c ON f.carId = c.id
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `).all(userId);

    // Parsear features y gallery para cada carro
    const parsedFavorites = favorites.map((fav: any) => ({
      ...fav,
      features: fav.features ? JSON.parse(fav.features) : [],
      gallery: fav.gallery ? JSON.parse(fav.gallery) : []
    }));

    res.json(parsedFavorites);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ message: 'Error al obtener favoritos' });
  }
};

// Agregar a favoritos
export const addFavorite = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;
    const { carId } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }

    if (!carId) {
      res.status(400).json({ message: 'Se requiere el ID del vehículo' });
      return;
    }

    // Verificar si el carro existe
    const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(carId);
    if (!car) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Verificar si ya está en favoritos
    const existing = db.prepare(
      'SELECT id FROM favorites WHERE userId = ? AND carId = ?'
    ).get(userId, carId);

    if (existing) {
      res.status(400).json({ message: 'El vehículo ya está en favoritos' });
      return;
    }

    // Agregar a favoritos
    const result = db.prepare(
      'INSERT INTO favorites (userId, carId) VALUES (?, ?)'
    ).run(userId, carId);

    res.status(201).json({
      message: 'Vehículo agregado a favoritos',
      favoriteId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    res.status(500).json({ message: 'Error al agregar a favoritos' });
  }
};

// Eliminar de favoritos
export const removeFavorite = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;
    const { carId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }

    const result = db.prepare(
      'DELETE FROM favorites WHERE userId = ? AND carId = ?'
    ).run(userId, carId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Favorito no encontrado' });
      return;
    }

    res.json({ message: 'Vehículo eliminado de favoritos' });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ message: 'Error al eliminar de favoritos' });
  }
};

// Verificar si un carro está en favoritos
export const checkFavorite = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;
    const { carId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }

    const favorite = db.prepare(
      'SELECT id FROM favorites WHERE userId = ? AND carId = ?'
    ).get(userId, carId);

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Error al verificar favorito:', error);
    res.status(500).json({ message: 'Error al verificar favorito' });
  }
};

// Toggle favorito (agregar si no existe, eliminar si existe)
export const toggleFavorite = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;
    const { carId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }

    // Verificar si ya existe
    const existing = db.prepare(
      'SELECT id FROM favorites WHERE userId = ? AND carId = ?'
    ).get(userId, carId);

    if (existing) {
      // Eliminar
      db.prepare('DELETE FROM favorites WHERE userId = ? AND carId = ?').run(userId, carId);
      res.json({ isFavorite: false, message: 'Eliminado de favoritos' });
    } else {
      // Verificar que el carro existe
      const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(carId);
      if (!car) {
        res.status(404).json({ message: 'Vehículo no encontrado' });
        return;
      }

      // Agregar
      db.prepare('INSERT INTO favorites (userId, carId) VALUES (?, ?)').run(userId, carId);
      res.json({ isFavorite: true, message: 'Agregado a favoritos' });
    }
  } catch (error) {
    console.error('Error al toggle favorito:', error);
    res.status(500).json({ message: 'Error al actualizar favorito' });
  }
};
