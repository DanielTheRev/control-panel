import { IUser } from './User.interface';

export interface LoginCredentials {
  tenantSlug: string;
  email: string;
  password: string;
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
