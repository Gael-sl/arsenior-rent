import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { RegisterRequest } from '../../../models/user.model';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FooterComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  formData: RegisterRequest = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  };

  confirmPassword = '';
  loading = false;
  error = '';
  success = false;
  showPassword = false; // ← NUEVO: para toggle de password

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // ← NUEVO: método para toggle de password
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Agregar estos métodos
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasMinLength = password.length >= 8;
    return hasNumber && hasUpperCase && hasMinLength;
  }

  // Y en el onSubmit() agregar las validaciones:
  onSubmit(): void {
    // Validar campos vacíos
    if (!this.formData.email || !this.formData.password || !this.formData.firstName || !this.formData.lastName || !this.formData.phone) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    // Validar email
    if (!this.validateEmail(this.formData.email)) {
      this.error = 'Por favor ingresa un correo válido';
      return;
    }

    // Validar contraseña
    if (!this.validatePassword(this.formData.password)) {
      this.error = 'La contraseña debe tener mínimo 8 caracteres, 1 número y 1 mayúscula';
      return;
    }

    // Confirmar contraseña
    if (this.confirmPassword !== this.formData.password) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.register(this.formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        // NO redirigir automáticamente - mostrar mensaje de verificación
        // El usuario debe verificar su email primero
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al registrar. Intenta de nuevo.';
      }
    });
  }
}