export interface Checklist {
  id: number;
  reservationId: number;
  type: 'pickup' | 'return';
  inspector: string; // Nombre de quien inspecciona
  inspectorRole: 'user' | 'admin';
  
  // Items de inspección
  exteriorCondition: ChecklistItem;
  interiorCondition: ChecklistItem;
  tiresCondition: ChecklistItem;
  lightsCondition: ChecklistItem;
  mechanicalCondition: ChecklistItem;
  fuelLevel: number; // 0-100%
  
  // Daños reportados
  damages: Damage[];
  
  // Foto general del vehículo (NUEVA FEATURE)
  vehiclePhoto?: string; // URL o base64
  
  // Nombre de quien recibe (NUEVA FEATURE - solo en return)
  receivedBy?: string;
  receivedByRole?: 'admin';
  receivedAt?: string;
  
  // Cargos adicionales
  extraCharges: ExtraCharge[];
  totalExtraCharges: number;
  
  notes?: string;
  completedAt: string;
  createdAt: string;
}

export interface ChecklistItem {
  status: 'excelente' | 'bueno' | 'regular' | 'malo';
  notes?: string;
}

export interface Damage {
  id: number;
  location: string; // 'Puerta delantera izquierda', 'Parachoques trasero', etc.
  description: string;
  severity: 'leve' | 'moderado' | 'grave';
  photo?: string; // URL o base64 (NUEVA FEATURE - obligatoria para daños)
  estimatedCost?: number;
}

export interface ExtraCharge {
  id: number;
  concept: string;
  amount: number;
  reason: string;
}

export interface CreateChecklistRequest {
  reservationId: number;
  type: 'pickup' | 'return';
  inspector: string;
  exteriorCondition: ChecklistItem;
  interiorCondition: ChecklistItem;
  tiresCondition: ChecklistItem;
  lightsCondition: ChecklistItem;
  mechanicalCondition: ChecklistItem;
  fuelLevel: number;
  damages: Omit<Damage, 'id'>[];
  extraCharges: Omit<ExtraCharge, 'id'>[];
  vehiclePhoto?: string;
  receivedBy?: string;
  notes?: string;
}