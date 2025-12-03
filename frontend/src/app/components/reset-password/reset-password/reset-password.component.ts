import { Component, signal, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  email = '';
  newPassword = '';
  confirmPassword = '';
  
  isLoading = signal(false);
  isValidatingToken = signal(true);
  isTokenValid = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  
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
      this.isValidatingToken.set(false);
      return;
    }
    
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.validateToken();
      } else {
        this.isValidatingToken.set(false);
        this.errorMessage.set('Token no proporcionado. Solicita un nuevo enlace de recuperación.');
      }
    });
  }

  validateToken(): void {
    this.authService.validateResetToken(this.token).subscribe({
      next: (response) => {
        this.isValidatingToken.set(false);
        this.isTokenValid.set(response.valid);
        if (response.email) {
          this.email = response.email;
        }
        if (!response.valid) {
          this.errorMessage.set('El enlace ha expirado o no es válido. Solicita uno nuevo.');
        }
      },
      error: (err) => {
        this.isValidatingToken.set(false);
        this.isTokenValid.set(false);
        this.errorMessage.set('Error al validar el enlace. Por favor solicita uno nuevo.');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  validatePassword(): string | null {
    if (this.newPassword.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(this.newPassword)) {
      return 'La contraseña debe contener al menos una mayúscula';
    }
    if (!/[0-9]/.test(this.newPassword)) {
      return 'La contraseña debe contener al menos un número';
    }
    return null;
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    // Validaciones
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('Por favor completa todos los campos');
      return;
    }

    const passwordError = this.validatePassword();
    if (passwordError) {
      this.errorMessage.set(passwordError);
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('¡Contraseña actualizada correctamente! Redirigiendo al login...');
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Error al cambiar la contraseña');
      }
    });
  }
}
