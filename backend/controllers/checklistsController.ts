import { Request, Response } from 'express';
import db from '../config/db';
import { getOne } from '../config/db-utils';

// CREAR CHECKLIST (Pickup o Return)
export const createChecklist = (req: Request, res: Response): void => {
  try {
    const {
      reservationId,
      type,
      inspector,
      exteriorCondition,
      interiorCondition,
      tiresCondition,
      lightsCondition,
      mechanicalCondition,
      fuelLevel,
      damages,
      vehiclePhoto, // NUEVA FEATURE
      receivedBy, // NUEVA FEATURE (solo en return)
      extraCharges,
      notes
    } = req.body;

    // Validaciones
    if (!reservationId || !type || !inspector) {
      res.status(400).json({ message: 'Faltan campos requeridos' });
      return;
    }

    // NUEVA FEATURE: Validar foto en devolución
    if (type === 'return' && !vehiclePhoto) {
      res.status(400).json({ message: 'La foto del vehículo es obligatoria en la devolución' });
      return;
    }

    // NUEVA FEATURE: Validar nombre de quien recibe en devolución
    if (type === 'return' && (!receivedBy || receivedBy.trim() === '')) {
      res.status(400).json({ message: 'El nombre de quien recibe es obligatorio en la devolución' });
      return;
    }

    // NUEVA FEATURE: Validar que los daños en return tengan foto
    if (type === 'return' && Array.isArray(damages) && damages.length > 0) {
      const damagesWithoutPhoto = damages.filter(d => !d.photo);
      if (damagesWithoutPhoto.length > 0) {
        res.status(400).json({ 
          message: 'Todos los daños en la devolución deben tener una foto adjunta' 
        });
        return;
      }
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Calcular total de cargos extras
    const extraChargesArray = Array.isArray(extraCharges) ? extraCharges : [];
    const totalExtraCharges = extraChargesArray.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0);

    // Datos para el checklist
    const damagesJSON = JSON.stringify(damages || []);
    const extraChargesJSON = JSON.stringify(extraChargesArray);

    const result = db.prepare(`
      INSERT INTO checklists (
        reservationId, type, inspector, inspectorRole,
        exteriorCondition, exteriorNotes,
        interiorCondition, interiorNotes,
        tiresCondition, lightsCondition, mechanicalCondition,
        fuelLevel, damages,
        vehiclePhoto, receivedBy, receivedByRole, receivedAt,
        extraCharges, totalExtraCharges, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reservationId,
      type,
      inspector,
      req.userRole || 'user',
      exteriorCondition.status,
      exteriorCondition.notes || null,
      interiorCondition.status,
      interiorCondition.notes || null,
      tiresCondition.status,
      lightsCondition.status,
      mechanicalCondition.status,
      fuelLevel,
      damagesJSON,
      vehiclePhoto || null,
      receivedBy || null,
      receivedBy ? 'admin' : null,
      receivedBy ? new Date().toISOString() : null,
      extraChargesJSON,
      totalExtraCharges,
      notes || null
    );

    // Si es checklist de pickup, actualizar estado de reserva a activa
    if (type === 'pickup') {
      db.prepare(`
        UPDATE reservations 
        SET status = 'activa',
            updatedAt = datetime('now')
        WHERE id = ?
      `).run(reservationId);

      // Cambiar estado del carro a rentado
      const reservationData = reservation as any;
      db.prepare("UPDATE cars SET status = 'rentado' WHERE id = ?").run(reservationData.carId);
    }

    // Si es checklist de return con cargos extras, actualizar el total de la reserva
    if (type === 'return' && totalExtraCharges > 0) {
      db.prepare(`
        UPDATE reservations 
        SET totalAmount = totalAmount + ?,
            updatedAt = datetime('now')
        WHERE id = ?
      `).run(totalExtraCharges, reservationId);
    }

    const checklist = getOne<any>('SELECT * FROM checklists WHERE id = ?', result.lastInsertRowid);

    res.status(201).json({
      message: 'Checklist creado exitosamente',
      checklist: {
        ...(checklist as any),
        damages: JSON.parse((checklist as any).damages || '[]'),
        extraCharges: JSON.parse((checklist as any).extraCharges || '[]')
      }
    });
  } catch (error) {
    console.error('Error al crear checklist:', error);
    res.status(500).json({ message: 'Error al crear checklist' });
  }
};

// OBTENER CHECKLIST POR RESERVA
export const getChecklistByReservation = (req: Request, res: Response): void => {
  try {
    const { reservationId, type } = req.params;

    const checklist = getOne<any>(`
      SELECT * FROM checklists 
      WHERE reservationId = ? AND type = ?
    `, reservationId, type);

    if (!checklist) {
      res.status(404).json({ message: 'Checklist no encontrado' });
      return;
    }

    res.json({
      ...(checklist as any),
      damages: JSON.parse((checklist as any).damages || '[]'),
      extraCharges: JSON.parse((checklist as any).extraCharges || '[]')
    });
  } catch (error) {
    console.error('Error al obtener checklist:', error);
    res.status(500).json({ message: 'Error al obtener checklist' });
  }
};

// SIMULAR SUBIDA DE FOTO (En producción, usarías AWS S3, Cloudinary, etc.)
export const uploadPhoto = (req: Request, res: Response): void => {
  try {
    // En un ambiente real, aquí subirías la foto a un servicio de almacenamiento
    // Por ahora, retornamos una URL simulada
    const photoUrl = `https://arseniorrent.com/uploads/photo_${Date.now()}.jpg`;
    
    res.json({ 
      message: 'Foto subida exitosamente',
      url: photoUrl 
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({ message: 'Error al subir foto' });
  }
};