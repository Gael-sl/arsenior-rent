import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChecklistsService } from '../../../services/checklists.service';
import { ReservationsService } from '../../../services/reservations.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { ChecklistItem, Damage, ExtraCharge, CreateChecklistRequest } from '../../../models/checklist.model';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-checklist-return',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './checklist-return.component.html',
  styleUrls: ['./checklist-return.component.css']
})
export class ChecklistReturnComponent implements OnInit {
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
  newDamageEstimatedCost = 0;

  // Extra charges
  extraCharges: Omit<ExtraCharge, 'id'>[] = [];

  // NUEVA FEATURE: Foto general del vehículo (REQUERIDA en devolución)
  vehiclePhoto: File | null = null;
  vehiclePhotoPreview = '';

  // NUEVA FEATURE: Nombre de quien recibe
  receivedBy = '';

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

  // NUEVA FEATURE: Foto del vehículo OBLIGATORIA
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

    // NUEVA FEATURE: Foto OBLIGATORIA para daños en devolución
    if (!this.newDamagePhotoPreview) {
      alert('La foto del daño es OBLIGATORIA para procesar cargos');
      return;
    }

    this.damages.push({
      location: this.newDamageLocation,
      description: this.newDamageDescription,
      severity: this.newDamageSeverity,
      photo: this.newDamagePhotoPreview,
      estimatedCost: this.newDamageEstimatedCost
    });

    // Auto-add extra charge if there's a cost
    if (this.newDamageEstimatedCost > 0) {
      this.extraCharges.push({
        concept: `Daño: ${this.newDamageLocation}`,
        amount: this.newDamageEstimatedCost,
        reason: this.newDamageDescription
      });
    }

    // Reset
    this.newDamageLocation = '';
    this.newDamageDescription = '';
    this.newDamageSeverity = 'leve';
    this.newDamagePhoto = null;
    this.newDamagePhotoPreview = '';
    this.newDamageEstimatedCost = 0;
  }

  removeDamage(index: number): void {
    this.damages.splice(index, 1);
    this.extraCharges.splice(index, 1);
  }

  getTotalExtraCharges(): number {
    return this.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  }

  async submitChecklist(): Promise<void> {
    if (!this.reservation()) return;

    // NUEVA FEATURE: Validaciones obligatorias
    if (!this.vehiclePhoto) {
      alert('La foto del vehículo es OBLIGATORIA en la devolución');
      return;
    }

    if (!this.receivedBy || this.receivedBy.trim() === '') {
      alert('Por favor ingresa el nombre de quien recibe el vehículo');
      return;
    }

    // Si hay daños sin foto
    const damagesWithoutPhoto = this.damages.filter(d => !d.photo);
    if (damagesWithoutPhoto.length > 0) {
      alert('Todos los daños deben tener una foto adjunta');
      return;
    }

    this.loading.set(true);

    try {
      // Upload vehicle photo
      let vehiclePhotoUrl = this.vehiclePhotoPreview;
      if (this.vehiclePhoto) {
        const uploadResult = await this.checklistsService.uploadVehiclePhoto(this.vehiclePhoto).toPromise();
        vehiclePhotoUrl = uploadResult?.url || this.vehiclePhotoPreview;
      }

      const checklistData: CreateChecklistRequest = {
        reservationId: this.reservation()!.id,
        type: 'return',
        inspector: `${this.authService.currentUser()?.firstName} ${this.authService.currentUser()?.lastName}`,
        exteriorCondition: this.exteriorCondition,
        interiorCondition: this.interiorCondition,
        tiresCondition: this.tiresCondition,
        lightsCondition: this.lightsCondition,
        mechanicalCondition: this.mechanicalCondition,
        fuelLevel: this.fuelLevel,
        damages: this.damages,
        extraCharges: this.extraCharges,
        vehiclePhoto: vehiclePhotoUrl,
        receivedBy: this.receivedBy, // NUEVA FEATURE
        notes: this.generalNotes
      };

      this.checklistsService.createChecklist(checklistData).subscribe({
        next: () => {
          this.loading.set(false);
          alert('Vehículo devuelto exitosamente. ¡Gracias por usar Arsenior Rent!');
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