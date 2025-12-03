import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Payment, PaymentsResponse, PaymentStats, CreatePaymentRequest } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private apiUrl = `${environment.apiUrl}/payments`;

  // Signals para estado reactivo
  payments = signal<Payment[]>([]);
  stats = signal<PaymentStats | null>(null);
  loading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  // Obtener pagos del usuario
  getMyPayments(): Observable<PaymentsResponse> {
    this.loading.set(true);
    return this.http.get<PaymentsResponse>(`${this.apiUrl}/my-payments`)
      .pipe(
        tap(response => {
          this.payments.set(response.payments);
          this.stats.set(response.stats);
          this.loading.set(false);
        })
      );
  }

  // Obtener pagos de una reserva
  getReservationPayments(reservationId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/reservation/${reservationId}`);
  }

  // Admin: Obtener todos los pagos
  getAllPayments(filters?: {
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    let params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    return this.http.get<any>(`${this.apiUrl}/all${queryString ? '?' + queryString : ''}`);
  }

  // Admin: Registrar pago
  registerPayment(data: CreatePaymentRequest): Observable<{ message: string; payment: Payment }> {
    return this.http.post<{ message: string; payment: Payment }>(`${this.apiUrl}/register`, data);
  }

  // Admin: Actualizar estado de pago
  updatePaymentStatus(id: number, status: string, transactionId?: string): Observable<{ message: string; payment: Payment }> {
    return this.http.patch<{ message: string; payment: Payment }>(`${this.apiUrl}/${id}/status`, { status, transactionId });
  }

  // Helpers
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'deposit': 'Deposito',
      'final': 'Pago Final',
      'extra': 'Cargo Extra'
    };
    return labels[type] || type;
  }

  getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'tarjeta': 'Tarjeta',
      'transferencia': 'Transferencia',
      'qr': 'Codigo QR'
    };
    return labels[method] || method;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'completado': 'Completado',
      'fallido': 'Fallido'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pendiente': 'bg-amber-100 text-amber-700',
      'completado': 'bg-emerald-100 text-emerald-700',
      'fallido': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-stone-100 text-stone-700';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'deposit': 'bg-blue-100 text-blue-700',
      'final': 'bg-purple-100 text-purple-700',
      'extra': 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-stone-100 text-stone-700';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
