import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  VehicleLocation, 
  ActiveRental, 
  UpdateLocationRequest 
} from '../models/tracking.model';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private apiUrl = `${environment.apiUrl}/tracking`;

  constructor(private http: HttpClient) {}

  // Actualizar ubicación GPS
  updateLocation(data: UpdateLocationRequest): Observable<VehicleLocation> {
    return this.http.post<VehicleLocation>(`${this.apiUrl}/update`, data);
  }

  // Obtener ubicación actual de un vehículo
  getCurrentLocation(carId: number): Observable<VehicleLocation> {
    return this.http.get<VehicleLocation>(`${this.apiUrl}/car/${carId}`);
  }

  // ADMIN: Obtener todas las rentas activas con ubicaciones
  getActiveRentals(): Observable<ActiveRental[]> {
    return this.http.get<ActiveRental[]>(`${this.apiUrl}/active-rentals`);
  }

  // Obtener historial de ubicaciones de una reserva
  getLocationHistory(reservationId: number): Observable<VehicleLocation[]> {
    return this.http.get<VehicleLocation[]>(`${this.apiUrl}/history/${reservationId}`);
  }

  // ADMIN: Simular movimiento de vehículos
  simulateMovement(): Observable<{ message: string; updated: number; timestamp: string }> {
    return this.http.post<{ message: string; updated: number; timestamp: string }>(
      `${this.apiUrl}/simulate-movement`,
      {}
    );
  }
}