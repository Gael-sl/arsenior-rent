import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { PaymentsService } from '../../../services/payments.service';
import { Payment, PaymentStats } from '../../../models/payment.model';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  payments = signal<Payment[]>([]);
  stats = signal<PaymentStats | null>(null);
  
  // Filtros
  filterType = signal<string>('all');
  filterStatus = signal<string>('all');

  constructor(public paymentsService: PaymentsService) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.paymentsService.getMyPayments().subscribe({
      next: (response) => {
        this.payments.set(response.payments);
        this.stats.set(response.stats);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar el historial de pagos');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  get filteredPayments(): Payment[] {
    let result = this.payments();

    if (this.filterType() !== 'all') {
      result = result.filter(p => p.type === this.filterType());
    }

    if (this.filterStatus() !== 'all') {
      result = result.filter(p => p.status === this.filterStatus());
    }

    return result;
  }

  setFilterType(type: string): void {
    this.filterType.set(type);
  }

  setFilterStatus(status: string): void {
    this.filterStatus.set(status);
  }

  getMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      'efectivo': 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      'tarjeta': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      'transferencia': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      'qr': 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z'
    };
    return icons[method] || icons['efectivo'];
  }
}
