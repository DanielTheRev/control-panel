import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

import { CashRegisterSession } from '../interfaces/cash-register.interface';

export type { CashRegisterSession };

@Injectable({
  providedIn: 'root',
})
export class CashRegisterService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cash-register`;

  async getCurrentSession(): Promise<CashRegisterSession> {
    return await firstValueFrom(this.http.get<CashRegisterSession>(`${this.apiUrl}/current`));
  }

  async openSession(initialBalance: number): Promise<CashRegisterSession> {
    return await firstValueFrom(this.http.post<CashRegisterSession>(`${this.apiUrl}/open`, { initialBalance }));
  }

  async closeSession(actualCloseBalance: number, notes?: string): Promise<CashRegisterSession> {
    return await firstValueFrom(
      this.http.post<CashRegisterSession>(`${this.apiUrl}/close`, { actualCloseBalance, notes })
    );
  }
}
