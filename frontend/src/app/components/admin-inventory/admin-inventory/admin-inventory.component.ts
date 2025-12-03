import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { Car } from '../../../models/car.model';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-inventory.component.css']
})
export class AdminInventoryComponent implements OnInit {
  cars = signal<Car[]>([]);
  loading = signal(true);
  error = signal('');

  // Modal states
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedCar: Car | null = null;

  // Form data
  formData: Partial<Car> = {};

  constructor(private carsService: CarsService) {}

  ngOnInit(): void {
    this.loadCars();
  }

  loadCars(): void {
    this.loading.set(true);
    this.carsService.getAllCars().subscribe({
      next: (data) => {
        this.cars.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar inventario');
        this.loading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.formData = {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      segment: 'B',
      transmission: 'Automatica',
      fuelType: 'Gasolina',
      seats: 5,
      doors: 4,
      luggage: 2,
      pricePerDay: 0,
      status: 'disponible',
      features: [],
      description: ''
    };
    this.showAddModal.set(true);
  }

  openEditModal(car: Car): void {
    this.selectedCar = car;
    this.formData = { ...car };
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.selectedCar = null;
  }

  saveCar(): void {
    if (this.showAddModal()) {
      this.carsService.createCar(this.formData).subscribe({
        next: () => {
          alert('Vehículo agregado exitosamente');
          this.closeModals();
          this.loadCars();
        },
        error: (err) => {
          alert('Error al agregar vehículo');
        }
      });
    } else if (this.showEditModal() && this.selectedCar) {
      this.carsService.updateCar(this.selectedCar.id, this.formData).subscribe({
        next: () => {
          alert('Vehículo actualizado exitosamente');
          this.closeModals();
          this.loadCars();
        },
        error: (err) => {
          alert('Error al actualizar vehículo');
        }
      });
    }
  }

  deleteCar(car: Car): void {
    if (!confirm(`¿Eliminar ${car.brand} ${car.model}?`)) return;

    this.carsService.deleteCar(car.id).subscribe({
      next: () => {
        alert('Vehículo eliminado');
        this.loadCars();
      },
      error: (err) => {
        alert('Error al eliminar vehículo');
      }
    });
  }

  updateStatus(car: Car, newStatus: 'disponible' | 'rentado' | 'mantenimiento'): void {
    this.carsService.updateCarStatus(car.id, newStatus).subscribe({
      next: () => {
        this.loadCars();
      },
      error: (err) => {
        alert('Error al actualizar estado');
      }
    });
  }
}