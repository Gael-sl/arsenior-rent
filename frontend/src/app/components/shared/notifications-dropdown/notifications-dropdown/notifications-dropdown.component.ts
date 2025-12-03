import { Component, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrls: ['./notifications-dropdown.component.css']
})
export class NotificationsDropdownComponent implements OnInit, OnDestroy {
  isOpen = signal(false);
  loading = signal(false);

  constructor(
    public notificationsService: NotificationsService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.notificationsService.startPolling();
  }

  ngOnDestroy(): void {
    this.notificationsService.stopPolling();
  }

  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleDropdown(): void {
    const wasOpen = this.isOpen();
    this.isOpen.update(v => !v);

    // Cargar notificaciones al abrir
    if (!wasOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationsService.getNotifications().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (!notification.isRead) {
      this.notificationsService.markAsRead(notification.id).subscribe();
    }
  }

  markAllRead(): void {
    this.notificationsService.markAllAsRead().subscribe();
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationsService.deleteNotification(id).subscribe();
  }

  getIcon(type: string): string {
    return this.notificationsService.getNotificationIcon(type);
  }

  getColor(type: string): string {
    return this.notificationsService.getNotificationColor(type);
  }

  getTimeAgo(date: string): string {
    return this.notificationsService.getTimeAgo(date);
  }

  getNotificationLink(notification: Notification): string {
    if (notification.reservationId) {
      return '/my-reservations';
    }
    return '#';
  }
}
