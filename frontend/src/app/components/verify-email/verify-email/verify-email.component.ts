import { Component, signal, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  token = '';
  email = ''; // Para reenviar verificación
  
  isLoading = signal(true);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showResendForm = signal(false);
  resendLoading = signal(false);
  
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Solo ejecutar en el browser, no en SSR
    if (!this.isBrowser) {
      this.isLoading.set(false);
      return;
    }
    
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.verifyEmail();
      } else {
        this.isLoading.set(false);
        this.errorMessage.set('Token de verificación no proporcionado.');
        this.showResendForm.set(true);
      }
    });
  }

  verifyEmail(): void {
    this.authService.verifyEmail(this.token).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.successMessage.set(response.message);
        
        // Si el backend devuelve token y user, hacer login automático
        if (response.token && response.user) {
          // Guardar en localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('arsenior_token', response.token);
            localStorage.setItem('arsenior_user', JSON.stringify(response.user));
          }
          
          // Recargar la página para que el AuthService cargue el usuario del localStorage
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          // Fallback: redirigir al login
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isSuccess.set(false);
        this.errorMessage.set(err.error?.error || err.error?.message || 'Error al verificar el email');
        this.showResendForm.set(true);
      }
    });
  }

  resendVerification(): void {
    if (!this.email) {
      this.errorMessage.set('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage.set('Por favor ingresa un correo electrónico válido');
      return;
    }

    this.resendLoading.set(true);
    this.errorMessage.set(null);

    this.authService.resendVerificationEmail(this.email).subscribe({
      next: (response) => {
        this.resendLoading.set(false);
        this.successMessage.set(response.message);
        this.showResendForm.set(false);
      },
      error: (err) => {
        this.resendLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Error al reenviar el correo de verificación');
      }
    });
  }
}
