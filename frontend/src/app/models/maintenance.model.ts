import { Car } from './car.model';

export interface MaintenanceItem {
  id: number;
  category: string; // Aceite, Filtros, Frenos, etc.
  description: string;
  cost: number;
}

export interface Maintenance {
  id: number;
  car: Car;
  types: string[]; // Array de tipos de mantenimiento
  startDate: string;
  endDate?: string;
  mechanic: string;
  items: MaintenanceItem[];
  totalCost: number;
  status: 'en_proceso' | 'completado' | 'programado';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}