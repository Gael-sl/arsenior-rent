export interface Car {
  id: number;
  brand: string;
  model: string;
  year: number;
  segment: 'A' | 'B' | 'C'; // A=Premium, B=Standard, C=Basic
  transmission: 'Automatica' | 'Manual';
  fuelType: 'Gasolina' | 'Diesel' | 'Electrico' | 'Hibrido';
  seats: number;
  doors: number;
  luggage: number;
  image: string;
  gallery?: string[]; // URLs de fotos adicionales
  pricePerDay: number;
  status: 'disponible' | 'rentado' | 'mantenimiento';
  rating: number;
  totalRatings: number;
  features: string[]; // ['GPS', 'Bluetooth', 'A/C', etc.]
  description: string;
  licensePlate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarFilters {
  segment?: 'A' | 'B' | 'C';
  transmission?: 'Automática' | 'Manual';
  minSeats?: number;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
}

export interface CarAvailability {
  carId: number;
  available: boolean;
  alternativeCars?: Car[];
}