import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Notification, 
  NotificationsResponse, 
  UnreadCountResponse 
} from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  
  // Signals para estado reactivo
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  loading = signal<boolean>(false);

  // Polling subscription
  private pollingSubscription: Subscription | null = null;
  private readonly POLL_INTERVAL = 60000; // 1 minuto

  constructor(private http: HttpClient) {}

  // Obtener notificaciones del usuario
  getNotifications(unreadOnly: boolean = false): Observable<NotificationsResponse> {
    this.loading.set(true);
    const params = unreadOnly ? '?unreadOnly=true' : '';
    
    return this.http.get<NotificationsResponse>(`${this.apiUrl}${params}`)
      .pipe(
        tap(response => {
          this.notifications.set(response.notifications);
          this.unreadCount.set(response.unreadCount);
          this.loading.set(false);
        })
      );
  }

  // Obtener solo el conteo de no leidas
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`)
      .pipe(
        tap(response => {
          this.unreadCount.set(response.count);
        })
      );
  }

  // Marcar una notificacion como leida
  markAsRead(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        tap(() => {
          // Actualizar localmente
          this.notifications.update(notifications => 
            notifications.map(n => 
              n.id === id ? { ...n, isRead: true } : n
            )
          );
          this.unreadCount.update(count => Math.max(0, count - 1));
        })
      );
  }

  // Marcar todas como leidas
  markAllAsRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/mark-all-read`, {})
      .pipe(
        tap(() => {
          this.notifications.update(notifications => 
            notifications.map(n => ({ ...n, isRead: true }))
          );
          this.unreadCount.set(0);
        })
      );
  }

  // Eliminar notificacion
  deleteNotification(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {
          const notification = this.notifications().find(n => n.id === id);
          this.notifications.update(notifications => 
            notifications.filter(n => n.id !== id)
          );
          if (notification && !notification.isRead) {
            this.unreadCount.update(count => Math.max(0, count - 1));
          }
        })
      );
  }

  // Iniciar polling para actualizaciones en tiempo real
  startPolling(): void {
    if (this.pollingSubscription) {
      return; // Ya hay un polling activo
    }

    // Primera carga
    this.getUnreadCount().subscribe();

    // Polling cada minuto
    this.pollingSubscription = interval(this.POLL_INTERVAL).subscribe(() => {
      this.getUnreadCount().subscribe();
    });
  }

  // Detener polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // Limpiar estado (al cerrar sesion)
  clearState(): void {
    this.stopPolling();
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  // Helper: obtener icono por tipo
  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'reminder_pickup': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'reminder_return': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      'reservation_confirmed': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'reservation_cancelled': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      'payment_received': 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      'checklist_complete': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      'rating_request': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      'system': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[type] || icons['system'];
  }

  // Helper: obtener color por tipo
  getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      'reminder_pickup': 'text-blue-600 bg-blue-100',
      'reminder_return': 'text-amber-600 bg-amber-100',
      'reservation_confirmed': 'text-emerald-600 bg-emerald-100',
      'reservation_cancelled': 'text-red-600 bg-red-100',
      'payment_received': 'text-green-600 bg-green-100',
      'checklist_complete': 'text-purple-600 bg-purple-100',
      'rating_request': 'text-yellow-600 bg-yellow-100',
      'system': 'text-stone-600 bg-stone-100'
    };
    return colors[type] || colors['system'];
  }

  // Helper: formatear tiempo relativo
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} dias`;
    
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
}
