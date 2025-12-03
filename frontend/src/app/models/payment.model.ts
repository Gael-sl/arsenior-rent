export interface Payment {
  id: number;
  reservationId: number;
  amount: number;
  type: 'deposit' | 'final' | 'extra';
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr';
  status: 'pendiente' | 'completado' | 'fallido';
  transactionId?: string;
  qrCode?: string;
  paidAt?: string;
  createdAt: string;
  // Datos relacionados
  startDate?: string;
  endDate?: string;
  reservationTotal?: number;
  reservationStatus?: string;
  car?: {
    brand: string;
    model: string;
    image: string;
    licensePlate: string;
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PaymentStats {
  totalPaid: number;
  pendingAmount: number;
  completedCount: number;
  pendingCount: number;
}

export interface PaymentsResponse {
  payments: Payment[];
  stats: PaymentStats;
}

export interface CreatePaymentRequest {
  reservationId: number;
  amount: number;
  type: 'deposit' | 'final' | 'extra';
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr';
  transactionId?: string;
}

export interface ConfirmPaymentRequest {
  paymentId: number;
  transactionId?: string;
}