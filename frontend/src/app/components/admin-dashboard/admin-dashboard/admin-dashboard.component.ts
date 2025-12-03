import { Component, OnInit, OnDestroy, signal, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner/loading-spinner.component';
import { DashboardStats } from '../../../models/stats.model';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('segmentChart') segmentChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reservationsChart') reservationsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('occupancyChart') occupancyChartRef!: ElementRef<HTMLCanvasElement>;

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal('');
  
  private revenueChart: Chart | null = null;
  private segmentChart: Chart | null = null;
  private reservationsChart: Chart | null = null;
  private occupancyChart: Chart | null = null;
  
  private isBrowser: boolean;

  readonly Math = Math;

  constructor(
    private adminService: AdminService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadStats();
  }
  
  ngAfterViewInit(): void {
    // Las gráficas se inicializarán cuando lleguen los datos
  }

  loadStats(): void {
    this.loading.set(true);
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
        
        // Inicializar gráficas después de que los datos estén listos
        if (this.isBrowser) {
          setTimeout(() => this.initCharts(), 100);
        }
      },
      error: (err) => {
        this.error.set('Error al cargar estadísticas');
        this.loading.set(false);
      }
    });
  }
  
  private initCharts(): void {
    const stats = this.stats();
    if (!stats) return;
    
    this.initRevenueChart(stats);
    this.initSegmentChart(stats);
    this.initReservationsChart(stats);
    this.initOccupancyChart(stats);
  }
  
  private initRevenueChart(stats: DashboardStats): void {
    if (!this.revenueChartRef?.nativeElement) return;
    
    // Destruir gráfica anterior si existe
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }
    
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const labels = stats.revenueByMonth.map(m => m.month);
    const data = stats.revenueByMonth.map(m => m.revenue);
    
    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ingresos',
          data: data,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#000000',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#000000',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            callbacks: {
              label: (context) => {
                return `$${context.parsed.y?.toLocaleString('es-MX')} MXN`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => `$${Number(value).toLocaleString('es-MX')}`
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  private initSegmentChart(stats: DashboardStats): void {
    if (!this.segmentChartRef?.nativeElement) return;
    
    if (this.segmentChart) {
      this.segmentChart.destroy();
    }
    
    const ctx = this.segmentChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const labels = stats.reservationsBySegment.map(s => `Segmento ${s.segment}`);
    const data = stats.reservationsBySegment.map(s => s.count);
    
    this.segmentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#000000',   // Segmento A - Negro
            '#57534e',   // Segmento B - Stone-600
            '#a8a29e'    // Segmento C - Stone-400
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: '#000000',
            callbacks: {
              label: (context) => {
                const segment = stats.reservationsBySegment[context.dataIndex];
                return [
                  `${context.parsed} reservas`,
                  `$${segment.revenue.toLocaleString('es-MX')} MXN`
                ];
              }
            }
          }
        }
      }
    });
  }
  
  private initReservationsChart(stats: DashboardStats): void {
    if (!this.reservationsChartRef?.nativeElement) return;
    
    if (this.reservationsChart) {
      this.reservationsChart.destroy();
    }
    
    const ctx = this.reservationsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const labels = stats.revenueByMonth.map(m => m.month);
    const data = stats.revenueByMonth.map(m => m.reservations);
    
    this.reservationsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Reservas',
          data: data,
          backgroundColor: '#000000',
          borderRadius: 8,
          barThickness: 30
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#000000'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  private initOccupancyChart(stats: DashboardStats): void {
    if (!this.occupancyChartRef?.nativeElement) return;
    
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }
    
    const ctx = this.occupancyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const totalVehicles = stats.availableVehicles + stats.activeRentals + stats.vehiclesInMaintenance;
    
    this.occupancyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Disponibles', 'En Renta', 'Mantenimiento'],
        datasets: [{
          data: [stats.availableVehicles, stats.activeRentals, stats.vehiclesInMaintenance],
          backgroundColor: [
            '#10b981',   // Disponibles - Emerald
            '#000000',   // En Renta - Negro
            '#f59e0b'    // Mantenimiento - Amber
          ],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#000000'
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getGrowthClass(growth: number): string {
    return growth >= 0 ? 'text-emerald-600' : 'text-red-600';
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? '↑' : '↓';
  }
  
  getGrowthBgClass(growth: number): string {
    return growth >= 0 ? 'bg-emerald-50' : 'bg-red-50';
  }
  
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'activa': 'bg-emerald-100 text-emerald-800',
      'confirmada': 'bg-blue-100 text-blue-800',
      'pendiente': 'bg-amber-100 text-amber-800',
      'completada': 'bg-stone-100 text-stone-800',
      'cancelada': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-stone-100 text-stone-800';
  }
  
  ngOnDestroy(): void {
    // Limpiar gráficas al destruir el componente
    this.revenueChart?.destroy();
    this.segmentChart?.destroy();
    this.reservationsChart?.destroy();
    this.occupancyChart?.destroy();
  }
}