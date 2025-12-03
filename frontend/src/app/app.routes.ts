import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Rutas Públicas
  {
    path: '',
    loadComponent: () => import('./components/home/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./components/reset-password/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./components/verify-email/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'catalog',
    loadComponent: () => import('./components/car-catalog/car-catalog/car-catalog.component').then(m => m.CarCatalogComponent)
  },
  {
    path: 'car/:id',
    loadComponent: () => import('./components/car-details/car-details/car-details.component').then(m => m.CarDetailsComponent)
  },

  // Rutas Protegidas - Usuario
  {
    path: 'my-reservations',
    loadComponent: () => import('./components/my-reservations/my-reservations/my-reservations.component').then(m => m.MyReservationsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'checkout/:carId',
    loadComponent: () => import('./components/checkout/checkout/checkout.component').then(m => m.CheckoutComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'checklist-pickup/:reservationId',
    loadComponent: () => import('./components/checklist-pickup/checklist-pickup/checklist-pickup.component').then(m => m.ChecklistPickupComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'checklist-return/:reservationId',
    loadComponent: () => import('./components/checklist-return/checklist-return/checklist-return.component').then(m => m.ChecklistReturnComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'rating/:reservationId',
    loadComponent: () => import('./components/rating/rating/rating.component').then(m => m.RatingComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/user-profile/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'payment-history',
    loadComponent: () => import('./components/payment-history/payment-history/payment-history.component').then(m => m.PaymentHistoryComponent),
    canActivate: [AuthGuard]
  },

  // Rutas Protegidas - Admin
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/inventory',
    loadComponent: () => import('./components/admin-inventory/admin-inventory/admin-inventory.component').then(m => m.AdminInventoryComponent),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/reservations',
    loadComponent: () => import('./components/admin-reservations/admin-reservations/admin-reservations.component').then(m => m.AdminReservationsComponent),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/tracking',
    loadComponent: () => import('./components/admin-tracking/admin-tracking/admin-tracking.component').then(m => m.AdminTrackingComponent),
    canActivate: [AuthGuard, AdminGuard]
  },

    {

    path: 'admin/maintenance',

    loadComponent: () => import('./components/admin-maintenance/admin-maintenance/admin-maintenance.component').then(m => m.AdminMaintenanceComponent),

    canActivate: [AuthGuard, AdminGuard]

  },

  // Ruta 404
  {
    path: '**',
    redirectTo: ''
  }
];