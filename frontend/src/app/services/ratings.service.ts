import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Rating, 
  CreateUserRatingRequest, 
  CreateAdminRatingRequest 
} from '../models/rating.model';

@Injectable({
  providedIn: 'root'
})
export class RatingsService {
  private apiUrl = `${environment.apiUrl}/ratings`;

  constructor(private http: HttpClient) {}

  // Usuario califica vehículo y servicio
  rateCarAndService(data: CreateUserRatingRequest): Observable<Rating> {
    return this.http.post<Rating>(`${this.apiUrl}/user-rating`, data);
  }

  // ADMIN: Calificar usuario
  rateUser(data: CreateAdminRatingRequest): Observable<Rating> {
    return this.http.post<Rating>(`${this.apiUrl}/admin-rating`, data);
  }

  // Obtener calificaciones de un carro
  getCarRatings(carId: number): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.apiUrl}/car/${carId}`);
  }

  // Obtener calificaciones de un usuario
  getUserRatings(userId: number): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Obtener calificación de una reserva
  getRatingByReservation(reservationId: number): Observable<Rating> {
    return this.http.get<Rating>(`${this.apiUrl}/reservation/${reservationId}`);
  }
}