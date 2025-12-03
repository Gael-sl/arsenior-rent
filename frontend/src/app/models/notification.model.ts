export interface Notification {
  id: number;
  userId: number;
  reservationId: number | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  emailSent: boolean;
  emailSentAt: string | null;
  createdAt: string;
  // Datos relacionados
  carBrand?: string;
  carModel?: string;
  startDate?: string;
  endDate?: string;
}

export type NotificationType = 
  | 'reminder_pickup'
  | 'reminder_return'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'payment_received'
  | 'checklist_complete'
  | 'rating_request'
  | 'system';

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  count: number;
}
