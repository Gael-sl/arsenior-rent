export interface VehicleLocation {
  id: number;
  carId: number;
  reservationId: number;
  latitude: number;
  longitude: number;
  speed?: number; // km/h
  heading?: number; // grados 0-360
  accuracy?: number; // metros
  timestamp: string;
  createdAt: string;
}

export interface ActiveRental {
  reservation: Reservation;
  car: Car;
  user: User;
  currentLocation?: VehicleLocation;
  lastUpdate?: string;
}

export interface UpdateLocationRequest {
  reservationId: number;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

// Importar modelos necesarios
import { Reservation } from './reservation.model';
import { Car } from './car.model';
import { User } from './user.model';