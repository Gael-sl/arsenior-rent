export interface Reservation {
  id: number;
  userId: number;
  carId: number;
  car?: Car; // Populated from join
  user?: User; // Populated from join
  startDate: string;
  endDate: string;
  originalEndDate?: string; // Para extensiones
  plan: 'Regular' | 'Premium';
  totalDays: number;
  pricePerDay: number;
  subtotal: number;
  extras: ReservationExtra[];
  extrasTotal: number;
  totalAmount: number;
  depositAmount: number; // 30% del total
  depositPaid: boolean;
  depositPaidAt?: string;
  finalPaid: boolean;
  finalPaidAt?: string;
  qrCode?: string;
  status: 'pendiente' | 'confirmada' | 'activa' | 'completada' | 'cancelada' | 'extendida';
  pickupChecklist?: Checklist;
  returnChecklist?: Checklist;
  isEarlyReturn?: boolean; // NUEVA FEATURE
  earlyReturnDate?: string; // NUEVA FEATURE
  createdAt: string;
  updatedAt: string;
}

export interface ReservationExtra {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateReservationRequest {
  carId: number;
  startDate: string;
  endDate: string;
  plan: 'Regular' | 'Premium';
  extras: ReservationExtra[];
}

export interface ExtendReservationRequest {
  reservationId: number;
  newEndDate: string;
}

export interface EarlyReturnRequest {
  reservationId: number;
  earlyReturnDate: string;
  reason?: string;
}

export interface AlternativeReservationRequest {
  originalReservationId: number;
  newCarId: number;
  keepOriginalPrice: boolean;
}

// Importar Car y User
import { Car } from './car.model';
import { User } from './user.model';
import { Checklist } from './checklist.model';