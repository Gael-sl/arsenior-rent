import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Checklist, CreateChecklistRequest } from '../models/checklist.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistsService {
  private apiUrl = `${environment.apiUrl}/checklists`;

  constructor(private http: HttpClient) {}

  // Crear checklist (pickup o return)
  createChecklist(data: CreateChecklistRequest): Observable<Checklist> {
    return this.http.post<Checklist>(this.apiUrl, data);
  }

  // Obtener checklist de una reserva
  getChecklistByReservation(reservationId: number, type: 'pickup' | 'return'): Observable<Checklist> {
    return this.http.get<Checklist>(`${this.apiUrl}/reservation/${reservationId}/${type}`);
  }

  // Subir foto del vehículo (NUEVA FEATURE)
  uploadVehiclePhoto(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload-photo`, formData);
  }

  // Subir foto de daño (NUEVA FEATURE)
  uploadDamagePhoto(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload-damage`, formData);
  }
}