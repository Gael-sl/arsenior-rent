import { Component, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TrackingService } from '../../../services/tracking.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { ActiveRental } from '../../../models/tracking.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-tracking',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './admin-tracking.component.html',
  styleUrls: ['./admin-tracking.component.css']
})
export class AdminTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  activeRentals = signal<ActiveRental[]>([]);
  loading = signal(true);
  error = signal('');
  autoRefresh = signal(true);
  lastUpdate = signal<Date | null>(null);

  private map: L.Map | null = null;
  private markers: Map<number, L.Marker> = new Map();
  private refreshInterval: any;
  private carIcon!: L.DivIcon;

  constructor(private trackingService: TrackingService) {}

  ngOnInit(): void {
    this.createCustomIcon();
    this.loadActiveRentals();
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    // Fix para los iconos de Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });
    
    this.initMap();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  createCustomIcon(): void {
    // Crear icono SVG personalizado para vehículos con sombra
    const carSvg = `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="position: absolute; width: 40px; height: 40px; background: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 7h11l1.5 4.5h-14L6.5 7zm-1 7c-.83 0-1.5-.67-1.5-1.5S4.67 11 5.5 11s1.5.67 1.5 1.5S6.33 14 5.5 14zm13 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>
      </div>
    `;
    
    this.carIcon = L.divIcon({
      html: carSvg,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  }

  initMap(): void {
    // Centrar en Sinaloa, México (centro del estado)
    this.map = L.map('map').setView([25.0, -107.5], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    // Agregar bounds para Sinaloa
    const sinaloa = L.rectangle([
      [22.5, -109.5], // Suroeste
      [27.0, -105.5]  // Noreste
    ], {
      color: '#cbd5e1',
      weight: 2,
      fillOpacity: 0.05,
      dashArray: '5, 5'
    }).addTo(this.map);
  }

  formatTimestamp(ts?: string): string {
    if (!ts) return '';
    return new Date(ts).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  loadActiveRentals(): void {
    this.loading.set(true);
    this.trackingService.getActiveRentals().subscribe({
      next: (data) => {
        this.activeRentals.set(data);
        this.loading.set(false);
        this.lastUpdate.set(new Date());
        this.updateMarkers();
      },
      error: (err) => {
        this.error.set('Error al cargar tracking');
        this.loading.set(false);
      }
    });
  }

  updateMarkers(): void {
    if (!this.map) return;

    const currentRentalIds = new Set<number>();

    // Actualizar o crear markers
    this.activeRentals().forEach(rental => {
      if (rental.currentLocation) {
        currentRentalIds.add(rental.reservation.id);
        const existingMarker = this.markers.get(rental.reservation.id);

        if (existingMarker) {
          // Actualizar posición del marker existente con animación
          existingMarker.setLatLng([
            rental.currentLocation.latitude,
            rental.currentLocation.longitude
          ]);
        } else {
          // Crear nuevo marker
          const marker = L.marker(
            [rental.currentLocation.latitude, rental.currentLocation.longitude],
            { icon: this.carIcon }
          ).addTo(this.map!);

          marker.bindPopup(`
            <div class="p-3 min-w-[200px]">
              <p class="font-playfair font-semibold text-base mb-1">${rental.car.brand} ${rental.car.model}</p>
              <p class="text-sm text-gray-600 mb-2">${rental.user.firstName} ${rental.user.lastName}</p>
              <div class="text-xs text-gray-500 space-y-1">
                <p>📍 Velocidad: ${rental.currentLocation.speed || 0} km/h</p>
                <p>🧭 Dirección: ${rental.currentLocation.heading || 0}°</p>
                <p>⏱️ ${this.formatTimestamp(rental.currentLocation.timestamp)}</p>
              </div>
            </div>
          `);

          this.markers.set(rental.reservation.id, marker);
        }
      }
    });

    // Remover markers de reservas que ya no están activas
    this.markers.forEach((marker, reservationId) => {
      if (!currentRentalIds.has(reservationId)) {
        marker.remove();
        this.markers.delete(reservationId);
      }
    });

    // Ajustar vista del mapa si hay markers
    if (this.markers.size > 0) {
      const group = new L.FeatureGroup(Array.from(this.markers.values()));
      this.map!.fitBounds(group.getBounds().pad(0.1));
    }
  }

  startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (this.autoRefresh()) {
        this.loadActiveRentals();
      }
    }, 30000); // Refrescar cada 30 segundos
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
  }

  refreshData(): void {
    this.loadActiveRentals();
  }

  simulateMovement(): void {
    this.trackingService.simulateMovement().subscribe({
      next: (response) => {
        console.log('Movimiento simulado:', response);
        this.loadActiveRentals();
      },
      error: (err) => {
        console.error('Error al simular movimiento:', err);
      }
    });
  }
}