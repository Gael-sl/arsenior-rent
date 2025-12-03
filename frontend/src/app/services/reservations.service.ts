import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Reservation, 
  CreateReservationRequest,
  ExtendReservationRequest,
  EarlyReturnRequest,
  AlternativeReservationRequest
} from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationsService {
  private apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  // Crear nueva reserva
  createReservation(data: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, data);
  }

  // Obtener mis reservas (usuario)
  getMyReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/my-reservations`);
  }

  // Obtener reserva por ID
  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  // ADMIN: Obtener todas las reservas
  getAllReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/admin/all`);
  }

  // ADMIN: Obtener reservas activas
  getActiveReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/admin/active`);
  }

  // Extender reserva
  extendReservation(data: ExtendReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/extend`, data);
  }

  // NUEVA FEATURE: Devolución anticipada
  earlyReturn(data: EarlyReturnRequest): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/early-return`, data);
  }

  // ADMIN: Crear reserva alternativa
  createAlternativeReservation(data: AlternativeReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/alternative`, data);
  }

  // Confirmar pago de depósito
  confirmDeposit(reservationId: number, qrCode: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/${reservationId}/confirm-deposit`, { qrCode });
  }

  // Confirmar pago final
  confirmFinalPayment(reservationId: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/${reservationId}/confirm-final`, {});
  }

  // ADMIN: Marcar como devuelto
  markAsReturned(reservationId: number): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.apiUrl}/${reservationId}/returned`, {});
  }

  // Cancelar reserva
  cancelReservation(reservationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reservationId}`);
  }
}