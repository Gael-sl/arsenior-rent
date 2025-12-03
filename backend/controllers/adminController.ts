import { Request, Response } from 'express';
import db from '../config/db';

// OBTENER ESTADÍSTICAS DEL DASHBOARD
export const getDashboardStats = (req: Request, res: Response): void => {
  try {
    // Total de ingresos
    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(totalAmount), 0) as totalRevenue
      FROM reservations
      WHERE finalPaid = 1
    `).get() as any;

    // Total de reservas
    const reservationsResult = db.prepare(`
      SELECT COUNT(*) as totalReservations
      FROM reservations
    `).get() as any;

    // Rentas activas
    const activeRentalsResult = db.prepare(`
      SELECT COUNT(*) as activeRentals
      FROM reservations
      WHERE status = 'activa'
    `).get() as any;

    // Vehículos disponibles
    const availableVehiclesResult = db.prepare(`
      SELECT COUNT(*) as availableVehicles
      FROM cars
      WHERE status = 'disponible'
    `).get() as any;

    // Vehículos en mantenimiento
    const maintenanceVehiclesResult = db.prepare(`
      SELECT COUNT(*) as vehiclesInMaintenance
      FROM cars
      WHERE status = 'mantenimiento'
    `).get() as any;

    // Total de usuarios
    const usersResult = db.prepare(`
      SELECT COUNT(*) as totalUsers
      FROM users
      WHERE role = 'user'
    `).get() as any;

    // Rating promedio
    const avgRatingResult = db.prepare(`
      SELECT AVG(rating) as averageRating
      FROM cars
      WHERE totalRatings > 0
    `).get() as any;

    // Ingresos del mes actual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const revenueThisMonthResult = db.prepare(`
      SELECT COALESCE(SUM(totalAmount), 0) as revenueThisMonth
      FROM reservations
      WHERE finalPaid = 1
      AND strftime('%Y', createdAt) = ?
      AND strftime('%m', createdAt) = ?
    `).get(currentYear.toString(), currentMonth.toString().padStart(2, '0')) as any;

    // Ingresos del mes pasado
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const revenueLastMonthResult = db.prepare(`
      SELECT COALESCE(SUM(totalAmount), 0) as revenueLastMonth
      FROM reservations
      WHERE finalPaid = 1
      AND strftime('%Y', createdAt) = ?
      AND strftime('%m', createdAt) = ?
    `).get(lastMonthYear.toString(), lastMonth.toString().padStart(2, '0')) as any;

    // Crecimiento de ingresos
    const revenueThisMonth = revenueThisMonthResult.revenueThisMonth;
    const revenueLastMonth = revenueLastMonthResult.revenueLastMonth;
    const revenueGrowth = revenueLastMonth > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
      : 0;

    // Ingresos por mes (últimos 6 meses)
    const revenueByMonth = [];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;

      const monthRevenue = db.prepare(`
        SELECT 
          COALESCE(SUM(totalAmount), 0) as revenue,
          COUNT(*) as reservations
        FROM reservations
        WHERE finalPaid = 1
        AND strftime('%Y', createdAt) = ?
        AND strftime('%m', createdAt) = ?
      `).get(year.toString(), month.toString().padStart(2, '0')) as any;

      revenueByMonth.push({
        month: monthNames[month - 1],
        revenue: monthRevenue.revenue,
        reservations: monthRevenue.reservations
      });
    }

    // Reservas por segmento
    const reservationsBySegment = db.prepare(`
      SELECT 
        c.segment,
        COUNT(r.id) as count,
        COALESCE(SUM(r.totalAmount), 0) as revenue
      FROM cars c
      LEFT JOIN reservations r ON c.id = r.carId 
        AND r.status IN ('activa', 'completada', 'confirmada')
      GROUP BY c.segment
      HAVING count > 0
      ORDER BY c.segment
    `).all() as any[];

    const totalSegmentReservations = reservationsBySegment.reduce((sum, s) => sum + s.count, 0);

    const segmentStatsWithPercentage = reservationsBySegment.map(s => ({
      segment: s.segment,
      count: s.count,
      revenue: s.revenue,
      percentage: totalSegmentReservations > 0 ? (s.count / totalSegmentReservations) * 100 : 0
    }));

    // Top 5 vehículos mejor calificados
    const topRatedCars = db.prepare(`
      SELECT * FROM cars
      WHERE totalRatings > 0
      ORDER BY rating DESC, totalRatings DESC
      LIMIT 5
    `).all() as any[];

    // Top 5 usuarios mejor calificados
    const topRatedUsers = db.prepare(`
      SELECT 
        id, email, firstName, lastName, phone, role, rating, totalRentals
      FROM users
      WHERE role = 'user' AND totalRentals > 0
      ORDER BY rating DESC, totalRentals DESC
      LIMIT 5
    `).all() as any[];

    // Todos los usuarios (para gestión)
    const allUsers = db.prepare(`
      SELECT 
        id, email, firstName, lastName, phone, role, rating, totalRentals, emailVerified, createdAt
      FROM users
      ORDER BY createdAt DESC
    `).all() as any[];

    // Últimas 10 reservas
    const recentReservations = db.prepare(`
      SELECT 
        r.*,
        c.brand, c.model,
        u.firstName, u.lastName, u.email
      FROM reservations r
      JOIN cars c ON r.carId = c.id
      JOIN users u ON r.userId = u.id
      ORDER BY r.createdAt DESC
      LIMIT 10
    `).all() as any[];

    const recentReservationsFormatted = recentReservations.map(r => ({
      ...r,
      extras: JSON.parse(r.extras || '[]'),
      car: {
        id: r.carId,
        brand: r.brand,
        model: r.model
      },
      user: {
        id: r.userId,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email
      }
    }));

    const stats = {
      totalRevenue: revenueResult.totalRevenue,
      totalReservations: reservationsResult.totalReservations,
      activeRentals: activeRentalsResult.activeRentals,
      availableVehicles: availableVehiclesResult.availableVehicles,
      vehiclesInMaintenance: maintenanceVehiclesResult.vehiclesInMaintenance,
      totalUsers: usersResult.totalUsers,
      averageRating: avgRatingResult.averageRating || 0,
      revenueThisMonth: revenueThisMonth,
      revenueLastMonth: revenueLastMonth,
      revenueGrowth: revenueGrowth,
      revenueByMonth: revenueByMonth,
      reservationsBySegment: segmentStatsWithPercentage,
      topRatedCars: topRatedCars.map(car => ({
        ...car,
        features: JSON.parse(car.features || '[]')
      })),
      topRatedUsers: topRatedUsers,
      allUsers: allUsers,
      recentReservations: recentReservationsFormatted
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

// OBTENER TODOS LOS USUARIOS
export const getAllUsers = (req: Request, res: Response): void => {
  try {
    const users = db.prepare(`
      SELECT 
        id, email, firstName, lastName, phone, role, rating, totalRentals, createdAt
      FROM users
      ORDER BY createdAt DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// ACTUALIZAR ROL DE USUARIO
export const updateUserRole = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Rol inválido' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

    const updatedUser = db.prepare(`
      SELECT id, email, firstName, lastName, phone, role, rating, totalRentals
      FROM users WHERE id = ?
    `).get(userId);

    res.json({
      message: 'Rol actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

// ELIMINAR USUARIO
export const deleteUser = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ message: 'No se puede eliminar un usuario administrador' });
      return;
    }

    // Verificar que no tenga reservas activas
    const activeReservations = db.prepare(`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE userId = ? AND status IN ('confirmada', 'activa')
    `).get(userId) as any;

    if (activeReservations.count > 0) {
      res.status(400).json({ 
        message: 'No se puede eliminar. El usuario tiene reservas activas.' 
      });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// OBTENER MÉTRICAS ADICIONALES
export const getAdditionalMetrics = (req: Request, res: Response): void => {
  try {
    // Tasa de ocupación de vehículos
    const occupancyRate = db.prepare(`
      SELECT 
        COUNT(DISTINCT carId) as rentedCars,
        (SELECT COUNT(*) FROM cars WHERE status != 'mantenimiento') as totalCars
      FROM reservations
      WHERE status = 'activa'
    `).get() as any;

    const occupancyPercentage = occupancyRate.totalCars > 0 
      ? (occupancyRate.rentedCars / occupancyRate.totalCars) * 100 
      : 0;

    // Duración promedio de reservas
    const avgDuration = db.prepare(`
      SELECT AVG(totalDays) as avgDays
      FROM reservations
      WHERE status IN ('completada', 'activa')
    `).get() as any;

    // Plan más popular
    const popularPlan = db.prepare(`
      SELECT 
        plan,
        COUNT(*) as count
      FROM reservations
      GROUP BY plan
      ORDER BY count DESC
      LIMIT 1
    `).get() as any;

    // Vehículo más rentado
    const mostRentedCar = db.prepare(`
      SELECT 
        c.*,
        COUNT(r.id) as timesRented
      FROM cars c
      LEFT JOIN reservations r ON c.id = r.carId
      GROUP BY c.id
      ORDER BY timesRented DESC
      LIMIT 1
    `).get() as any;

    res.json({
      occupancyRate: occupancyPercentage,
      avgReservationDuration: avgDuration.avgDays || 0,
      popularPlan: popularPlan ? popularPlan.plan : 'N/A',
      mostRentedCar: mostRentedCar ? {
        ...mostRentedCar,
        features: JSON.parse(mostRentedCar.features || '[]')
      } : null
    });
  } catch (error) {
    console.error('Error al obtener métricas adicionales:', error);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
};