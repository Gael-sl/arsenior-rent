import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservationsService } from '../../../services/reservations.service';
import { RatingsService } from '../../../services/ratings.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './admin-reservations.component.html',
  styleUrls: ['./admin-reservations.component.css']
})
export class AdminReservationsComponent implements OnInit {
  reservations = signal<Reservation[]>([]);
  loading = signal(true);
  error = signal('');

  // Rating modal
  showRatingModal = signal(false);
  selectedReservation: Reservation | null = null;
  adminRating = {
    vehicleReturnCondition: 5,
    punctuality: 5,
    communication: 5,
    responsibleUse: 5,
    comments: ''
  };

  constructor(
    private reservationsService: ReservationsService,
    private ratingsService: RatingsService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading.set(true);
    this.reservationsService.getAllReservations().subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar reservas');
        this.loading.set(false);
      }
    });
  }

  confirmDeposit(reservation: Reservation): void {
    if (!confirm(`¿Confirmar pago de adelanto de $${reservation.depositAmount.toFixed(2)}?`)) return;

    this.reservationsService.confirmDeposit(reservation.id, reservation.qrCode || '').subscribe({
      next: () => {
        alert('Pago confirmado. El usuario ya puede hacer el checklist de recogida.');
        this.loadReservations();
      },
      error: (err) => {
        alert('Error al confirmar el pago');
      }
    });
  }

  openRatingModal(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.showRatingModal.set(true);
  }

  closeRatingModal(): void {
    this.showRatingModal.set(false);
    this.selectedReservation = null;
  }

  submitRating(): void {
    if (!this.selectedReservation) return;

    const ratingData = {
      reservationId: this.selectedReservation.id,
      ...this.adminRating
    };

    this.ratingsService.rateUser(ratingData).subscribe({
      next: () => {
        alert('Usuario calificado exitosamente');
        this.closeRatingModal();
        this.loadReservations();
      },
      error: (err) => {
        alert('Error al calificar usuario');
      }
    });
  }

  markAsReturned(reservation: Reservation): void {
    if (!confirm('Marcar este vehículo como devuelto?')) return;

    this.reservationsService.markAsReturned(reservation.id).subscribe({
      next: () => {
        alert('Vehículo marcado como devuelto correctamente');
        this.loadReservations();
      },
      error: () => {
        alert('Error al marcar como devuelto');
      }
    });
  }
}