import { Component, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { MaintenanceService } from '../../../services/maintenance.service';
import { Car } from '../../../models/car.model';
import { Maintenance, MaintenanceItem } from '../../../models/maintenance.model';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

@Component({
  selector: 'app-admin-maintenance',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './admin-maintenance.component.html',
  styleUrls: ['./admin-maintenance.component.css']
})
export class AdminMaintenanceComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  
  maintenances = signal<Maintenance[]>([]);
  availableCars = signal<Car[]>([]);
  
  filterStatus: 'all' | 'en_proceso' | 'completado' | 'programado' = 'all';
  expandedItems = new Set<number>();
  
  showAddMaintenanceModal = false;
  editingMaintenance: Maintenance | null = null;
  
  maintenanceTypes = [
    'Cambio de Aceite',
    'Revisión General',
    'Frenos',
    'Llantas',
    'Suspensión',
    'Batería',
    'Transmisión',
    'Aire Acondicionado',
    'Alineación y Balanceo',
    'Otro'
  ];
  
  maintenanceForm = {
    carId: 0,
    types: [] as string[],
    startDate: '',
    mechanic: '',
    items: [] as MaintenanceItem[],
    notes: '',
    status: 'en_proceso' as 'en_proceso' | 'completado' | 'programado'
  };

  constructor(
    @Inject(MaintenanceService) private maintenanceService: MaintenanceService,
    private carsService: CarsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    
    // Cargar mantenimientos
    this.maintenanceService.getAllMaintenances().subscribe({
      next: (data) => {
        this.maintenances.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar mantenimientos');
        this.loading.set(false);
      }
    });

    // Cargar vehículos disponibles
    this.carsService.getAllCars().subscribe({
      next: (cars) => {
        this.availableCars.set(cars);
      },
      error: (err) => {
        console.error('Error cargando vehículos:', err);
      }
    });
  }

  getFilteredMaintenances(): Maintenance[] {
    if (this.filterStatus === 'all') {
      return this.maintenances();
    }
    return this.maintenances().filter(m => m.status === this.filterStatus);
  }

  getTotalCost(): string {
    const total = this.maintenances()
      .filter(m => {
        const date = new Date(m.startDate);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, m) => sum + m.totalCost, 0);
    
    return total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
  }

  getCountByStatus(status: string): number {
    return this.maintenances().filter(m => m.status === status).length;
  }

  toggleDetails(id: number): void {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  toggleMaintenanceType(type: string): void {
    const index = this.maintenanceForm.types.indexOf(type);
    if (index > -1) {
      this.maintenanceForm.types.splice(index, 1);
    } else {
      this.maintenanceForm.types.push(type);
    }
  }

  addExpenseItem(): void {
    this.maintenanceForm.items.push({
      id: Date.now(),
      category: '',
      description: '',
      cost: 0
    });
  }

  removeExpenseItem(index: number): void {
    this.maintenanceForm.items.splice(index, 1);
  }

  calculateTotal(): number {
    return this.maintenanceForm.items.reduce((sum, item) => sum + (item.cost || 0), 0);
  }

  isFormValid(): boolean {
    return (
      this.maintenanceForm.carId > 0 &&
      this.maintenanceForm.types.length > 0 &&
      this.maintenanceForm.startDate !== '' &&
      this.maintenanceForm.mechanic !== '' &&
      this.maintenanceForm.items.length > 0 &&
      this.maintenanceForm.items.every(item => item.category && item.description && item.cost > 0)
    );
  }

  editMaintenance(maintenance: Maintenance): void {
    this.editingMaintenance = maintenance;
    this.maintenanceForm = {
      carId: maintenance.car.id,
      types: [...maintenance.types],
      startDate: maintenance.startDate,
      mechanic: maintenance.mechanic,
      items: [...maintenance.items],
      notes: maintenance.notes || '',
      status: maintenance.status
    };
    this.showAddMaintenanceModal = true;
  }

  completeMaintenance(id: number): void {
    if (confirm('¿Marcar este mantenimiento como completado?')) {
      this.maintenanceService.updateMaintenanceStatus(id, 'completado').subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => {
          alert('Error al actualizar el estado');
        }
      });
    }
  }

  saveMaintenance(): void {
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const maintenanceData = {
      carId: this.maintenanceForm.carId,
      types: this.maintenanceForm.types,
      startDate: this.maintenanceForm.startDate,
      mechanic: this.maintenanceForm.mechanic,
      items: this.maintenanceForm.items,
      notes: this.maintenanceForm.notes,
      status: this.maintenanceForm.status,
      totalCost: this.calculateTotal()
    };

    if (this.editingMaintenance) {
      // Actualizar
      this.maintenanceService.updateMaintenance(this.editingMaintenance.id, maintenanceData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          alert('Error al actualizar el mantenimiento');
        }
      });
    } else {
      // Crear nuevo
      this.maintenanceService.createMaintenance(maintenanceData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          alert('Error al registrar el mantenimiento');
        }
      });
    }
  }

  closeModal(): void {
    this.showAddMaintenanceModal = false;
    this.editingMaintenance = null;
    this.maintenanceForm = {
      carId: 0,
      types: [],
      startDate: '',
      mechanic: '',
      items: [],
      notes: '',
      status: 'en_proceso'
    };
  }
}