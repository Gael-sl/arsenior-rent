import { Request, Response } from 'express';
import db from '../config/db';

interface Car {
  id: number;
  brand: string;
  model: string;
  year: number;
  segment: 'A' | 'B' | 'C';
  transmission: 'Automatica' | 'Manual';
  fuelType: string;
  seats: number;
  doors: number;
  luggage: number;
  image: string | null;
  gallery: string | null;
  pricePerDay: number;
  status: 'disponible' | 'rentado' | 'mantenimiento';
  rating: number;
  totalRatings: number;
  features: string;
  description: string;
  licensePlate: string;
  createdAt: string;
  updatedAt: string;
}

// OBTENER TODOS LOS CARROS (con filtros opcionales)
export const getAllCars = (req: Request, res: Response): void => {
  try {
    const {
      segment,
      transmission,
      minSeats,
      minPrice,
      maxPrice,
      startDate,
      endDate
    } = req.query;

    let query = 'SELECT * FROM cars WHERE 1=1';
    const params: any[] = [];

    // Filtros opcionales
    if (segment) {
      query += ' AND segment = ?';
      params.push(segment);
    }

    if (transmission) {
      query += ' AND transmission = ?';
      params.push(transmission);
    }

    if (minSeats) {
      query += ' AND seats >= ?';
      params.push(Number(minSeats));
    }

    if (minPrice) {
      query += ' AND pricePerDay >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      query += ' AND pricePerDay <= ?';
      params.push(Number(maxPrice));
    }

    // Si hay fechas, verificar disponibilidad
    if (startDate && endDate) {
      query += ` AND id NOT IN (
        SELECT carId FROM reservations
        WHERE status IN ('confirmada', 'activa')
        AND NOT (endDate < ? OR startDate > ?)
      )`;
      params.push(startDate, endDate);
    }

    query += ' ORDER BY rating DESC, brand ASC';

    const cars = db.prepare(query).all(...params) as Car[];

    // Parsear features y gallery de JSON string a array
    const carsWithParsedFeatures = cars.map(car => ({
      ...car,
      features: car.features ? JSON.parse(car.features) : [],
      gallery: car.gallery ? JSON.parse(car.gallery) : []
    }));

    res.json(carsWithParsedFeatures);
  } catch (error) {
    console.error('Error al obtener carros:', error);
    res.status(500).json({ message: 'Error al obtener vehículos' });
  }
};

// OBTENER UN CARRO POR ID
export const getCarById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(id) as Car | undefined;

    if (!car) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Parsear features y gallery
    const carWithParsedFeatures = {
      ...car,
      features: car.features ? JSON.parse(car.features) : [],
      gallery: car.gallery ? JSON.parse(car.gallery) : []
    };

    res.json(carWithParsedFeatures);
  } catch (error) {
    console.error('Error al obtener carro:', error);
    res.status(500).json({ message: 'Error al obtener vehículo' });
  }
};

// VERIFICAR DISPONIBILIDAD
export const checkAvailability = (req: Request, res: Response): void => {
  try {
    const { carId, startDate, endDate } = req.body;

    if (!carId || !startDate || !endDate) {
      res.status(400).json({ message: 'Faltan parámetros requeridos' });
      return;
    }

    // Verificar si el carro existe
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId) as Car | undefined;

    if (!car) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Verificar si hay conflictos de reserva
    const conflicts = db.prepare(`
      SELECT * FROM reservations
      WHERE carId = ?
      AND status IN ('confirmada', 'activa')
      AND NOT (endDate < ? OR startDate > ?)
    `).all(carId, startDate, endDate);

    const available = conflicts.length === 0 && car.status === 'disponible';

    if (!available) {
      // Buscar carros alternativos del mismo segmento o superior
      const alternativeCars = db.prepare(`
        SELECT * FROM cars
        WHERE id != ?
        AND segment <= ?
        AND status = 'disponible'
        AND id NOT IN (
          SELECT carId FROM reservations
          WHERE status IN ('confirmada', 'activa')
          AND NOT (endDate < ? OR startDate > ?)
        )
        ORDER BY 
          CASE segment
            WHEN 'A' THEN 1
            WHEN 'B' THEN 2
            WHEN 'C' THEN 3
          END ASC,
          rating DESC
        LIMIT 5
      `).all(carId, car.segment, startDate, endDate) as Car[];

      const alternativesWithParsedFeatures = alternativeCars.map(altCar => ({
        ...altCar,
        features: altCar.features ? JSON.parse(altCar.features) : []
      }));

      res.json({
        carId,
        available: false,
        alternativeCars: alternativesWithParsedFeatures
      });
      return;
    }

    res.json({
      carId,
      available: true,
      alternativeCars: []
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({ message: 'Error al verificar disponibilidad' });
  }
};

// OBTENER CARROS POR SEGMENTO
export const getCarsBySegment = (req: Request, res: Response): void => {
  try {
    const { segment } = req.params;

    if (!['A', 'B', 'C'].includes(segment)) {
      res.status(400).json({ message: 'Segmento inválido' });
      return;
    }

    const cars = db.prepare('SELECT * FROM cars WHERE segment = ? ORDER BY rating DESC').all(segment) as Car[];

    const carsWithParsedFeatures = cars.map(car => ({
      ...car,
      features: car.features ? JSON.parse(car.features) : []
    }));

    res.json(carsWithParsedFeatures);
  } catch (error) {
    console.error('Error al obtener carros por segmento:', error);
    res.status(500).json({ message: 'Error al obtener vehículos' });
  }
};

// BUSCAR CARROS ALTERNATIVOS
export const getAlternativeCars = (req: Request, res: Response): void => {
  try {
    const { carId, segment } = req.query;

    if (!carId || !segment) {
      res.status(400).json({ message: 'Faltan parámetros requeridos' });
      return;
    }

    // Buscar carros del mismo segmento o superior que estén disponibles
    const alternativeCars = db.prepare(`
      SELECT * FROM cars
      WHERE id != ?
      AND segment <= ?
      AND status = 'disponible'
      ORDER BY 
        CASE segment
          WHEN 'A' THEN 1
          WHEN 'B' THEN 2
          WHEN 'C' THEN 3
        END ASC,
        rating DESC
      LIMIT 5
    `).all(carId, segment) as Car[];

    const carsWithParsedFeatures = alternativeCars.map(car => ({
      ...car,
      features: car.features ? JSON.parse(car.features) : []
    }));

    res.json(carsWithParsedFeatures);
  } catch (error) {
    console.error('Error al obtener carros alternativos:', error);
    res.status(500).json({ message: 'Error al obtener vehículos alternativos' });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// CREAR CARRO (Solo Admin)
export const createCar = (req: Request, res: Response): void => {
  try {
    const {
      brand,
      model,
      year,
      segment,
      transmission,
      fuelType,
      seats,
      doors,
      luggage,
      image,
      pricePerDay,
      features,
      description,
      licensePlate
    } = req.body;

    // Validaciones
    if (!brand || !model || !year || !segment || !transmission || !fuelType || 
        !seats || !doors || !luggage || !pricePerDay || !licensePlate) {
      res.status(400).json({ message: 'Faltan campos requeridos' });
      return;
    }

    // Verificar que la placa no exista
    const existingCar = db.prepare('SELECT id FROM cars WHERE licensePlate = ?').get(licensePlate);
    if (existingCar) {
      res.status(400).json({ message: 'La placa ya está registrada' });
      return;
    }

    // Convertir features array a JSON string
    const featuresJSON = Array.isArray(features) ? JSON.stringify(features) : '[]';

    const result = db.prepare(`
      INSERT INTO cars (
        brand, model, year, segment, transmission, fuelType, seats, doors, luggage,
        image, pricePerDay, features, description, licensePlate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible')
    `).run(
      brand, model, year, segment, transmission, fuelType, seats, doors, luggage,
      image || null, pricePerDay, featuresJSON, description || '', licensePlate
    );

    const newCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(result.lastInsertRowid) as Car;

    res.status(201).json({
      message: 'Vehículo creado exitosamente',
      car: {
        ...newCar,
        features: newCar.features ? JSON.parse(newCar.features) : []
      }
    });
  } catch (error) {
    console.error('Error al crear carro:', error);
    res.status(500).json({ message: 'Error al crear vehículo' });
  }
};

// ACTUALIZAR CARRO (Solo Admin)
export const updateCar = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el carro existe
    const existingCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
    if (!existingCar) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Construir query dinámicamente
    const allowedFields = [
      'brand', 'model', 'year', 'segment', 'transmission', 'fuelType',
      'seats', 'doors', 'luggage', 'image', 'gallery', 'pricePerDay', 'description', 'licensePlate'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'features' && Array.isArray(updates[key])) {
          updateFields.push('features = ?');
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'gallery' && Array.isArray(updates[key])) {
          updateFields.push('gallery = ?');
          values.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      res.status(400).json({ message: 'No hay campos válidos para actualizar' });
      return;
    }

    // Agregar updatedAt
    updateFields.push("updatedAt = datetime('now')");
    values.push(id);

    const query = `UPDATE cars SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    const updatedCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(id) as Car;

    res.json({
      message: 'Vehículo actualizado exitosamente',
      car: {
        ...updatedCar,
        features: updatedCar.features ? JSON.parse(updatedCar.features) : []
      }
    });
  } catch (error) {
    console.error('Error al actualizar carro:', error);
    res.status(500).json({ message: 'Error al actualizar vehículo' });
  }
};

// CAMBIAR ESTADO DEL CARRO (Solo Admin)
export const updateCarStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['disponible', 'rentado', 'mantenimiento'].includes(status)) {
      res.status(400).json({ message: 'Estado inválido' });
      return;
    }

    const existingCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
    if (!existingCar) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    db.prepare(`
      UPDATE cars 
      SET status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(status, id);

    const updatedCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(id) as Car;

    res.json({
      message: 'Estado actualizado exitosamente',
      car: {
        ...updatedCar,
        features: updatedCar.features ? JSON.parse(updatedCar.features) : []
      }
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
};

// ELIMINAR CARRO (Solo Admin)
export const deleteCar = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const existingCar = db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
    if (!existingCar) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Verificar que no tenga reservas activas
    const activeReservations = db.prepare(`
      SELECT COUNT(*) as count FROM reservations
      WHERE carId = ? AND status IN ('confirmada', 'activa')
    `).get(id) as { count: number };

    if (activeReservations.count > 0) {
      res.status(400).json({ 
        message: 'No se puede eliminar. El vehículo tiene reservas activas.' 
      });
      return;
    }

    db.prepare('DELETE FROM cars WHERE id = ?').run(id);

    res.json({ message: 'Vehículo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar carro:', error);
    res.status(500).json({ message: 'Error al eliminar vehículo' });
  }
};