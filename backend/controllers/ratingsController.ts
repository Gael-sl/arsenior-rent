import { Request, Response } from 'express';
import db from '../config/db';

// USUARIO CALIFICA VEHÍCULO Y SERVICIO
export const rateCarAndService = (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;
    const {
      reservationId,
      vehicleCondition,
      cleanliness,
      performance,
      customerService,
      comments
    } = req.body;

    // Validaciones
    if (!reservationId || !vehicleCondition || !cleanliness || !performance || !customerService) {
      res.status(400).json({ message: 'Todas las calificaciones son requeridas' });
      return;
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as any;
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.userId !== userId) {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    if (reservation.status !== 'completada') {
      res.status(400).json({ message: 'Solo se pueden calificar reservas completadas' });
      return;
    }

    // Verificar que no haya calificado ya
    const existingRating = db.prepare(`
      SELECT * FROM ratings 
      WHERE reservationId = ? AND userToCarRating IS NOT NULL
    `).get(reservationId);

    if (existingRating) {
      res.status(400).json({ message: 'Ya has calificado esta reserva' });
      return;
    }

    // Calcular promedio
    const overallRating = (vehicleCondition + cleanliness + performance + customerService) / 4;

    const userToCarRating = {
      vehicleCondition,
      cleanliness,
      performance,
      customerService,
      overallRating,
      comments: comments || '',
      ratedAt: new Date().toISOString()
    };

    // Insertar o actualizar rating
    const existingRecord = db.prepare('SELECT * FROM ratings WHERE reservationId = ?').get(reservationId);

    if (existingRecord) {
      db.prepare(`
        UPDATE ratings 
        SET userToCarRating = ?,
            updatedAt = datetime('now')
        WHERE reservationId = ?
      `).run(JSON.stringify(userToCarRating), reservationId);
    } else {
      db.prepare(`
        INSERT INTO ratings (reservationId, userId, carId, userToCarRating)
        VALUES (?, ?, ?, ?)
      `).run(reservationId, userId, reservation.carId, JSON.stringify(userToCarRating));
    }

    // Actualizar rating promedio del carro
    const carRatings = db.prepare(`
      SELECT r.userToCarRating
      FROM ratings r
      WHERE r.carId = ? AND r.userToCarRating IS NOT NULL
    `).all(reservation.carId) as any[];

    if (carRatings.length > 0) {
      const totalRating = carRatings.reduce((sum, rating) => {
        const parsed = JSON.parse(rating.userToCarRating);
        return sum + parsed.overallRating;
      }, 0);

      const avgRating = totalRating / carRatings.length;

      db.prepare(`
        UPDATE cars 
        SET rating = ?,
            totalRatings = ?
        WHERE id = ?
      `).run(avgRating, carRatings.length, reservation.carId);
    }

    res.json({ 
      message: 'Calificación enviada exitosamente',
      rating: userToCarRating
    });
  } catch (error) {
    console.error('Error al calificar:', error);
    res.status(500).json({ message: 'Error al enviar calificación' });
  }
};

// ADMIN CALIFICA USUARIO
export const rateUser = (req: Request, res: Response): void => {
  try {
    const {
      reservationId,
      vehicleReturnCondition,
      punctuality,
      communication,
      responsibleUse,
      comments
    } = req.body;

    // Validaciones
    if (!reservationId || !vehicleReturnCondition || !punctuality || !communication || !responsibleUse) {
      res.status(400).json({ message: 'Todas las calificaciones son requeridas' });
      return;
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as any;
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.status !== 'completada') {
      res.status(400).json({ message: 'Solo se pueden calificar reservas completadas' });
      return;
    }

    // Verificar que no haya calificado ya
    const existingRating = db.prepare(`
      SELECT * FROM ratings 
      WHERE reservationId = ? AND adminToUserRating IS NOT NULL
    `).get(reservationId);

    if (existingRating) {
      res.status(400).json({ message: 'Ya has calificado a este usuario' });
      return;
    }

    // Calcular promedio
    const overallRating = (vehicleReturnCondition + punctuality + communication + responsibleUse) / 4;

    const adminToUserRating = {
      vehicleReturnCondition,
      punctuality,
      communication,
      responsibleUse,
      overallRating,
      comments: comments || '',
      ratedAt: new Date().toISOString()
    };

    // Insertar o actualizar rating
    const existingRecord = db.prepare('SELECT * FROM ratings WHERE reservationId = ?').get(reservationId);

    if (existingRecord) {
      db.prepare(`
        UPDATE ratings 
        SET adminToUserRating = ?,
            updatedAt = datetime('now')
        WHERE reservationId = ?
      `).run(JSON.stringify(adminToUserRating), reservationId);
    } else {
      db.prepare(`
        INSERT INTO ratings (reservationId, userId, carId, adminToUserRating)
        VALUES (?, ?, ?, ?)
      `).run(reservationId, reservation.userId, reservation.carId, JSON.stringify(adminToUserRating));
    }

    // Actualizar rating promedio del usuario
    const userRatings = db.prepare(`
      SELECT r.adminToUserRating
      FROM ratings r
      WHERE r.userId = ? AND r.adminToUserRating IS NOT NULL
    `).all(reservation.userId) as any[];

    if (userRatings.length > 0) {
      const totalRating = userRatings.reduce((sum, rating) => {
        const parsed = JSON.parse(rating.adminToUserRating);
        return sum + parsed.overallRating;
      }, 0);

      const avgRating = totalRating / userRatings.length;

      db.prepare(`
        UPDATE users 
        SET rating = ?
        WHERE id = ?
      `).run(avgRating, reservation.userId);
    }

    res.json({ 
      message: 'Usuario calificado exitosamente',
      rating: adminToUserRating
    });
  } catch (error) {
    console.error('Error al calificar usuario:', error);
    res.status(500).json({ message: 'Error al calificar usuario' });
  }
};

// OBTENER CALIFICACIONES DE UN CARRO
export const getCarRatings = (req: Request, res: Response): void => {
  try {
    const { carId } = req.params;

    const ratings = db.prepare(`
      SELECT 
        r.*,
        u.firstName, u.lastName,
        res.startDate, res.endDate
      FROM ratings r
      JOIN users u ON r.userId = u.id
      JOIN reservations res ON r.reservationId = res.id
      WHERE r.carId = ? AND r.userToCarRating IS NOT NULL
      ORDER BY r.createdAt DESC
    `).all(carId) as any[];

    const ratingsWithParsed = ratings.map(r => ({
      ...r,
      userToCarRating: r.userToCarRating ? JSON.parse(r.userToCarRating) : null,
      user: {
        firstName: r.firstName,
        lastName: r.lastName
      }
    }));

    res.json(ratingsWithParsed);
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
};

// OBTENER CALIFICACIONES DE UN USUARIO
export const getUserRatings = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params;

    const ratings = db.prepare(`
      SELECT 
        r.*,
        c.brand, c.model,
        res.startDate, res.endDate
      FROM ratings r
      JOIN cars c ON r.carId = c.id
      JOIN reservations res ON r.reservationId = res.id
      WHERE r.userId = ? AND r.adminToUserRating IS NOT NULL
      ORDER BY r.createdAt DESC
    `).all(userId) as any[];

    const ratingsWithParsed = ratings.map(r => ({
      ...r,
      adminToUserRating: r.adminToUserRating ? JSON.parse(r.adminToUserRating) : null,
      car: {
        brand: r.brand,
        model: r.model
      }
    }));

    res.json(ratingsWithParsed);
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
};

// OBTENER CALIFICACIÓN DE UNA RESERVA
export const getRatingByReservation = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;

    const rating = db.prepare('SELECT * FROM ratings WHERE reservationId = ?').get(reservationId) as any;

    if (!rating) {
      res.status(404).json({ message: 'Calificación no encontrada' });
      return;
    }

    res.json({
      ...rating,
      userToCarRating: rating.userToCarRating ? JSON.parse(rating.userToCarRating) : null,
      adminToUserRating: rating.adminToUserRating ? JSON.parse(rating.adminToUserRating) : null
    });
  } catch (error) {
    console.error('Error al obtener calificación:', error);
    res.status(500).json({ message: 'Error al obtener calificación' });
  }
};