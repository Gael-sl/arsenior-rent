import { Component, OnInit, signal, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { FavoritesService } from '../../../services/favorites.service';
import { AuthService } from '../../../services/auth.service';
import { Car, CarFilters } from '../../../models/car.model';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

interface RentalDates {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-car-catalog',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './car-catalog.component.html',
  styleUrls: ['./car-catalog.component.css']
})
export class CarCatalogComponent implements OnInit {
  cars = signal<Car[]>([]);
  filteredCars = signal<Car[]>([]);
  loading = signal(true);
  error = signal('');

  // Filtros y sorting
  filterBy = 'all';
  sortBy = 'price-low';
  
  // Fechas de renta (desde Home)
  rentalDates: RentalDates | null = null;
  showDateModal = signal(false);
  
  // Datos temporales para el modal
  tempDates = {
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '09:00'
  };
  
  private isBrowser: boolean;

  constructor(
    private carsService: CarsService,
    private router: Router,
    public favoritesService: FavoritesService,
    public authService: AuthService,
    private location: Location,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // Scroll to top al cargar el componente
    if (this.isBrowser && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Cargar fechas del localStorage (guardadas desde Home)
    if (this.isBrowser) {
      const storedDates = localStorage.getItem('rental_dates');
      if (storedDates) {
        this.rentalDates = JSON.parse(storedDates);
      } else {
        // Si no hay fechas, redirigir al Home para que las seleccione
        this.router.navigate(['/']);
        return;
      }
    }
    
    this.loadCars();
  }

  loadCars(): void {
    this.loading.set(true);
    this.error.set('');
    
    // Construir filtros con las fechas del localStorage
    const filters: CarFilters = {};
    
    if (this.rentalDates) {
      filters.startDate = this.rentalDates.startDate;
      filters.endDate = this.rentalDates.endDate;
    }
    
    this.carsService.getAllCars(filters).subscribe({
      next: (data) => {
        this.cars.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar el catálogo');
        this.loading.set(false);
      }
    });
  }
  
  // Calcular días de renta
  getRentalDays(): number {
    if (!this.rentalDates) return 0;
    const start = new Date(this.rentalDates.startDate);
    const end = new Date(this.rentalDates.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Formatear fecha para mostrar
  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-MX', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  }
  
  // Cambiar fechas (abrir modal)
  changeDates(): void {
    if (this.rentalDates) {
      this.tempDates = { ...this.rentalDates };
    }
    this.showDateModal.set(true);
  }
  
  // Cerrar modal de fechas
  closeDateModal(): void {
    this.showDateModal.set(false);
  }
  
  // Actualizar fechas desde el modal
  updateDates(): void {
    if (!this.tempDates.startDate || !this.tempDates.endDate) {
      alert('Por favor completa todas las fechas');
      return;
    }
    
    this.rentalDates = { ...this.tempDates };
    
    // Guardar en localStorage
    if (this.isBrowser) {
      localStorage.setItem('rental_dates', JSON.stringify(this.rentalDates));
    }
    
    // Recargar carros con nuevas fechas
    this.loadCars();
    this.closeDateModal();
  }

  applyFilters(): void {
    let filtered = [...this.cars()];

    // Siempre filtrar solo los disponibles
    filtered = filtered.filter(car => car.status === 'disponible');

    // Filtrar por segmento de calidad
    if (this.filterBy !== 'all') {
      filtered = filtered.filter(car => {
        // Por segmento de calidad/lujo
        if (this.filterBy === 'premium') return car.segment === 'A';
        if (this.filterBy === 'standard') return car.segment === 'B';
        if (this.filterBy === 'economic') return car.segment === 'C';
        
        return true;
      });
    }

    // Ordenar
    filtered = this.sortCars(filtered);

    this.filteredCars.set(filtered);
  }

  sortCars(cars: Car[]): Car[] {
    switch (this.sortBy) {
      case 'price-low':
        return cars.sort((a, b) => a.pricePerDay - b.pricePerDay);
      case 'price-high':
        return cars.sort((a, b) => b.pricePerDay - a.pricePerDay);
      case 'rating':
        return cars.sort((a, b) => b.rating - a.rating);
      case 'recommended':
      default:
        // Ordenar por rating * reviews (popularidad)
        return cars.sort((a, b) => (b.rating * b.totalRatings) - (a.rating * a.totalRatings));
    }
  }

  clearFilters(): void {
    this.filterBy = 'all';
    this.sortBy = 'recommended';
    this.applyFilters();
  }

  getSegmentLabel(segment: string): string {
    const labels: { [key: string]: string } = {
      'A': 'Premium',
      'B': 'Standard',
      'C': 'Básico'
    };
    return labels[segment] || segment;
  }

  getPremierPrice(basePrice: number): number {
    return Math.round(basePrice * 1.3);
  }

  // Signal para mensaje de login
  showLoginMessage = signal(false);

  // Toggle favorito
  toggleFavorite(event: Event, carId: number): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authService.isAuthenticated()) {
      // Mostrar mensaje temporal antes de redirigir
      this.showLoginMessage.set(true);
      setTimeout(() => {
        this.showLoginMessage.set(false);
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: '/catalog' } 
        });
      }, 1500);
      return;
    }
    
    this.favoritesService.toggleFavorite(carId).subscribe({
      error: (err) => {
        console.error('Error al toggle favorito:', err);
      }
    });
  }

  // Verificar si es favorito
  isFavorite(carId: number): boolean {
    return this.favoritesService.isFavorite(carId);
  }
}