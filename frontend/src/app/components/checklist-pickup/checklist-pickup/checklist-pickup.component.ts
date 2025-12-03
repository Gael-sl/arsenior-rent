import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChecklistsService } from '../../../services/checklists.service';
import { ReservationsService } from '../../../services/reservations.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { ChecklistItem, Damage, CreateChecklistRequest } from '../../../models/checklist.model';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-checklist-pickup',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './checklist-pickup.component.html',
  styleUrls: ['./checklist-pickup.component.css']
})
export class ChecklistPickupComponent implements OnInit {
  reservation = signal<Reservation | null>(null);
  loading = signal(false);
  error = signal('');

  // Checklist items
  exteriorCondition: ChecklistItem = { status: 'excelente', notes: '' };
  interiorCondition: ChecklistItem = { status: 'excelente', notes: '' };
  tiresCondition: ChecklistItem = { status: 'excelente', notes: '' };
  lightsCondition: ChecklistItem = { status: 'excelente', notes: '' };
  mechanicalCondition: ChecklistItem = { status: 'excelente', notes: '' };
  fuelLevel = 100;

  // Damages
  damages: Omit<Damage, 'id'>[] = [];
  newDamageLocation = '';
  newDamageDescription = '';
  newDamageSeverity: 'leve' | 'moderado' | 'grave' = 'leve';
  newDamagePhoto: File | null = null;
  newDamagePhotoPreview = '';

  // NUEVA FEATURE: Foto general del vehículo
  vehiclePhoto: File | null = null;
  vehiclePhotoPreview = '';

  generalNotes = '';

  constructor(
    private checklistsService: ChecklistsService,
    private reservationsService: ReservationsService,
    private authService: AuthService,
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

  // NUEVA FEATURE: Seleccionar foto del vehículo
  onVehiclePhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.vehiclePhoto = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.vehiclePhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onDamagePhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newDamagePhoto = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newDamagePhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addDamage(): void {
    if (!this.newDamageLocation || !this.newDamageDescription) {
      alert('Por favor completa la ubicación y descripción del daño');
      return;
    }

    this.damages.push({
      location: this.newDamageLocation,
      description: this.newDamageDescription,
      severity: this.newDamageSeverity,
      photo: this.newDamagePhotoPreview || undefined
    });

    // Reset
    this.newDamageLocation = '';
    this.newDamageDescription = '';
    this.newDamageSeverity = 'leve';
    this.newDamagePhoto = null;
    this.newDamagePhotoPreview = '';
  }

  removeDamage(index: number): void {
    this.damages.splice(index, 1);
  }

  async submitChecklist(): Promise<void> {
    if (!this.reservation()) return;

    // NUEVA FEATURE: Foto del vehículo es RECOMENDADA
    if (!this.vehiclePhoto) {
      const confirmResult = (typeof window !== 'undefined' && window.confirm)
        ? window.confirm('No has agregado una foto del vehículo. ¿Continuar sin foto?')
        : true;
      if (!confirmResult) return;
    }

    this.loading.set(true);

    try {
      // Upload vehicle photo if exists
      let vehiclePhotoUrl = this.vehiclePhotoPreview;
      if (this.vehiclePhoto) {
        const uploadResult = await this.checklistsService.uploadVehiclePhoto(this.vehiclePhoto).toPromise();
        vehiclePhotoUrl = uploadResult?.url || this.vehiclePhotoPreview;
      }

      const checklistData: CreateChecklistRequest = {
        reservationId: this.reservation()!.id,
        type: 'pickup',
        inspector: `${this.authService.currentUser()?.firstName} ${this.authService.currentUser()?.lastName}`,
        exteriorCondition: this.exteriorCondition,
        interiorCondition: this.interiorCondition,
        tiresCondition: this.tiresCondition,
        lightsCondition: this.lightsCondition,
        mechanicalCondition: this.mechanicalCondition,
        fuelLevel: this.fuelLevel,
        damages: this.damages,
        extraCharges: [],
        vehiclePhoto: vehiclePhotoUrl,
        notes: this.generalNotes
      };

      this.checklistsService.createChecklist(checklistData).subscribe({
        next: () => {
          this.loading.set(false);
          alert('Checklist completado. ¡Disfruta tu viaje!');
          this.router.navigate(['/my-reservations']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set('Error al guardar el checklist');
        }
      });
    } catch (err) {
      this.loading.set(false);
      this.error.set('Error al subir las fotos');
    }
  }
}