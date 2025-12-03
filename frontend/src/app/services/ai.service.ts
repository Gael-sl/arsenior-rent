import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CarSpecsEngine {
  type: string;
  displacement: string;
  horsepower: string;
  torque: string;
}

export interface CarSpecsPerformance {
  topSpeed: string;
  acceleration: string;
  fuelConsumption: string;
}

export interface CarSpecsDimensions {
  trunkCapacity: string;
  fuelTankCapacity: string;
  weight: string;
}

export interface CarSpecsTechnology {
  infotainment: string[];
  safety: string[];
  comfort: string[];
}

export interface CarSpecs {
  engine: CarSpecsEngine;
  performance: CarSpecsPerformance;
  dimensions: CarSpecsDimensions;
  technology: CarSpecsTechnology;
  summary: string;
}

export interface CarSpecsResponse {
  success: boolean;
  data: CarSpecs;
  vehicle: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCarSpecs(brand: string, model: string, year: number): Observable<CarSpecsResponse> {
    return this.http.post<CarSpecsResponse>(`${this.apiUrl}/ai/car-specs`, {
      brand,
      model,
      year
    });
  }
}
