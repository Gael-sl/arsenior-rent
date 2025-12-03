import { Component, OnInit, OnDestroy, signal, PLATFORM_ID, Inject, HostListener } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { AuthService } from '../../../services/auth.service';
import { Car } from '../../../models/car.model';
import { ExtraEquipment, DEFAULT_EXTRAS } from '../../../models/extra.model';
import { TermsModalComponent } from '../../shared/terms-modal/terms-modal.component';
import { AiSpecsModalComponent } from '../../shared/ai-specs-modal/ai-specs-modal.component';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

interface ClientData {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  address: string;
}

interface RentalDates {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-car-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TermsModalComponent,
    AiSpecsModalComponent,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './car-details.component.html',
  styleUrls: ['./car-details.component.css']
})
export class CarDetailsComponent implements OnInit, OnDestroy {
  car = signal<Car | null>(null);
  loading = signal(true);
  error = signal('');

  // Gallery
  currentImageIndex = signal(0);
  lightboxOpen = signal(false);
  
  // Terms modal
  termsModalOpen = false;
  
  // AI Specs modal
  aiSpecsModalOpen = false;

  // Dates (cargadas del localStorage)
  rentalDates: RentalDates | null = null;
  startDate = '';
  endDate = '';
  startTime = '';
  endTime = '';
  totalDays = 0;

  // Plan selection
  selectedPlan: 'Regular' | 'Premium' = 'Regular';

  // Extras
  availableExtras: ExtraEquipment[] = DEFAULT_EXTRAS;
  selectedExtras: { [key: number]: number } = {};

  // Client data
  clientData: ClientData = {
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    address: ''
  };

  acceptContract = false;

  // Pricing
  subtotal = 0;
  extrasTotal = 0;
  total = 0;

  // Para Math.round en template
  Math = Math;
  
  private isBrowser: boolean;

  constructor(
    private carsService: CarsService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Scroll to top al cargar
    if (this.isBrowser && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Cargar fechas del localStorage
    if (this.isBrowser) {
      const storedDates = localStorage.getItem('rental_dates');
      if (storedDates) {
        this.rentalDates = JSON.parse(storedDates);
        this.startDate = this.rentalDates!.startDate;
        this.endDate = this.rentalDates!.endDate;
        this.startTime = this.rentalDates!.startTime;
        this.endTime = this.rentalDates!.endTime;
      } else {
        // Si no hay fechas, redirigir al Home
        this.router.navigate(['/']);
        return;
      }
      
      // Pre-llenar datos del usuario si está logueado
      const user = this.authService.currentUser();
      if (user) {
        this.clientData.fullName = `${user.firstName} ${user.lastName}`;
        this.clientData.email = user.email;
        this.clientData.phone = user.phone || '';
      }
    }
    
    const carId = this.route.snapshot.params['id'];
    this.loadCarDetails(carId);
  }

  loadCarDetails(id: number): void {
    this.loading.set(true);
    this.carsService.getCarById(id).subscribe({
      next: (data) => {
        this.car.set(data);
        this.calculateTotal(); // Calcular total al cargar
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar el vehículo');
        this.loading.set(false);
      }
    });
  }
  
  // Formatear fecha para mostrar
  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-MX', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  }
  
  // Cambiar fechas (volver al Home)
  changeDates(): void {
    this.router.navigate(['/']);
  }

  calculateTotal(): void {
    const car = this.car();
    if (!car || !this.startDate || !this.endDate) return;

    // Calculate days
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diff = end.getTime() - start.getTime();
    this.totalDays = Math.ceil(diff / (1000 * 3600 * 24));

    if (this.totalDays <= 0) {
      this.totalDays = 0;
      this.subtotal = 0;
      this.total = 0;
      return;
    }

    // Subtotal
    let pricePerDay = car.pricePerDay;
    
    // Plan Premium adds 30%
    if (this.selectedPlan === 'Premium') {
      pricePerDay = Math.round(pricePerDay * 1.3);
    }

    this.subtotal = pricePerDay * this.totalDays;

    // Extras
    this.extrasTotal = 0;
    Object.keys(this.selectedExtras).forEach(key => {
      const extraId = parseInt(key);
      const quantity = this.selectedExtras[extraId];
      if (quantity > 0) {
        const extra = this.availableExtras.find(e => e.id === extraId);
        if (extra) {
          this.extrasTotal += extra.price * quantity * this.totalDays;
        }
      }
    });

    this.total = this.subtotal + this.extrasTotal;
  }

  toggleExtra(extraId: number): void {
    if (this.selectedExtras[extraId]) {
      this.selectedExtras[extraId]++;
    } else {
      this.selectedExtras[extraId] = 1;
    }
    this.calculateTotal();
  }

  removeExtra(extraId: number): void {
    if (this.selectedExtras[extraId] > 0) {
      this.selectedExtras[extraId]--;
      if (this.selectedExtras[extraId] === 0) {
        delete this.selectedExtras[extraId];
      }
    }
    this.calculateTotal();
  }

  proceedToCheckout(): void {
    if (!this.clientData.fullName || !this.clientData.email || !this.clientData.phone || !this.clientData.licenseNumber) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!this.acceptContract) {
      alert('Debes aceptar los términos y condiciones del contrato de renta');
      return;
    }

    if (!this.rentalDates || this.totalDays <= 0) {
      alert('Error con las fechas de renta. Por favor selecciona fechas válidas.');
      this.router.navigate(['/']);
      return;
    }

    // Guardar en localStorage para el checkout
    const checkoutData = {
      car: this.car(),
      clientData: this.clientData,
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.startTime,
      endTime: this.endTime,
      plan: this.selectedPlan,
      extras: this.getSelectedExtrasArray(),
      totalDays: this.totalDays,
      subtotal: this.subtotal,
      extrasTotal: this.extrasTotal,
      total: this.total
    };

    localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
    this.router.navigate(['/checkout', this.car()?.id]);
  }

  getSelectedExtrasArray() {
    const extras: any[] = [];
    Object.keys(this.selectedExtras).forEach(key => {
      const extraId = parseInt(key);
      const quantity = this.selectedExtras[extraId];
      if (quantity > 0) {
        const extra = this.availableExtras.find(e => e.id === extraId);
        if (extra) {
          extras.push({
            id: extra.id,
            name: extra.name,
            price: extra.price,
            quantity: quantity
          });
        }
      }
    });
    return extras;
  }

  goBack(): void {
    this.location.back();
  }

  getStarRating(rating: number): string[] {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < Math.round(rating) ? '★' : '☆');
    }
    return stars;
  }

  getSegmentLabel(segment: string): string {
    const labels: { [key: string]: string } = {
      'A': 'Premium',
      'B': 'Standard',
      'C': 'Básico'
    };
    return labels[segment] || segment;
  }

  // Terms modal methods
  openTermsModal(): void {
    this.termsModalOpen = true;
  }

  closeTermsModal(): void {
    this.termsModalOpen = false;
  }

  onTermsAccepted(): void {
    this.acceptContract = true;
    this.termsModalOpen = false;
  }

  // AI Specs modal methods
  openAiSpecsModal(): void {
    this.aiSpecsModalOpen = true;
  }

  closeAiSpecsModal(): void {
    this.aiSpecsModalOpen = false;
  }

  // Gallery methods
  getAllImages(): string[] {
    const car = this.car();
    if (!car) return [];
    
    const images: string[] = [];
    if (car.image) {
      images.push(car.image);
    }
    if (car.gallery && car.gallery.length > 0) {
      images.push(...car.gallery);
    }
    return images;
  }

  getCurrentImage(): string {
    const images = this.getAllImages();
    return images[this.currentImageIndex()] || '';
  }

  nextImage(): void {
    const images = this.getAllImages();
    if (images.length > 0) {
      this.currentImageIndex.set((this.currentImageIndex() + 1) % images.length);
    }
  }

  prevImage(): void {
    const images = this.getAllImages();
    if (images.length > 0) {
      this.currentImageIndex.set((this.currentImageIndex() - 1 + images.length) % images.length);
    }
  }

  selectImage(index: number): void {
    this.currentImageIndex.set(index);
  }

  openLightbox(index: number): void {
    this.currentImageIndex.set(index);
    this.lightboxOpen.set(true);
    // Prevent body scroll
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    // Restore body scroll
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  // Handle keyboard navigation in lightbox
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.lightboxOpen()) return;
    
    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        this.prevImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
    }
  }

  ngOnDestroy(): void {
    // Clean up: restore body scroll if lightbox was open
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }
}