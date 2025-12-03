import { Request, Response } from 'express';
import db from '../config/db';
import { getOne } from '../config/db-utils';

// OBTENER TODOS LOS MANTENIMIENTOS CON INFORMACIÓN DEL AUTO
export const getAllMaintenances = (req: Request, res: Response): void => {
  try {
    const maintenances = db.prepare(`
      SELECT
        m.*,
        c.id as carId,
        c.brand,
        c.model,
        c.year,
        c.licensePlate,
        c.image as carImage
      FROM maintenances m
      LEFT JOIN cars c ON m.carId = c.id
      ORDER BY m.createdAt DESC
    `).all();

    // Para cada mantenimiento, obtener sus items
    const maintenancesWithItems = (maintenances as any[]).map(maintenance => {
      const items = db.prepare(`
        SELECT * FROM maintenance_items
        WHERE maintenanceId = ?
      `).all(maintenance.id);

      return {
        id: maintenance.id,
        car: {
          id: maintenance.carId,
          brand: maintenance.brand,
          model: maintenance.model,
          year: maintenance.year,
          licensePlate: maintenance.licensePlate,
          image: maintenance.carImage
        },
        types: JSON.parse(maintenance.types),
        mechanic: maintenance.mechanic,
        startDate: maintenance.startDate,
        endDate: maintenance.endDate,
        status: maintenance.status,
        totalCost: maintenance.totalCost,
        notes: maintenance.notes,
        items: items,
        createdAt: maintenance.createdAt,
        updatedAt: maintenance.updatedAt
      };
    });

    res.json(maintenancesWithItems);
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error);
    res.status(500).json({ message: 'Error al obtener mantenimientos' });
  }
};

// OBTENER MANTENIMIENTO POR ID
export const getMaintenanceById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const maintenance = getOne<any>(`
      SELECT
        m.*,
        c.id as carId,
        c.brand,
        c.model,
        c.year,
        c.licensePlate,
        c.image as carImage
      FROM maintenances m
      LEFT JOIN cars c ON m.carId = c.id
      WHERE m.id = ?
    `, id);

    if (!maintenance) {
      res.status(404).json({ message: 'Mantenimiento no encontrado' });
      return;
    }

    const items = db.prepare(`
      SELECT * FROM maintenance_items
      WHERE maintenanceId = ?
    `).all(id);

    const maintenanceData = {
      id: maintenance.id,
      car: {
        id: maintenance.carId,
        brand: maintenance.brand,
        model: maintenance.model,
        year: maintenance.year,
        licensePlate: maintenance.licensePlate,
        image: maintenance.carImage
      },
      types: JSON.parse(maintenance.types),
      mechanic: maintenance.mechanic,
      startDate: maintenance.startDate,
      endDate: maintenance.endDate,
      status: maintenance.status,
      totalCost: maintenance.totalCost,
      notes: maintenance.notes,
      items: items,
      createdAt: maintenance.createdAt,
      updatedAt: maintenance.updatedAt
    };

    res.json(maintenanceData);
  } catch (error) {
    console.error('Error al obtener mantenimiento:', error);
    res.status(500).json({ message: 'Error al obtener mantenimiento' });
  }
};

// CREAR MANTENIMIENTO
export const createMaintenance = (req: Request, res: Response): void => {
  try {
    const {
      carId,
      types,
      mechanic,
      startDate,
      endDate,
      status,
      items,
      notes
    } = req.body;

    // Validaciones
    if (!carId || !types || !mechanic || !startDate || !items || items.length === 0) {
      res.status(400).json({ message: 'Faltan campos requeridos' });
      return;
    }

    // Verificar que el auto existe
    const car = getOne<any>('SELECT * FROM cars WHERE id = ?', carId);
    if (!car) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Calcular el costo total
    const totalCost = items.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);

    // Convertir types a JSON
    const typesJSON = JSON.stringify(types);

    // Insertar el mantenimiento
    const result = db.prepare(`
      INSERT INTO maintenances (
        carId, types, mechanic, startDate, endDate, status, totalCost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      carId,
      typesJSON,
      mechanic,
      startDate,
      endDate || null,
      status || 'programado',
      totalCost,
      notes || null
    );

    const maintenanceId = result.lastInsertRowid;

    // Insertar los items
    const insertItem = db.prepare(`
      INSERT INTO maintenance_items (maintenanceId, category, description, cost)
      VALUES (?, ?, ?, ?)
    `);

    items.forEach((item: any) => {
      insertItem.run(maintenanceId, item.category, item.description, item.cost);
    });

    // Si el estado es 'en_proceso', actualizar el estado del auto a 'mantenimiento'
    if (status === 'en_proceso') {
      db.prepare(`
        UPDATE cars
        SET status = 'mantenimiento', updatedAt = datetime('now')
        WHERE id = ?
      `).run(carId);
    }

    // Obtener el mantenimiento completo
    const maintenance = getOne<any>(`
      SELECT
        m.*,
        c.id as carId,
        c.brand,
        c.model,
        c.year,
        c.licensePlate,
        c.image as carImage
      FROM maintenances m
      LEFT JOIN cars c ON m.carId = c.id
      WHERE m.id = ?
    `, maintenanceId);

    const maintenanceItems = db.prepare(`
      SELECT * FROM maintenance_items WHERE maintenanceId = ?
    `).all(maintenanceId);

    const maintenanceData = {
      id: maintenance.id,
      car: {
        id: maintenance.carId,
        brand: maintenance.brand,
        model: maintenance.model,
        year: maintenance.year,
        licensePlate: maintenance.licensePlate,
        image: maintenance.carImage
      },
      types: JSON.parse(maintenance.types),
      mechanic: maintenance.mechanic,
      startDate: maintenance.startDate,
      endDate: maintenance.endDate,
      status: maintenance.status,
      totalCost: maintenance.totalCost,
      notes: maintenance.notes,
      items: maintenanceItems,
      createdAt: maintenance.createdAt,
      updatedAt: maintenance.updatedAt
    };

    res.status(201).json({
      message: 'Mantenimiento creado exitosamente',
      maintenance: maintenanceData
    });
  } catch (error) {
    console.error('Error al crear mantenimiento:', error);
    res.status(500).json({ message: 'Error al crear mantenimiento' });
  }
};

// ACTUALIZAR MANTENIMIENTO
export const updateMaintenance = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const {
      carId,
      types,
      mechanic,
      startDate,
      endDate,
      status,
      items,
      notes
    } = req.body;

    // Verificar que el mantenimiento existe
    const existingMaintenance = getOne<any>('SELECT * FROM maintenances WHERE id = ?', id);
    if (!existingMaintenance) {
      res.status(404).json({ message: 'Mantenimiento no encontrado' });
      return;
    }

    // Calcular el costo total
    const totalCost = items.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);

    // Convertir types a JSON
    const typesJSON = JSON.stringify(types);

    // Actualizar el mantenimiento
    db.prepare(`
      UPDATE maintenances
      SET carId = ?, types = ?, mechanic = ?, startDate = ?, endDate = ?,
          status = ?, totalCost = ?, notes = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      carId,
      typesJSON,
      mechanic,
      startDate,
      endDate || null,
      status,
      totalCost,
      notes || null,
      id
    );

    // Eliminar items anteriores
    db.prepare('DELETE FROM maintenance_items WHERE maintenanceId = ?').run(id);

    // Insertar nuevos items
    const insertItem = db.prepare(`
      INSERT INTO maintenance_items (maintenanceId, category, description, cost)
      VALUES (?, ?, ?, ?)
    `);

    items.forEach((item: any) => {
      insertItem.run(id, item.category, item.description, item.cost);
    });

    // Actualizar estado del auto según el estado del mantenimiento
    if (status === 'en_proceso') {
      db.prepare(`
        UPDATE cars
        SET status = 'mantenimiento', updatedAt = datetime('now')
        WHERE id = ?
      `).run(carId);
    } else if (status === 'completado') {
      db.prepare(`
        UPDATE cars
        SET status = 'disponible', updatedAt = datetime('now')
        WHERE id = ?
      `).run(carId);
    }

    // Obtener el mantenimiento actualizado
    const maintenance = getOne<any>(`
      SELECT
        m.*,
        c.id as carId,
        c.brand,
        c.model,
        c.year,
        c.licensePlate,
        c.image as carImage
      FROM maintenances m
      LEFT JOIN cars c ON m.carId = c.id
      WHERE m.id = ?
    `, id);

    const maintenanceItems = db.prepare(`
      SELECT * FROM maintenance_items WHERE maintenanceId = ?
    `).all(id);

    const maintenanceData = {
      id: maintenance.id,
      car: {
        id: maintenance.carId,
        brand: maintenance.brand,
        model: maintenance.model,
        year: maintenance.year,
        licensePlate: maintenance.licensePlate,
        image: maintenance.carImage
      },
      types: JSON.parse(maintenance.types),
      mechanic: maintenance.mechanic,
      startDate: maintenance.startDate,
      endDate: maintenance.endDate,
      status: maintenance.status,
      totalCost: maintenance.totalCost,
      notes: maintenance.notes,
      items: maintenanceItems,
      createdAt: maintenance.createdAt,
      updatedAt: maintenance.updatedAt
    };

    res.json({
      message: 'Mantenimiento actualizado exitosamente',
      maintenance: maintenanceData
    });
  } catch (error) {
    console.error('Error al actualizar mantenimiento:', error);
    res.status(500).json({ message: 'Error al actualizar mantenimiento' });
  }
};

// ACTUALIZAR SOLO EL ESTADO DEL MANTENIMIENTO
export const updateMaintenanceStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: 'El estado es requerido' });
      return;
    }

    const maintenance = getOne<any>('SELECT * FROM maintenances WHERE id = ?', id);
    if (!maintenance) {
      res.status(404).json({ message: 'Mantenimiento no encontrado' });
      return;
    }

    // Actualizar estado del mantenimiento
    db.prepare(`
      UPDATE maintenances
      SET status = ?,
          endDate = CASE WHEN ? = 'completado' THEN datetime('now') ELSE endDate END,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(status, status, id);

    // Actualizar estado del auto
    if (status === 'en_proceso') {
      db.prepare(`
        UPDATE cars
        SET status = 'mantenimiento', updatedAt = datetime('now')
        WHERE id = ?
      `).run(maintenance.carId);
    } else if (status === 'completado') {
      db.prepare(`
        UPDATE cars
        SET status = 'disponible', updatedAt = datetime('now')
        WHERE id = ?
      `).run(maintenance.carId);
    }

    res.json({ message: 'Estado actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
};

// ELIMINAR MANTENIMIENTO
export const deleteMaintenance = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const maintenance = getOne<any>('SELECT * FROM maintenances WHERE id = ?', id);
    if (!maintenance) {
      res.status(404).json({ message: 'Mantenimiento no encontrado' });
      return;
    }

    // Eliminar items (se eliminan automáticamente por CASCADE)
    // Eliminar mantenimiento
    db.prepare('DELETE FROM maintenances WHERE id = ?').run(id);

    // Si el auto estaba en mantenimiento, ponerlo disponible
    db.prepare(`
      UPDATE cars
      SET status = 'disponible', updatedAt = datetime('now')
      WHERE id = ?
    `).run(maintenance.carId);

    res.json({ message: 'Mantenimiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error);
    res.status(500).json({ message: 'Error al eliminar mantenimiento' });
  }
};