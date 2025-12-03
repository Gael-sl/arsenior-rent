import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservationsService } from '../../../services/reservations.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './my-reservations.component.html',
  styleUrls: ['./my-reservations.component.css']
})
export class MyReservationsComponent implements OnInit {
  reservations = signal<Reservation[]>([]);
  loading = signal(true);
  error = signal('');

  // Early return modal
  showEarlyReturnModal = signal(false);
  selectedReservation: Reservation | null = null;
  earlyReturnDate = '';
  earlyReturnReason = '';

  constructor(
    private reservationsService: ReservationsService,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading.set(true);
    this.reservationsService.getMyReservations().subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar tus reservas');
        this.loading.set(false);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'badge-warning',
      'confirmada': 'badge-success',
      'activa': 'badge-success',
      'completada': 'badge',
      'cancelada': 'badge-danger',
      'extendida': 'badge-warning'
    };
    return classes[status] || 'badge';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'activa': 'Activa',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'extendida': 'Extendida'
    };
    return labels[status] || status;
  }

  canPickup(reservation: Reservation): boolean {
    const today = new Date();
    const startDate = new Date(reservation.startDate);
    return reservation.status === 'confirmada' && 
           reservation.depositPaid && 
           startDate <= today;
  }

  canReturn(reservation: Reservation): boolean {
    return reservation.status === 'activa' && reservation.pickupChecklist !== undefined;
  }

  canRate(reservation: Reservation): boolean {
    return reservation.status === 'completada' && reservation.returnChecklist !== undefined;
  }

  // NUEVA FEATURE: Devolución Anticipada
  openEarlyReturnModal(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.earlyReturnDate = '';
    this.earlyReturnReason = '';
    this.showEarlyReturnModal.set(true);
  }

  closeEarlyReturnModal(): void {
    this.showEarlyReturnModal.set(false);
    this.selectedReservation = null;
  }

  confirmEarlyReturn(): void {
    if (!this.selectedReservation || !this.earlyReturnDate) {
      alert('Por favor selecciona una fecha de devolución');
      return;
    }

    const earlyDate = new Date(this.earlyReturnDate);
    const originalEnd = new Date(this.selectedReservation.endDate);
    
    if (earlyDate >= originalEnd) {
      alert('La fecha debe ser anterior a la fecha original de devolución');
      return;
    }

    this.reservationsService.earlyReturn({
      reservationId: this.selectedReservation.id,
      earlyReturnDate: this.earlyReturnDate,
      reason: this.earlyReturnReason
    }).subscribe({
      next: () => {
        alert('Devolución anticipada confirmada. Se ajustará el precio.');
        this.closeEarlyReturnModal();
        this.loadReservations();
      },
      error: (err) => {
        alert('Error al procesar devolución anticipada');
      }
    });
  }

  calculateDaysRemaining(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  extrasList(extras?: { id: number; name: string; price: number; quantity: number }[]): string {
    return extras?.map(e => e.name).join(', ') || '';
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}