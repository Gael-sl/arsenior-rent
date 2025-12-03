import { Request, Response } from 'express';
import db from '../config/db';
import { getOne, getAll } from '../config/db-utils';
import { createNotification } from './notificationsController';

interface Payment {
  id: number;
  reservationId: number;
  amount: number;
  type: 'deposit' | 'final' | 'extra';
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr';
  status: 'pendiente' | 'completado' | 'fallido';
  transactionId: string | null;
  qrCode: string | null;
  paidAt: string | null;
  createdAt: string;
}

// Obtener historial de pagos del usuario
export const getUserPayments = (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;

    const payments = getAll<any>(`
      SELECT 
        p.*,
        r.startDate,
        r.endDate,
        r.totalAmount as reservationTotal,
        r.status as reservationStatus,
        c.brand,
        c.model,
        c.image,
        c.licensePlate
      FROM payments p
      JOIN reservations r ON p.reservationId = r.id
      JOIN cars c ON r.carId = c.id
      WHERE r.userId = ?
      ORDER BY p.createdAt DESC
    `, userId);

    // Calcular estadisticas
    const stats = {
      totalPaid: 0,
      pendingAmount: 0,
      completedCount: 0,
      pendingCount: 0
    };

    payments.forEach((p: any) => {
      if (p.status === 'completado') {
        stats.totalPaid += p.amount;
        stats.completedCount++;
      } else if (p.status === 'pendiente') {
        stats.pendingAmount += p.amount;
        stats.pendingCount++;
      }
    });

    res.json({
      payments: payments.map((p: any) => ({
        ...p,
        car: {
          brand: p.brand,
          model: p.model,
          image: p.image,
          licensePlate: p.licensePlate
        }
      })),
      stats
    });
  } catch (error: any) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
  }
};

// Obtener pagos de una reserva especifica
export const getReservationPayments = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;
    const userId = req.userId!;
    const userRole = req.userRole;

    // Verificar que la reserva pertenece al usuario o es admin
    const reservation = getOne<any>('SELECT userId FROM reservations WHERE id = ?', reservationId);
    
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (userRole !== 'admin' && reservation.userId !== userId) {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    const payments = getAll<Payment>(`
      SELECT * FROM payments 
      WHERE reservationId = ? 
      ORDER BY createdAt DESC
    `, reservationId);

    res.json(payments);
  } catch (error: any) {
    console.error('Error al obtener pagos de reserva:', error);
    res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
  }
};

// Registrar pago (Admin)
export const registerPayment = (req: Request, res: Response): void => {
  try {
    const { reservationId, amount, type, method, transactionId } = req.body;

    if (!reservationId || !amount || !type || !method) {
      res.status(400).json({ message: 'Faltan campos requeridos' });
      return;
    }

    // Verificar reserva existe
    const reservation = getOne<any>('SELECT * FROM reservations WHERE id = ?', reservationId);
    
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Insertar pago
    const result = db.prepare(`
      INSERT INTO payments (reservationId, amount, type, method, transactionId, status, paidAt)
      VALUES (?, ?, ?, ?, ?, 'completado', datetime('now'))
    `).run(reservationId, amount, type, method, transactionId || null);

    // Actualizar estado de la reserva segun tipo de pago
    if (type === 'deposit') {
      db.prepare(`
        UPDATE reservations 
        SET depositPaid = 1, depositPaidAt = datetime('now'), status = 'confirmada'
        WHERE id = ?
      `).run(reservationId);
    } else if (type === 'final') {
      db.prepare(`
        UPDATE reservations 
        SET finalPaid = 1, finalPaidAt = datetime('now'), status = 'activa'
        WHERE id = ?
        AND depositPaid = 1
      `).run(reservationId);

      // Actualizar carro a rentado
      db.prepare("UPDATE cars SET status = 'rentado' WHERE id = ?").run(reservation.carId);
    }

    // Obtener datos del carro para notificacion
    const carInfo = getOne<any>('SELECT brand, model FROM cars WHERE id = ?', reservation.carId) as any;

    // Crear notificacion de pago recibido
    createNotification(
      reservation.userId,
      'payment_received',
      'Pago Recibido',
      `Se registro tu pago de $${amount.toLocaleString()} MXN para el ${carInfo?.brand || ''} ${carInfo?.model || ''}.`,
      reservationId
    );

    const payment = getOne<Payment>('SELECT * FROM payments WHERE id = ?', result.lastInsertRowid);

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      payment
    });
  } catch (error: any) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago', error: error.message });
  }
};

// Obtener todos los pagos (Admin)
export const getAllPayments = (req: Request, res: Response): void => {
  try {
    const { status, type, startDate, endDate } = req.query;

    let query = `
      SELECT 
        p.*,
        r.startDate as rentalStart,
        r.endDate as rentalEnd,
        r.status as reservationStatus,
        c.brand,
        c.model,
        c.licensePlate,
        u.firstName,
        u.lastName,
        u.email
      FROM payments p
      JOIN reservations r ON p.reservationId = r.id
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND p.type = ?';
      params.push(type);
    }

    if (startDate) {
      query += ' AND DATE(p.createdAt) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(p.createdAt) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY p.createdAt DESC';

    const payments = db.prepare(query).all(...params);

    // Calcular totales
    const totals = {
      totalAmount: 0,
      depositTotal: 0,
      finalTotal: 0,
      extraTotal: 0,
      completed: 0,
      pending: 0
    };

    (payments as any[]).forEach(p => {
      if (p.status === 'completado') {
        totals.totalAmount += p.amount;
        totals.completed++;
        if (p.type === 'deposit') totals.depositTotal += p.amount;
        else if (p.type === 'final') totals.finalTotal += p.amount;
        else if (p.type === 'extra') totals.extraTotal += p.amount;
      } else if (p.status === 'pendiente') {
        totals.pending++;
      }
    });

    res.json({
      payments: (payments as any[]).map(p => ({
        ...p,
        car: { brand: p.brand, model: p.model, licensePlate: p.licensePlate },
        user: { firstName: p.firstName, lastName: p.lastName, email: p.email }
      })),
      totals
    });
  } catch (error: any) {
    console.error('Error al obtener todos los pagos:', error);
    res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
  }
};

// Actualizar estado de pago (Admin)
export const updatePaymentStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;

    if (!status) {
      res.status(400).json({ message: 'Estado requerido' });
      return;
    }

    const payment = getOne<Payment>('SELECT * FROM payments WHERE id = ?', id);

    if (!payment) {
      res.status(404).json({ message: 'Pago no encontrado' });
      return;
    }

    db.prepare(`
      UPDATE payments 
      SET status = ?, 
          transactionId = COALESCE(?, transactionId),
          paidAt = CASE WHEN ? = 'completado' THEN datetime('now') ELSE paidAt END
      WHERE id = ?
    `).run(status, transactionId || null, status, id);

    const updatedPayment = getOne<Payment>('SELECT * FROM payments WHERE id = ?', id);

    res.json({
      message: 'Estado de pago actualizado',
      payment: updatedPayment
    });
  } catch (error: any) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({ message: 'Error al actualizar pago', error: error.message });
  }
};
