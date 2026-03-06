import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../interfaces/auth.interfaces';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  formB = inject(FormBuilder);
  brandName = environment.brandName;

  // Estado local del componente
  showPassword = signal(false);
  submitAttempted = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

  }

  // Computed properties del servicio
  get loading() {
    return this.authService.loading();
  }

  get error() {
    return this.authService.error();
  }

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  togglePasswordVisibility() {
    this.showPassword.update((show) => !show);
  }

  onSubmit() {
    this.submitAttempted.set(true);

    if (this.loginForm.valid) {
      const credentials: LoginCredentials = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
      };

      console.log('🔐 Intentando login con:', { email: credentials.email });

      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('✅ Login exitoso:', response);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.error('❌ Error en login:', error);
          // El error ya se maneja en el servicio
        },
      });
    } else {
      console.log('❌ Formulario inválido');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  clearError() {
    this.authService.clearError();
  }

  // Helper methods para validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(
      field &&
      field.invalid &&
      (field.dirty || field.touched || this.submitAttempted())
    );
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName === 'email' ? 'Email' : 'Contraseña'} es requerido`;
      }
      if (field.errors['email']) {
        return 'Email no válido';
      }
      if (field.errors['minlength']) {
        return 'La contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }
}
