import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DebugService } from '../../services/debug.service';
import { LoginCredentials } from '../../interfaces/auth.interfaces';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  formB = inject(FormBuilder);
  route = inject(ActivatedRoute);
  #debug = inject(DebugService);
  brandName = environment.brandName;

  // Estado local del componente
  showPassword = signal(false);
  submitAttempted = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const storeParam = this.route.snapshot.queryParams['store'] || this.route.snapshot.queryParams['tenant'];
    const savedStore = localStorage.getItem('lastStoreName');
    const initialStore = (storeParam || savedStore || '').trim();

    this.loginForm = this.formBuilder.group({
      storeName: [initialStore, [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true],
      isEmployee: [false],
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
      const storeName = (this.loginForm.get('storeName')?.value || '').trim();
      const credentials: LoginCredentials = {
        storeName,
        email: this.loginForm.get('email')?.value?.trim().toLowerCase(),
        password: this.loginForm.get('password')?.value,
        rememberMe: Boolean(this.loginForm.get('rememberMe')?.value),
        isEmployee: Boolean(this.loginForm.get('isEmployee')?.value),
      };
      
      this.#debug.log('🔐 Intentando login con:', { tenantSlug: credentials.tenantSlug, email: credentials.email });

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.#debug.log('✅ Login exitoso:', response);
          if (typeof window !== 'undefined') {
            window.location.href = '/home';
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          this.#debug.error('❌ Error en login:', error);
          // El error ya se maneja en el servicio
        },
      });
    } else {
      this.#debug.log('❌ Formulario inválido');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  forgotPasswordMode = signal(false);
  forgotLoading = signal(false);
  forgotSuccess = signal<string | null>(null);
  forgotError = signal<string | null>(null);

  toggleForgotPassword() {
    this.forgotPasswordMode.update((v) => !v);
    this.forgotSuccess.set(null);
    this.forgotError.set(null);
    this.clearError();
  }

  onForgotPassword() {
    const storeName = (this.loginForm.get('storeName')?.value || '').trim();
    const email = (this.loginForm.get('email')?.value || '').trim().toLowerCase();
    const isEmployee = Boolean(this.loginForm.get('isEmployee')?.value);

    if (!storeName || !email) {
      this.forgotError.set('Ingresá el Nombre del Comercio y tu Email para recuperar la clave.');
      return;
    }

    this.forgotLoading.set(true);
    this.forgotError.set(null);
    this.forgotSuccess.set(null);

    this.authService.forgotPassword({ storeName, email, isEmployee }).subscribe({
      next: () => {
        this.forgotLoading.set(false);
        this.forgotSuccess.set(
          'Si los datos coinciden, te enviamos un enlace de recuperación a tu email.'
        );
      },
      error: (err) => {
        this.forgotLoading.set(false);
        this.forgotError.set(
          err?.error?.message || 'No se pudo enviar el email de recuperación.'
        );
      },
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
        if (fieldName === 'storeName') return 'El nombre del comercio es requerido';
        return `${fieldName === 'email' ? 'Email' : 'Contraseña'} es requerido`;
      }
      if (field.errors['email']) {
        return 'Email no válido';
      }
      if (field.errors['minlength']) {
        if (fieldName === 'storeName') return 'El nombre del comercio debe tener al menos 2 caracteres';
        return 'La contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }
}
