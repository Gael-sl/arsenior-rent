import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Car, CarFilters, CarAvailability } from '../models/car.model';

@Injectable({
  providedIn: 'root'
})
export class CarsService {
  private apiUrl = `${environment.apiUrl}/cars`;

  constructor(private http: HttpClient) {}

  // Obtener todos los carros (con filtros opcionales)
  getAllCars(filters?: CarFilters): Observable<Car[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.segment) params = params.set('segment', filters.segment);
      if (filters.transmission) params = params.set('transmission', filters.transmission);
      if (filters.minSeats) params = params.set('minSeats', filters.minSeats.toString());
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
    }
    
    return this.http.get<Car[]>(this.apiUrl, { params });
  }

  // Obtener un carro por ID
  getCarById(id: number): Observable<Car> {
    return this.http.get<Car>(`${this.apiUrl}/${id}`);
  }

  // Verificar disponibilidad
  checkAvailability(carId: number, startDate: string, endDate: string): Observable<CarAvailability> {
    return this.http.post<CarAvailability>(`${this.apiUrl}/check-availability`, {
      carId,
      startDate,
      endDate
    });
  }

  // ADMIN: Crear carro
  createCar(carData: Partial<Car>): Observable<Car> {
    return this.http.post<Car>(this.apiUrl, carData);
  }

  // ADMIN: Actualizar carro
  updateCar(id: number, carData: Partial<Car>): Observable<Car> {
    return this.http.put<Car>(`${this.apiUrl}/${id}`, carData);
  }

  // ADMIN: Eliminar carro
  deleteCar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ADMIN: Cambiar estado del carro
  updateCarStatus(id: number, status: 'disponible' | 'rentado' | 'mantenimiento'): Observable<Car> {
    return this.http.patch<Car>(`${this.apiUrl}/${id}/status`, { status });
  }

  // Obtener carros por segmento
  getCarsBySegment(segment: 'A' | 'B' | 'C'): Observable<Car[]> {
    return this.http.get<Car[]>(`${this.apiUrl}/segment/${segment}`);
  }

  // Buscar carros alternativos
  getAlternativeCars(carId: number, segment: string): Observable<Car[]> {
    return this.http.get<Car[]>(`${this.apiUrl}/alternatives`, {
      params: new HttpParams()
        .set('carId', carId.toString())
        .set('segment', segment)
    });
  }
}