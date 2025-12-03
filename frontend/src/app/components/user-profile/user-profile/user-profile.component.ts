import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { RatingsService } from '../../../services/ratings.service';
import { FavoritesService, FavoriteCar } from '../../../services/favorites.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { Rating } from '../../../models/rating.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  user = signal<User | null>(null);
  ratings = signal<any[]>([]);
  favorites = signal<FavoriteCar[]>([]);
  loading = signal(true);
  error = signal('');
  editMode = signal(false);
  activeTab = signal<'profile' | 'ratings' | 'favorites'>('profile');

  readonly Math = Math;

  // Form data
  formData = {
    firstName: '',
    lastName: '',
    phone: ''
  };

  constructor(
    public authService: AuthService,
    private ratingsService: RatingsService,
    public favoritesService: FavoritesService,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadFavorites();
  }

  loadUserData(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.user.set(currentUser);
      this.formData = {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: currentUser.phone
      };
      this.loadRatings(currentUser.id);
    }
  }

  loadRatings(userId: number): void {
    this.loading.set(true);
    this.ratingsService.getUserRatings(userId).subscribe({
      next: (data) => {
        this.ratings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar calificaciones');
        this.loading.set(false);
      }
    });
  }

  loadFavorites(): void {
    this.favoritesService.getFavorites().subscribe({
      next: (data) => {
        this.favorites.set(data);
      },
      error: (err) => {
        console.error('Error al cargar favoritos:', err);
      }
    });
  }

  removeFavorite(carId: number): void {
    this.favoritesService.removeFavorite(carId).subscribe({
      next: () => {
        this.favorites.update(favs => favs.filter(f => f.id !== carId));
      }
    });
  }

  setActiveTab(tab: 'profile' | 'ratings' | 'favorites'): void {
    this.activeTab.set(tab);
  }

  toggleEditMode(): void {
    this.editMode.set(!this.editMode());
    if (!this.editMode()) {
      // Reset form si cancelamos
      const currentUser = this.user();
      if (currentUser) {
        this.formData = {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          phone: currentUser.phone
        };
      }
    }
  }

  saveProfile(): void {
    // TODO: Implementar actualización de perfil
    console.log('Guardar perfil:', this.formData);
    this.editMode.set(false);
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  getAverageRating(): number {
    if (this.ratings().length === 0) return 0;
    const sum = this.ratings().reduce((acc, r) => {
      const parsed = r.adminToUserRating;
      return acc + (parsed?.overallRating || 0);
    }, 0);
    return sum / this.ratings().length;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
