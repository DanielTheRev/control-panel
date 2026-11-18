import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="bg-base-200 min-h-screen w-full flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-base-100 rounded-2xl shadow-xl border border-base-300 p-6 sm:p-8 space-y-5">
        <div>
          <h1 class="text-xl font-bold text-base-content">Restablecer Contraseña</h1>
          <p class="text-xs text-base-content/60 mt-1">
            Ingresá tu nueva contraseña para acceder al panel.
          </p>
        </div>

        @if (error()) {
        <div role="alert" class="alert alert-error text-xs">
          <span>{{ error() }}</span>
        </div>
        }

        @if (success()) {
        <div role="alert" class="alert alert-success text-xs">
          <span>{{ success() }}</span>
        </div>
        <a routerLink="/login" class="btn btn-primary w-full btn-sm">Ir a Iniciar Sesión</a>
        } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          @if (!tenantFromQuery) {
          <div>
            <label class="block mb-1.5 text-xs font-bold text-base-content uppercase tracking-wider">
              Nombre del Comercio
            </label>
            <input
              type="text"
              formControlName="storeName"
              class="input input-bordered w-full"
              placeholder="El nombre de tu comercio"
            />
          </div>
          }

          <div>
            <label class="block mb-1.5 text-xs font-bold text-base-content uppercase tracking-wider">
              Nueva Contraseña
            </label>
            <input
              type="password"
              formControlName="newPassword"
              class="input input-bordered w-full"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label class="block mb-1.5 text-xs font-bold text-base-content uppercase tracking-wider">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              formControlName="confirmPassword"
              class="input input-bordered w-full"
              placeholder="Repetí la contraseña"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="btn btn-primary w-full font-bold text-sm"
          >
            @if (loading()) {
            <span class="loading loading-spinner loading-sm"></span>
            Guardando...
            } @else {
            Guardar nueva contraseña
            }
          </button>
        </form>
        }
      </div>
    </section>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  form!: FormGroup;
  token = '';
  tenantFromQuery = '';
  scope: 'admin' | 'employee' = 'admin';

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    this.token = qp['token'] || '';
    this.tenantFromQuery = qp['tenant'] || qp['store'] || '';
    this.scope = qp['scope'] === 'employee' ? 'employee' : 'admin';

    this.form = this.fb.group({
      storeName: [this.tenantFromQuery, [Validators.required, Validators.minLength(2)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    if (!this.token) {
      this.error.set('El enlace de recuperación es inválido o está incompleto.');
    }
  }

  onSubmit(): void {
    if (!this.token) return;
    if (this.form.invalid) {
      this.error.set('Completá todos los campos (mínimo 6 caracteres).');
      return;
    }

    const { storeName, newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService
      .resetPassword({
        storeName: storeName.trim(),
        token: this.token,
        newPassword,
        scope: this.scope,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Contraseña actualizada correctamente. Ya podés iniciar sesión.');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.error?.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.'
          );
        },
      });
  }
}
