import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  // Fechas para búsqueda
  startDate = '';
  endDate = '';
  startTime = '10:00';
  endTime = '18:00';
  
  // Estado
  datesSelected = false;
  dateError = '';

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}
  
  howItWorksSteps = [
    {
      number: '1',
      title: 'Inicia tu Experiencia',
      description: 'Configura fechas, horarios y preferencias para comenzar tu viaje premium.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    },
    {
      number: '2',
      title: 'Elige tu Vehículo',
      description: 'Explora nuestra selecta flota y elige el plan que mejor se ajuste a tus necesidades.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    {
      number: '3',
      title: 'Confirma tu Reserva',
      description: 'Finaliza tu reserva de forma segura y recibe la confirmación al instante.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
    }
  ];

  features = [
    {
      title: 'Flota Premium',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
    },
    {
      title: 'Seguro Completo',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
    },
    {
      title: 'Servicio 24/7',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
    {
      title: '5 Estrellas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    }
  ];

  ngOnInit(): void {
    // Scroll to top on component load (only in browser)
    if (typeof window !== 'undefined' && window?.scrollTo) {
      window.scrollTo(0, 0);
    }
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  searchVehicles(): void {
    this.dateError = '';
    
    if (!this.startDate || !this.endDate) {
      this.dateError = 'Por favor selecciona ambas fechas';
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (end <= start) {
      this.dateError = 'La fecha de devolución debe ser posterior a la de retiro';
      return;
    }

    // Guardar fechas en localStorage para el catálogo
    localStorage.setItem('rental_dates', JSON.stringify({
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.startTime,
      endTime: this.endTime
    }));

    this.datesSelected = true;
    this.router.navigate(['/catalog']);
  }
}