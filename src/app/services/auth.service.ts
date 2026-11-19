import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AuthProvider,
  AuthState,
  LoginCredentials,
  LoginResponse,
} from '../interfaces/auth.interfaces';
import { environment } from '../../environments/environment';
import { IUser } from '../interfaces/User.interface';
import { DebugService } from './debug.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  #debug = inject(DebugService);

  // Signals para el estado de autenticación
  private _authState = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
  });

  // Computed properties
  public authState = computed(() => this._authState());
  public isAuthenticated = computed(() => this._authState().isAuthenticated);
  public user = computed(() => this._authState().user);
  public loading = computed(() => this._authState().loading);
  public error = computed(() => this._authState().error);
  public isAdmin = computed(() => this._authState().user?.role === 'admin');
  public isStaff = computed(() => this._authState().user?.role === 'admin' || this._authState().user?.role === 'employee');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  initializeAuthState() {
    this.#debug.log('🔄 Inicializando estado de autenticación...');
    this.setLoading(true);
    return this.checkAuthStatus().pipe(
      tap({
        next: (user) => {
          if (user) {
            this.#debug.log('✅ Usuario autenticado encontrado:');
            this.#debug.table(user);
            this.setAuthenticatedState(user);
          } else {
            this.#debug.log('❌ No hay usuario autenticado');
            this.setUnauthenticatedState();
          }
        },
        error: (error) => {
          this.#debug.error('❌ Error verificando estado de autenticación:', error);

          this.setUnauthenticatedState();
        },
        complete: () => {
          this.setLoading(false);
          this.#debug.log('✅ Inicialización de auth completada');
        },
      }),
    );
  }

  private setLoading(loading: boolean): void {
    this._authState.update((state) => ({ ...state, loading }));
  }

  private setError(error: string | null): void {
    this._authState.update((state) => ({ ...state, error }));
  }

  private setAuthenticatedState(user: IUser): void {
    this._authState.set({
      isAuthenticated: true,
      user,
      loading: false,
      error: null,
    });
  }

  private setUnauthenticatedState(error?: string): void {
    this._authState.set({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: error || null,
    });
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    this.setLoading(true);
    this.setError(null);

    const endpoint = credentials.isEmployee
      ? `${this.API_URL}/employee/login`
      : `${this.API_URL}/admin/login`;

    return this.http
      .post<LoginResponse>(endpoint, {
        ...(credentials.storeName ? { storeName: credentials.storeName } : {}),
        ...(credentials.tenantSlug ? { tenantSlug: credentials.tenantSlug } : {}),
        email: credentials.email,
        password: credentials.password,
        rememberMe: Boolean(credentials.rememberMe),
        provider: AuthProvider.Email,
      })
      .pipe(
        tap((response: LoginResponse) => {
          if (response.success) {
            const resolvedSlug = response.tenantSlug || credentials.tenantSlug;
            if (resolvedSlug && typeof localStorage !== 'undefined') {
              localStorage.setItem('lastTenantSlug', resolvedSlug.trim().toLowerCase());
            }
            if (credentials.storeName && typeof localStorage !== 'undefined') {
              localStorage.setItem('lastStoreName', credentials.storeName.trim());
            }
            this.setAuthenticatedState(response.user);
            this.#debug.log('✅ Login exitoso:', response.user);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          const errorMessage = error.error?.message || 'Error de conexión o credenciales inválidas';
          this.setUnauthenticatedState(errorMessage);
          this.#debug.error('❌ Error en login:', error);
          return throwError(() => error);
        }),
      );
  }

  pinLogin(payload: { pin: string; employeeId?: string; email?: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/employee/pin-login`, payload).pipe(
      tap((response: LoginResponse) => {
        if (response.success) {
          if (response.tenantSlug && typeof localStorage !== 'undefined') {
            localStorage.setItem('lastTenantSlug', response.tenantSlug.trim().toLowerCase());
          }
          this.setAuthenticatedState(response.user);
        }
      }),
    );
  }

  forgotPassword(payload: { storeName: string; email: string; isEmployee: boolean }): Observable<any> {
    const endpoint = payload.isEmployee
      ? `${this.API_URL}/employee/forgot-password`
      : `${this.API_URL}/admin/forgot-password`;
    return this.http.post(endpoint, {
      storeName: payload.storeName,
      email: payload.email,
    });
  }

  resetPassword(payload: {
    storeName?: string;
    tenantSlug?: string;
    token: string;
    newPassword: string;
    email?: string;
    scope: 'admin' | 'employee';
  }): Observable<any> {
    const endpoint =
      payload.scope === 'employee'
        ? `${this.API_URL}/employee/reset-password`
        : `${this.API_URL}/admin/reset-password`;
    return this.http.post(endpoint, {
      ...(payload.storeName ? { storeName: payload.storeName } : {}),
      ...(payload.tenantSlug ? { tenantSlug: payload.tenantSlug } : {}),
      token: payload.token,
      newPassword: payload.newPassword,
      ...(payload.email ? { email: payload.email } : {}),
    });
  }

  private clearTenantCaches(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('vexx_panel_token');
        localStorage.removeItem('gp_store_business_type');
        localStorage.removeItem('cartItems');
        localStorage.removeItem('orderToConfirm');
        localStorage.removeItem('pending_payment');
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith('gp_store_business_type') ||
            key.startsWith('gp_store_theme')
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {}
    }
  }

  logout(): Observable<any> {
    this.setLoading(true);
    this.clearTenantCaches();

    return this.http.post(`${this.API_URL}/logout`, {}).pipe(
      tap(() => {
        this.setUnauthenticatedState();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          this.router.navigate(['/login']);
        }
        this.#debug.log('✅ Logout exitoso');
      }),
      catchError((error: HttpErrorResponse) => {
        // Incluso si hay error en el logout del server, limpiamos el estado local
        this.setUnauthenticatedState();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          this.router.navigate(['/login']);
        }
        this.#debug.error('⚠️ Error en logout (limpiando estado local):', error);
        return of(null);
      }),
    );
  }

  checkAuthStatus(): Observable<IUser | null> {
    return this.http.get<IUser>(`${this.API_URL}/getUser`).pipe(
      tap((user) => {
        if (user && (user as any).tenantSlug) {
          try {
            localStorage.setItem('lastTenantSlug', (user as any).tenantSlug.trim().toLowerCase());
          } catch (e) {}
        }
      }),
      map((response) => response),
      catchError(() => {
        this.#debug.log('❌ Usuario no autenticado');
        return of(null);
      }),
    );
  }

  // Guard helper methods
  canActivate(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    return this.checkAuthStatus().pipe(
      map((user) => {
        if (user) {
          this.setAuthenticatedState(user);
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      }),
    );
  }

  canActivateAdmin(): Observable<boolean> {
    return this.canActivate().pipe(
      map((canActivate) => {
        if (canActivate && this.isAdmin()) {
          return true;
        } else {
          this.#debug.warn(
            '⚠️ Acceso denegado: Se requieren permisos de administrador',
          );
          if (canActivate) {
            this.router.navigate(['/home/pos']);
          } else {
            this.router.navigate(['/login']);
          }
          return false;
        }
      }),
    );
  }

  // Utility methods
  clearError(): void {
    this.setError(null);
  }

  // Método para refrescar manualmente el estado de autenticación
  refreshAuthState(): void {
    this.#debug.log('🔄 Refrescando estado de autenticación manualmente...');
    this.initializeAuthState();
  }
}
