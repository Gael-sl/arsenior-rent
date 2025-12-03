import { Request, Response } from 'express';
import db from '../config/db';
import { getOne, getAll } from '../config/db-utils';
import QRCode from 'qrcode';
import { createNotification } from './notificationsController';

interface Reservation {
  id: number;
  userId: number;
  carId: number;
  startDate: string;
  endDate: string;
  originalEndDate: string | null;
  plan: 'Regular' | 'Premium';
  totalDays: number;
  pricePerDay: number;
  subtotal: number;
  extras: string;
  extrasTotal: number;
  totalAmount: number;
  depositAmount: number;
  depositPaid: number;
  depositPaidAt: string | null;
  finalPaid: number;
  finalPaidAt: string | null;
  qrCode: string | null;
  status: string;
  isEarlyReturn: number;
  earlyReturnDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// CREAR RESERVA
export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { carId, startDate, endDate, plan, extras } = req.body;

    // Validaciones
    if (!carId || !startDate || !endDate || !plan) {
      res.status(400).json({ message: 'Faltan campos requeridos' });
      return;
    }

    // Verificar que el carro existe y está disponible
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId) as any;
    if (!car) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    if (car.status !== 'disponible') {
      res.status(400).json({ message: 'Vehículo no disponible' });
      return;
    }

    // Verificar conflictos de reserva
    const conflicts = getAll<any>(`
      SELECT * FROM reservations
      WHERE carId = ?
      AND status IN ('confirmada', 'activa')
      AND NOT (endDate < ? OR startDate > ?)
    `, carId, startDate, endDate);

    if (conflicts.length > 0) {
      res.status(400).json({ message: 'El vehículo ya está reservado en esas fechas' });
      return;
    }

    // Calcular días
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
      res.status(400).json({ message: 'Las fechas son inválidas' });
      return;
    }

    // Calcular precios
    let pricePerDay = car.pricePerDay;
    let subtotal = pricePerDay * totalDays;

    // Si es plan Premium, agregar 20%
    if (plan === 'Premium') {
      subtotal *= 1.2;
    }

    // Calcular extras
    const extrasArray = Array.isArray(extras) ? extras : [];
    let extrasTotal = 0;
    extrasArray.forEach((extra: any) => {
      extrasTotal += extra.price * (extra.quantity || 1);
    });

    const totalAmount = subtotal + extrasTotal;
    const depositAmount = totalAmount * 0.3; // 30% de anticipo

    // Generar código QR para el pago
    const qrData = `ARSENIOR-RENT-PAGO:${depositAmount.toFixed(2)}:${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    // Crear reserva
    const result = db.prepare(`
      INSERT INTO reservations (
        userId, carId, startDate, endDate, plan, totalDays, pricePerDay,
        subtotal, extras, extrasTotal, totalAmount, depositAmount, qrCode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `).run(
      userId, carId, startDate, endDate, plan, totalDays, pricePerDay,
      subtotal, JSON.stringify(extrasArray), extrasTotal, totalAmount, depositAmount, qrCode
    );

    const reservationId = result.lastInsertRowid as number;

    // Obtener la reserva con datos del carro y usuario
    const reservation = getOne<any>(`
      SELECT 
        r.*,
        c.brand, c.model, c.image, c.year,
        u.firstName, u.lastName, u.email
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      WHERE r.id = ?
    `, reservationId);

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservation: {
        ...(reservation as any),
        extras: JSON.parse((reservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ message: 'Error al crear reserva' });
  }
};

// OBTENER MIS RESERVAS (Usuario)
export const getMyReservations = (req: Request, res: Response): void => {
  try {
    const userId = req.userId!;

    const reservations = getAll<any>(`
      SELECT 
        r.*,
        c.brand, c.model, c.image, c.year, c.transmission, c.licensePlate
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      WHERE r.userId = ?
      ORDER BY r.createdAt DESC
    `, userId) as any[];

    const reservationsWithParsedExtras = reservations.map(r => ({
      ...r,
      extras: JSON.parse(r.extras || '[]'),
      car: {
        id: r.carId,
        brand: r.brand,
        model: r.model,
        image: r.image,
        year: r.year,
        transmission: r.transmission,
        licensePlate: r.licensePlate
      }
    }));

    res.json(reservationsWithParsedExtras);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener reservas' });
  }
};

// OBTENER RESERVA POR ID
export const getReservationById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const userRole = req.userRole!;

    const reservation = getOne<any>(`
      SELECT 
        r.*,
        c.brand, c.model, c.image, c.year, c.transmission, c.licensePlate,
        u.firstName, u.lastName, u.email, u.phone
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      WHERE r.id = ?
    `, id) as any;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Solo el usuario propietario o admin pueden ver la reserva
    if (userRole !== 'admin' && reservation.userId !== userId) {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    res.json({
      ...reservation,
      extras: JSON.parse(reservation.extras || '[]'),
      car: {
        id: reservation.carId,
        brand: reservation.brand,
        model: reservation.model,
        image: reservation.image,
        year: reservation.year,
        transmission: reservation.transmission,
        licensePlate: reservation.licensePlate
      },
      user: {
        id: reservation.userId,
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        email: reservation.email,
        phone: reservation.phone
      }
    });
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({ message: 'Error al obtener reserva' });
  }
};

// CONFIRMAR PAGO DE DEPÓSITO
export const confirmDeposit = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;
    const userId = req.userId!;

    const reservation = getOne<Reservation>(`SELECT * FROM reservations WHERE id = ?`, reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.userId !== userId && req.userRole !== 'admin') {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    if (reservation.depositPaid) {
      res.status(400).json({ message: 'El depósito ya fue pagado' });
      return;
    }

    db.prepare(`
      UPDATE reservations 
      SET depositPaid = 1, 
          depositPaidAt = datetime('now'),
          status = 'confirmada',
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(reservationId);

    // Registrar pago del anticipo en la tabla payments
    db.prepare(`
      INSERT INTO payments (reservationId, amount, type, method, status, paidAt)
      VALUES (?, ?, 'deposit', 'tarjeta', 'completado', datetime('now'))
    `).run(reservationId, reservation.depositAmount);

    // Obtener datos del carro para la notificacion
    const carInfo = getOne<any>(`
      SELECT c.brand, c.model FROM cars c 
      JOIN reservations r ON r.carId = c.id 
      WHERE r.id = ?
    `, reservationId) as any;

    // Crear notificacion de reserva confirmada
    createNotification(
      reservation.userId,
      'reservation_confirmed',
      'Reserva Confirmada',
      `Tu reserva del ${carInfo?.brand || ''} ${carInfo?.model || ''} ha sido confirmada. Fecha de recogida: ${reservation.startDate}`,
      parseInt(reservationId as string)
    );

    const updatedReservation = getOne<any>('SELECT * FROM reservations WHERE id = ?', reservationId);

    res.json({
      message: 'Depósito confirmado exitosamente',
      reservation: {
        ...(updatedReservation as any),
        extras: JSON.parse((updatedReservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error al confirmar depósito:', error);
    res.status(500).json({ message: 'Error al confirmar depósito' });
  }
};

// CONFIRMAR PAGO FINAL
export const confirmFinalPayment = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;

    const reservation = getOne<Reservation>('SELECT * FROM reservations WHERE id = ?', reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (!reservation.depositPaid) {
      res.status(400).json({ message: 'Debe pagar el depósito primero' });
      return;
    }

    if (reservation.finalPaid) {
      res.status(400).json({ message: 'El pago final ya fue realizado' });
      return;
    }

    db.prepare(`
      UPDATE reservations 
      SET finalPaid = 1, 
          finalPaidAt = datetime('now'),
          status = 'activa',
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(reservationId);

    // Registrar pago final en la tabla payments
    const remainingAmount = reservation.totalAmount - reservation.depositAmount;
    db.prepare(`
      INSERT INTO payments (reservationId, amount, type, method, status, paidAt)
      VALUES (?, ?, 'final', 'efectivo', 'completado', datetime('now'))
    `).run(reservationId, remainingAmount);

    // Actualizar estado del carro a rentado
    db.prepare("UPDATE cars SET status = 'rentado' WHERE id = ?").run(reservation.carId);

    const updatedReservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

    res.json({
      message: 'Pago final confirmado. ¡Disfruta tu viaje!',
      reservation: {
        ...(updatedReservation as any),
        extras: JSON.parse((updatedReservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error al confirmar pago final:', error);
    res.status(500).json({ message: 'Error al confirmar pago final' });
  }
};

// EXTENDER RESERVA
export const extendReservation = (req: Request, res: Response): void => {
  try {
    const { reservationId, newEndDate } = req.body;
    const userId = req.userId!;

    if (!reservationId || !newEndDate) {
      res.status(400).json({ message: 'Faltan parámetros requeridos' });
      return;
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.userId !== userId && req.userRole !== 'admin') {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    if (reservation.status !== 'activa') {
      res.status(400).json({ message: 'Solo se pueden extender reservas activas' });
      return;
    }

    const newEnd = new Date(newEndDate);
    const currentEnd = new Date(reservation.endDate);

    if (newEnd <= currentEnd) {
      res.status(400).json({ message: 'La nueva fecha debe ser posterior a la fecha actual de devolución' });
      return;
    }

    // Guardar fecha original si no existe
    const originalEndDate = reservation.originalEndDate || reservation.endDate;

    // Verificar que no haya conflictos con otras reservas
    const conflicts = getAll<any>(`
      SELECT * FROM reservations
      WHERE carId = ?
      AND id != ?
      AND status IN ('confirmada', 'activa')
      AND NOT (endDate < ? OR startDate > ?)
    `, reservation.carId, reservationId, reservation.endDate, newEndDate);

    if (conflicts.length > 0) {
      res.status(400).json({ 
        message: 'No se puede extender. Hay otra reserva para este vehículo.' 
      });
      return;
    }

    // Recalcular precios
    const start = new Date(reservation.startDate);
    const diffTime = Math.abs(newEnd.getTime() - start.getTime());
    const newTotalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let newSubtotal = reservation.pricePerDay * newTotalDays;
    if (reservation.plan === 'Premium') {
      newSubtotal *= 1.2;
    }

    const newTotalAmount = newSubtotal + reservation.extrasTotal;

    db.prepare(`
      UPDATE reservations 
      SET endDate = ?,
          originalEndDate = ?,
          totalDays = ?,
          subtotal = ?,
          totalAmount = ?,
          status = 'extendida',
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(newEndDate, originalEndDate, newTotalDays, newSubtotal, newTotalAmount, reservationId);

    const updatedReservation = getOne<any>('SELECT * FROM reservations WHERE id = ?', reservationId);

    res.json({
      message: 'Reserva extendida exitosamente',
      reservation: {
        ...(updatedReservation as any),
        extras: JSON.parse((updatedReservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error al extender reserva:', error);
    res.status(500).json({ message: 'Error al extender reserva' });
  }
};

// NUEVA FEATURE: Devolución Anticipada
export const earlyReturn = (req: Request, res: Response): void => {
  try {
    const { reservationId, earlyReturnDate, reason } = req.body;
    const userId = req.userId!;

    if (!reservationId || !earlyReturnDate) {
      res.status(400).json({ message: 'Faltan parámetros requeridos' });
      return;
    }

    const reservation = getOne<Reservation>('SELECT * FROM reservations WHERE id = ?', reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.userId !== userId && req.userRole !== 'admin') {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    if (reservation.status !== 'activa') {
      res.status(400).json({ message: 'Solo se pueden devolver anticipadamente reservas activas' });
      return;
    }

    const earlyDate = new Date(earlyReturnDate);
    const originalEnd = new Date(reservation.endDate);
    const start = new Date(reservation.startDate);

    if (earlyDate >= originalEnd) {
      res.status(400).json({ message: 'La fecha debe ser anterior a la fecha original de devolución' });
      return;
    }

    if (earlyDate <= start) {
      res.status(400).json({ message: 'La fecha debe ser posterior a la fecha de inicio' });
      return;
    }

    // Recalcular precios con los días reales
    const diffTime = Math.abs(earlyDate.getTime() - start.getTime());
    const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let newSubtotal = reservation.pricePerDay * actualDays;
    if (reservation.plan === 'Premium') {
      newSubtotal *= 1.2;
    }

    const newTotalAmount = newSubtotal + reservation.extrasTotal;
    const refundAmount = reservation.totalAmount - newTotalAmount;

    db.prepare(`
      UPDATE reservations 
      SET endDate = ?,
          totalDays = ?,
          subtotal = ?,
          totalAmount = ?,
          isEarlyReturn = 1,
          earlyReturnDate = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(earlyReturnDate, actualDays, newSubtotal, newTotalAmount, earlyReturnDate, reservationId);

    const updatedReservation = getOne<any>('SELECT * FROM reservations WHERE id = ?', reservationId);

    res.json({
      message: 'Devolución anticipada confirmada',
      refundAmount: refundAmount,
      reservation: {
        ...(updatedReservation as any),
        extras: JSON.parse((updatedReservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error en devolución anticipada:', error);
    res.status(500).json({ message: 'Error en devolución anticipada' });
  }
};

// CREAR RESERVA ALTERNATIVA (Admin)
export const createAlternativeReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalReservationId, newCarId, keepOriginalPrice } = req.body;

    if (!originalReservationId || !newCarId) {
      res.status(400).json({ message: 'Faltan parámetros requeridos' });
      return;
    }

    const originalReservation = getOne<Reservation>('SELECT * FROM reservations WHERE id = ?', originalReservationId) as Reservation | undefined;

    if (!originalReservation) {
      res.status(404).json({ message: 'Reserva original no encontrada' });
      return;
    }

    const newCar = getOne<any>('SELECT * FROM cars WHERE id = ?', newCarId) as any;

    if (!newCar) {
      res.status(404).json({ message: 'Vehículo alternativo no encontrado' });
      return;
    }

    // Verificar que el nuevo carro sea del mismo segmento o superior
    const segmentOrder: any = { 'A': 1, 'B': 2, 'C': 3 };
    const originalCar = getOne<any>('SELECT segment FROM cars WHERE id = ?', originalReservation.carId) as any;
    
    if (segmentOrder[newCar.segment] > segmentOrder[originalCar.segment]) {
      res.status(400).json({ 
        message: 'El vehículo alternativo debe ser del mismo segmento o superior' 
      });
      return;
    }

    // Usar el precio original si keepOriginalPrice es true
    const pricePerDay = keepOriginalPrice ? originalReservation.pricePerDay : newCar.pricePerDay;
    
    let subtotal = pricePerDay * originalReservation.totalDays;
    if (originalReservation.plan === 'Premium') {
      subtotal *= 1.2;
    }

    const totalAmount = subtotal + originalReservation.extrasTotal;
    const depositAmount = totalAmount * 0.3;

    // Generar nuevo QR
    const qrData = `ARSENIOR-RENT-PAGO-ALT:${depositAmount.toFixed(2)}:${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    // Crear nueva reserva
    const result = db.prepare(`
      INSERT INTO reservations (
        userId, carId, startDate, endDate, plan, totalDays, pricePerDay,
        subtotal, extras, extrasTotal, totalAmount, depositAmount, qrCode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `).run(
      originalReservation.userId,
      newCarId,
      originalReservation.startDate,
      originalReservation.endDate,
      originalReservation.plan,
      originalReservation.totalDays,
      pricePerDay,
      subtotal,
      originalReservation.extras,
      originalReservation.extrasTotal,
      totalAmount,
      depositAmount,
      qrCode
    );

    // Cancelar la reserva original
    db.prepare("UPDATE reservations SET status = 'cancelada' WHERE id = ?").run(originalReservationId);

    const newReservation = getOne<any>('SELECT * FROM reservations WHERE id = ?', result.lastInsertRowid);

    res.status(201).json({
      message: 'Reserva alternativa creada exitosamente',
      originalPrice: originalReservation.totalAmount,
      newPrice: totalAmount,
      priceDifference: totalAmount - originalReservation.totalAmount,
      reservation: {
        ...(newReservation as any),
        extras: JSON.parse((newReservation as any).extras || '[]')
      }
    });
  } catch (error) {
    console.error('Error al crear reserva alternativa:', error);
    res.status(500).json({ message: 'Error al crear reserva alternativa' });
  }
};

// ADMIN: Obtener todas las reservas
export const getAllReservations = (req: Request, res: Response): void => {
  try {
    const reservations = getAll<any>(`
      SELECT 
        r.*,
        c.brand, c.model, c.image, c.licensePlate,
        u.firstName, u.lastName, u.email, u.phone
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      ORDER BY r.createdAt DESC
    `) as any[];

    const reservationsWithParsedData = reservations.map(r => ({
      ...r,
      extras: JSON.parse(r.extras || '[]'),
      car: {
        id: r.carId,
        brand: r.brand,
        model: r.model,
        image: r.image,
        licensePlate: r.licensePlate
      },
      user: {
        id: r.userId,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone
      }
    }));

    res.json(reservationsWithParsedData);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener reservas' });
  }
};

// ADMIN: Obtener reservas activas
export const getActiveReservations = (req: Request, res: Response): void => {
  try {
    const reservations = getAll<any>(`
      SELECT 
        r.*,
        c.brand, c.model, c.image, c.licensePlate,
        u.firstName, u.lastName, u.email, u.phone
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      WHERE r.status = 'activa'
      ORDER BY r.endDate ASC
    `) as any[];

    const reservationsWithParsedData = reservations.map(r => ({
      ...r,
      extras: JSON.parse(r.extras || '[]'),
      car: {
        id: r.carId,
        brand: r.brand,
        model: r.model,
        image: r.image,
        licensePlate: r.licensePlate
      },
      user: {
        id: r.userId,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone
      }
    }));

    res.json(reservationsWithParsedData);
  } catch (error) {
    console.error('Error al obtener reservas activas:', error);
    res.status(500).json({ message: 'Error al obtener reservas activas' });
  }
};

// ADMIN: Marcar como devuelto
export const markAsReturned = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;

    const reservation = getOne<Reservation>('SELECT * FROM reservations WHERE id = ?', reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    db.prepare(`
      UPDATE reservations 
      SET status = 'completada',
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(reservationId);

    // Actualizar estado del carro a disponible
    db.prepare("UPDATE cars SET status = 'disponible' WHERE id = ?").run(reservation.carId);

    // Incrementar contador de rentas del usuario
    db.prepare("UPDATE users SET totalRentals = totalRentals + 1 WHERE id = ?").run(reservation.userId);

    // Obtener datos del carro para la notificacion
    const carInfo = getOne<any>('SELECT brand, model FROM cars WHERE id = ?', reservation.carId) as any;

    // Crear notificacion para solicitar rating
    createNotification(
      reservation.userId,
      'rating_request',
      'Califica tu experiencia',
      `Tu renta del ${carInfo?.brand || ''} ${carInfo?.model || ''} ha finalizado. Cuentanos como fue tu experiencia.`,
      parseInt(reservationId as string)
    );

    res.json({ message: 'Vehiculo marcado como devuelto exitosamente' });
  } catch (error) {
    console.error('Error al marcar como devuelto:', error);
    res.status(500).json({ message: 'Error al marcar como devuelto' });
  }
};

// Cancelar reserva
export const cancelReservation = (req: Request, res: Response): void => {
  try {
    const { reservationId } = req.params;
    const userId = req.userId!;

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId) as Reservation | undefined;

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.userId !== userId && req.userRole !== 'admin') {
      res.status(403).json({ message: 'No autorizado' });
      return;
    }

    if (!['pendiente', 'confirmada'].includes(reservation.status)) {
      res.status(400).json({ message: 'Solo se pueden cancelar reservas pendientes o confirmadas' });
      return;
    }

    db.prepare("UPDATE reservations SET status = 'cancelada', updatedAt = datetime('now') WHERE id = ?").run(reservationId);

    // Obtener datos del carro para la notificacion
    const carInfo = getOne<any>('SELECT brand, model FROM cars WHERE id = ?', reservation.carId) as any;

    // Crear notificacion de cancelacion
    createNotification(
      reservation.userId,
      'reservation_cancelled',
      'Reserva Cancelada',
      `Tu reserva del ${carInfo?.brand || ''} ${carInfo?.model || ''} ha sido cancelada.`,
      parseInt(reservationId as string)
    );

    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ message: 'Error al cancelar reserva' });
  }
};