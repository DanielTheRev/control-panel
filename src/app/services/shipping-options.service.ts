import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { IShippingOption } from "../interfaces/shipping.interface";
import { firstValueFrom } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ShippingOptionsService {
  #http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/shipping`;

  getById(id: string) {
    return this.#http.get<IShippingOption>(`${this.apiUrl}/${id}`);
  }

  create(shippingOption: Partial<IShippingOption>) {
    return firstValueFrom(this.#http.post<IShippingOption>(`${this.apiUrl}`, shippingOption));
  }

  update(id: string, shippingOption: Partial<IShippingOption>) {
    return firstValueFrom(this.#http.put<IShippingOption>(`${this.apiUrl}/${id}`, shippingOption));
  }

  delete(id: string) {
    return firstValueFrom(this.#http.delete<{ success: true, id: string }>(`${this.apiUrl}/${id}`));
  }
}
