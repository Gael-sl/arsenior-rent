import { Request, Response } from 'express';
import db from '../config/db';
import { sendReminderEmail } from '../config/mail';

// Tipos
interface Notification {
  id: number;
  userId: number;
  reservationId: number | null;
  type: string;
  title: string;
  message: string;
  isRead: number;
  emailSent: number;
  emailSentAt: string | null;
  createdAt: string;
}

interface NotificationWithDetails extends Notification {
  carBrand?: string;
  carModel?: string;
  startDate?: string;
  endDate?: string;
}

// Obtener notificaciones del usuario
export const getUserNotifications = (req: Request, res: Response): void => {
  try {
    const userId = (req as any).userId;
    const { unreadOnly } = req.query;

    let query = `
      SELECT 
        n.*,
        c.brand as carBrand,
        c.model as carModel,
        r.startDate,
        r.endDate
      FROM notifications n
      LEFT JOIN reservations r ON n.reservationId = r.id
      LEFT JOIN cars c ON r.carId = c.id
      WHERE n.userId = ?
    `;

    if (unreadOnly === 'true') {
      query += ' AND n.isRead = 0';
    }

    query += ' ORDER BY n.createdAt DESC LIMIT 50';

    const notifications = db.prepare(query).all(userId) as NotificationWithDetails[];

    // Contar no leídas
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0
    `).get(userId) as { count: number };

    res.json({
      notifications,
      unreadCount: unreadCount.count
    });
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
  }
};

// Marcar notificacion como leida
export const markAsRead = (req: Request, res: Response): void => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = db.prepare(`
      UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?
    `).run(id, userId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Notificacion no encontrada' });
      return;
    }

    res.json({ message: 'Notificacion marcada como leida' });
  } catch (error: any) {
    console.error('Error al marcar notificacion:', error);
    res.status(500).json({ message: 'Error al marcar notificacion', error: error.message });
  }
};

// Marcar todas como leidas
export const markAllAsRead = (req: Request, res: Response): void => {
  try {
    const userId = (req as any).userId;

    db.prepare(`
      UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0
    `).run(userId);

    res.json({ message: 'Todas las notificaciones marcadas como leidas' });
  } catch (error: any) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ message: 'Error al marcar notificaciones', error: error.message });
  }
};

// Eliminar notificacion
export const deleteNotification = (req: Request, res: Response): void => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = db.prepare(`
      DELETE FROM notifications WHERE id = ? AND userId = ?
    `).run(id, userId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Notificacion no encontrada' });
      return;
    }

    res.json({ message: 'Notificacion eliminada' });
  } catch (error: any) {
    console.error('Error al eliminar notificacion:', error);
    res.status(500).json({ message: 'Error al eliminar notificacion', error: error.message });
  }
};

// Crear notificacion (uso interno)
export const createNotification = (
  userId: number,
  type: string,
  title: string,
  message: string,
  reservationId?: number
): number => {
  const result = db.prepare(`
    INSERT INTO notifications (userId, reservationId, type, title, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, reservationId || null, type, title, message);

  return result.lastInsertRowid as number;
};

// Procesar recordatorios (llamado por cron job o manualmente)
export const processReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let remindersCreated = 0;
    let emailsSent = 0;

    // Recordatorios de recogida (dia anterior)
    const upcomingPickups = db.prepare(`
      SELECT 
        r.id as reservationId,
        r.startDate,
        r.endDate,
        r.totalAmount,
        u.id as userId,
        u.email,
        u.firstName,
        c.brand,
        c.model
      FROM reservations r
      JOIN users u ON r.userId = u.id
      JOIN cars c ON r.carId = c.id
      WHERE r.status = 'confirmada'
        AND DATE(r.startDate) = ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.reservationId = r.id 
            AND n.type = 'reminder_pickup'
            AND DATE(n.createdAt) = ?
        )
    `).all(tomorrowStr, todayStr) as any[];

    for (const pickup of upcomingPickups) {
      const title = 'Recordatorio: Recogida manana';
      const message = `Tu reserva del ${pickup.brand} ${pickup.model} comienza manana ${pickup.startDate}. No olvides llevar tu identificacion.`;
      
      createNotification(pickup.userId, 'reminder_pickup', title, message, pickup.reservationId);
      remindersCreated++;

      // Enviar email
      const emailSent = await sendReminderEmail(
        pickup.email,
        pickup.firstName,
        'pickup',
        pickup.brand,
        pickup.model,
        pickup.startDate,
        pickup.reservationId
      );

      if (emailSent) {
        db.prepare(`
          UPDATE notifications 
          SET emailSent = 1, emailSentAt = datetime('now')
          WHERE reservationId = ? AND type = 'reminder_pickup'
        `).run(pickup.reservationId);
        emailsSent++;
      }
    }

    // Recordatorios de recogida (mismo dia)
    const todayPickups = db.prepare(`
      SELECT 
        r.id as reservationId,
        r.startDate,
        u.id as userId,
        u.email,
        u.firstName,
        c.brand,
        c.model
      FROM reservations r
      JOIN users u ON r.userId = u.id
      JOIN cars c ON r.carId = c.id
      WHERE r.status = 'confirmada'
        AND DATE(r.startDate) = ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.reservationId = r.id 
            AND n.type = 'reminder_pickup'
            AND n.message LIKE '%hoy%'
        )
    `).all(todayStr) as any[];

    for (const pickup of todayPickups) {
      const title = 'Tu reserva es HOY';
      const message = `Hoy recoges tu ${pickup.brand} ${pickup.model}. Te esperamos con las llaves listas.`;
      
      createNotification(pickup.userId, 'reminder_pickup', title, message, pickup.reservationId);
      remindersCreated++;
    }

    // Recordatorios de devolucion (dia anterior)
    const upcomingReturns = db.prepare(`
      SELECT 
        r.id as reservationId,
        r.endDate,
        u.id as userId,
        u.email,
        u.firstName,
        c.brand,
        c.model
      FROM reservations r
      JOIN users u ON r.userId = u.id
      JOIN cars c ON r.carId = c.id
      WHERE r.status = 'activa'
        AND DATE(r.endDate) = ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.reservationId = r.id 
            AND n.type = 'reminder_return'
            AND DATE(n.createdAt) = ?
        )
    `).all(tomorrowStr, todayStr) as any[];

    for (const returnItem of upcomingReturns) {
      const title = 'Recordatorio: Devolucion manana';
      const message = `Tu renta del ${returnItem.brand} ${returnItem.model} finaliza manana ${returnItem.endDate}. Recuerda devolverlo con el tanque lleno.`;
      
      createNotification(returnItem.userId, 'reminder_return', title, message, returnItem.reservationId);
      remindersCreated++;

      // Enviar email
      const emailSent = await sendReminderEmail(
        returnItem.email,
        returnItem.firstName,
        'return',
        returnItem.brand,
        returnItem.model,
        returnItem.endDate,
        returnItem.reservationId
      );

      if (emailSent) {
        db.prepare(`
          UPDATE notifications 
          SET emailSent = 1, emailSentAt = datetime('now')
          WHERE reservationId = ? AND type = 'reminder_return' AND DATE(createdAt) = ?
        `).run(returnItem.reservationId, todayStr);
        emailsSent++;
      }
    }

    // Recordatorios de devolucion (mismo dia)
    const todayReturns = db.prepare(`
      SELECT 
        r.id as reservationId,
        r.endDate,
        u.id as userId,
        c.brand,
        c.model
      FROM reservations r
      JOIN users u ON r.userId = u.id
      JOIN cars c ON r.carId = c.id
      WHERE r.status = 'activa'
        AND DATE(r.endDate) = ?
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.reservationId = r.id 
            AND n.type = 'reminder_return'
            AND n.message LIKE '%hoy%'
        )
    `).all(todayStr) as any[];

    for (const returnItem of todayReturns) {
      const title = 'Devolucion HOY';
      const message = `Hoy debes devolver tu ${returnItem.brand} ${returnItem.model}. Asegurate de que este en buenas condiciones.`;
      
      createNotification(returnItem.userId, 'reminder_return', title, message, returnItem.reservationId);
      remindersCreated++;
    }

    res.json({
      message: 'Recordatorios procesados',
      remindersCreated,
      emailsSent,
      processed: {
        pickupsTomorrow: upcomingPickups.length,
        pickupsToday: todayPickups.length,
        returnsTomorrow: upcomingReturns.length,
        returnsToday: todayReturns.length
      }
    });
  } catch (error: any) {
    console.error('Error al procesar recordatorios:', error);
    res.status(500).json({ message: 'Error al procesar recordatorios', error: error.message });
  }
};

// Obtener conteo de notificaciones no leidas
export const getUnreadCount = (req: Request, res: Response): void => {
  try {
    const userId = (req as any).userId;

    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0
    `).get(userId) as { count: number };

    res.json({ count: result.count });
  } catch (error: any) {
    console.error('Error al contar notificaciones:', error);
    res.status(500).json({ message: 'Error al contar notificaciones', error: error.message });
  }
};
