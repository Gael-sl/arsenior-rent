export interface DashboardStats {
  totalRevenue: number;
  totalReservations: number;
  activeRentals: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  totalUsers: number;
  averageRating: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number; // porcentaje
  
  // Datos para gráficas
  revenueByMonth: MonthlyRevenue[];
  reservationsBySegment: SegmentStats[];
  topRatedCars: Car[];
  topRatedUsers: User[];
  allUsers: User[]; // Todos los usuarios para gestión
  recentReservations: Reservation[];
}

export interface MonthlyRevenue {
  month: string; // 'Enero', 'Febrero', etc.
  revenue: number;
  reservations: number;
}

export interface SegmentStats {
  segment: 'A' | 'B' | 'C';
  count: number;
  revenue: number;
  percentage: number;
}

// Importar modelos necesarios
import { Car } from './car.model';
import { User } from './user.model';
import { Reservation } from './reservation.model';