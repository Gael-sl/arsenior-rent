import { Component } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { LoginRequest } from '../../../models/user.model';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FooterComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  credentials: LoginRequest = {
    email: '',
    password: ''
  };

  loading = false;
  error = '';
  returnUrl = '/';
  showPassword = false;
  welcomeMessage = '';  // ← Nuevo mensaje de bienvenida

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Obtener el returnUrl si viene de un guard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Mostrar / ocultar contraseña
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

    // Validar email
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Validar contraseña (mínimo 8 caracteres, 1 número, 1 mayúscula)
  validatePassword(password: string): boolean {
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasMinLength = password.length >= 8;
    return hasNumber && hasUpperCase && hasMinLength;
  }

  onSubmit(): void {
    // VALIDACIONES NUEVAS
    if (!this.credentials.email || !this.credentials.password) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    if (!this.validateEmail(this.credentials.email)) {
      this.error = 'Por favor ingresa un correo válido (ejemplo@dominio.com)';
      return;
    }

    if (!this.validatePassword(this.credentials.password)) {
      this.error = 'La contraseña debe tener mínimo 8 caracteres, 1 número y 1 mayúscula';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.loading = false;
        
        console.log('Login exitoso:', response.user); // Debug
        
        // FORZAR actualización de signals
        this.authService.currentUser.set(response.user);
        this.authService.isAuthenticated.set(true);
        this.authService.isAdmin.set(response.user.role === 'admin');
        
        // Pequeño delay para asegurar que se actualiza el estado
        setTimeout(() => {
          // Redirigir según el rol
          if (response.user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate([this.returnUrl]);
          }
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      }
    });
  }
}