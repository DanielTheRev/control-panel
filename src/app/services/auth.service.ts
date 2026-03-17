import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

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
    console.log('🔄 Inicializando estado de autenticación...');
    this.setLoading(true);
    return this.checkAuthStatus().pipe(
      tap({
        next: (user) => {
          if (user) {
            console.log('✅ Usuario autenticado encontrado:');
            console.table(user);
            this.setAuthenticatedState(user);
          } else {
            console.log('❌ No hay usuario autenticado');
            this.setUnauthenticatedState();
          }
        },
        error: (error) => {
          console.error('❌ Error verificando estado de autenticación:', error);

          this.setUnauthenticatedState();
        },
        complete: () => {
          this.setLoading(false);
          console.log('✅ Inicialización de auth completada');
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

    return this.http
      .post<LoginResponse>(`${this.API_URL}/admin/login`, {
        ...credentials,
        provider: AuthProvider.Email,
      })
      .pipe(
        tap((response: LoginResponse) => {
          console.log(response);
          if (response.success) {
            this.setAuthenticatedState(response.user);
            console.log('✅ Login exitoso:', response.user);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          const errorMessage = error.error?.message || 'Error de conexión';
          this.setUnauthenticatedState(errorMessage);
          console.error('❌ Error en login:', error);
          return throwError(() => error);
        }),
      );
  }

  logout(): Observable<any> {
    this.setLoading(true);

    return this.http.post(`${this.API_URL}/logout`, {}).pipe(
      tap(() => {
        this.setUnauthenticatedState();
        this.router.navigate(['/login']);
        console.log('✅ Logout exitoso');
      }),
      catchError((error: HttpErrorResponse) => {
        // Incluso si hay error en el logout del server, limpiamos el estado local
        this.setUnauthenticatedState();
        this.router.navigate(['/login']);
        console.error('⚠️ Error en logout (limpiando estado local):', error);
        return of(null);
      }),
    );
  }

  checkAuthStatus(): Observable<IUser | null> {
    return this.http.get<IUser>(`${this.API_URL}/getUser`).pipe(
      map((response) => response),
      catchError(() => {
        console.log('❌ Usuario no autenticado');
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
          console.warn(
            '⚠️ Acceso denegado: Se requieren permisos de administrador',
          );
          this.router.navigate(['/login']);
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
    console.log('🔄 Refrescando estado de autenticación manualmente...');
    this.initializeAuthState();
  }
}
