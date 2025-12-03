import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Maintenance } from '../models/maintenance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private apiUrl = `${environment.apiUrl}/maintenance`;

  constructor(private http: HttpClient) {}

  getAllMaintenances(): Observable<Maintenance[]> {
    return this.http.get<Maintenance[]>(this.apiUrl);
  }

  getMaintenanceById(id: number): Observable<Maintenance> {
    return this.http.get<Maintenance>(`${this.apiUrl}/${id}`);
  }

  getMaintenancesByCar(carId: number): Observable<Maintenance[]> {
    return this.http.get<Maintenance[]>(`${this.apiUrl}/car/${carId}`);
  }

  createMaintenance(data: any): Observable<Maintenance> {
    return this.http.post<Maintenance>(this.apiUrl, data);
  }

  updateMaintenance(id: number, data: any): Observable<Maintenance> {
    return this.http.put<Maintenance>(`${this.apiUrl}/${id}`, data);
  }

  updateMaintenanceStatus(id: number, status: string): Observable<Maintenance> {
    return this.http.patch<Maintenance>(`${this.apiUrl}/${id}/status`, { status });
  }

  deleteMaintenance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}