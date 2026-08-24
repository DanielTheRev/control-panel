import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../interfaces/auth.interfaces';
import { environment } from '../../../environments/environment';
import { getTenantSlug } from '../../utils/tenant.utils';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  formB = inject(FormBuilder);
  route = inject(ActivatedRoute);
  brandName = environment.brandName;

  // Estado local del componente
  showPassword = signal(false);
  submitAttempted = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    const storeParam = this.route.snapshot.queryParams['store'] || this.route.snapshot.queryParams['tenant'];
    const savedTenant = localStorage.getItem('lastTenantSlug');
    const initialTenant = (storeParam || savedTenant || getTenantSlug() || '').trim().toLowerCase();

    this.loginForm = this.formBuilder.group({
      tenantSlug: [initialTenant, [Validators.required, Validators.minLength(2)]],
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
      const tenantSlug = (this.loginForm.get('tenantSlug')?.value || '').trim().toLowerCase();
      const credentials: LoginCredentials = {
        tenantSlug,
        email: this.loginForm.get('email')?.value?.trim().toLowerCase(),
        password: this.loginForm.get('password')?.value,
      };
      
      console.log('🔐 Intentando login con:', { tenantSlug: credentials.tenantSlug, email: credentials.email });

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
        if (fieldName === 'tenantSlug') return 'El identificador de tienda es requerido';
        return `${fieldName === 'email' ? 'Email' : 'Contraseña'} es requerido`;
      }
      if (field.errors['email']) {
        return 'Email no válido';
      }
      if (field.errors['minlength']) {
        if (fieldName === 'tenantSlug') return 'El nombre de tienda debe tener al menos 2 caracteres';
        return 'La contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }
}
