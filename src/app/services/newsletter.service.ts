import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface INewsletterSubscriber {
  _id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/newsletter`;

  getSubscribers(): Observable<INewsletterSubscriber[]> {
    return this.#http.get<INewsletterSubscriber[]>(this.#apiUrl);
  }

  deleteSubscriber(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#apiUrl}/${id}`);
  }
}
