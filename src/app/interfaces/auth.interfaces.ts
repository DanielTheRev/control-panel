import { IUser } from './User.interface';

export interface LoginCredentials {
  storeName?: string;
  tenantSlug?: string;
  email: string;
  password: string;
  rememberMe?: boolean;
  isEmployee?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: IUser;
  token?: string;
  tenantSlug?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export enum AuthProvider {
  GOOGLE = 'google',
  Email = 'email',
}
