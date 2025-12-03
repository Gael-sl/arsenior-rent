import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RatingsService } from '../../../services/ratings.service';
import { ReservationsService } from '../../../services/reservations.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.css']
})
export class RatingComponent implements OnInit {
  reservation = signal<Reservation | null>(null);
  loading = signal(false);
  success = signal(false);
  error = signal('');

  readonly Math = Math;

  // Ratings
  vehicleCondition = 5;
  cleanliness = 5;
  performance = 5;
  customerService = 5;
  comments = '';

  constructor(
    private ratingsService: RatingsService,
    private reservationsService: ReservationsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const reservationId = this.route.snapshot.params['reservationId'];
    this.loadReservation(reservationId);
  }

  loadReservation(id: number): void {
    this.reservationsService.getReservationById(id).subscribe({
      next: (data) => {
        this.reservation.set(data);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la reserva');
      }
    });
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  setRating(category: string, value: number): void {
    switch(category) {
      case 'vehicleCondition':
        this.vehicleCondition = value;
        break;
      case 'cleanliness':
        this.cleanliness = value;
        break;
      case 'performance':
        this.performance = value;
        break;
      case 'customerService':
        this.customerService = value;
        break;
    }
  }

  submitRating(): void {
    if (!this.reservation()) return;

    this.loading.set(true);
    this.error.set('');

    const ratingData = {
      reservationId: this.reservation()!.id,
      vehicleCondition: this.vehicleCondition,
      cleanliness: this.cleanliness,
      performance: this.performance,
      customerService: this.customerService,
      comments: this.comments
    };

    this.ratingsService.rateCarAndService(ratingData).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => {
          this.router.navigate(['/my-reservations']);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Error al enviar la calificación');
      }
    });
  }

  getOverallRating(): number {
    return (this.vehicleCondition + this.cleanliness + this.performance + this.customerService) / 4;
  }
}