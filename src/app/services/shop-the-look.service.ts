import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HotToastService } from '@ngxpert/hot-toast';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { IShopTheLook } from '../interfaces/shop-the-look.interface';

@Injectable({
  providedIn: 'root'
})
export class ShopTheLookService {
  #http = inject(HttpClient);
  #toast = inject(HotToastService);
  #apiUrl = `${environment.apiUrl}/shop-the-look`;

  getAll() {
    return firstValueFrom(
      this.#http.get<IShopTheLook[]>(this.#apiUrl).pipe(
        this.#toast.observe({
          error: { content: 'Error al obtener campañas de Shop The Look', position: 'top-right', theme: 'snackbar' }
        })
      )
    );
  }

  getById(id: string) {
    return firstValueFrom(
      this.#http.get<IShopTheLook>(`${this.#apiUrl}/${id}`).pipe(
        this.#toast.observe({
          error: { content: 'Error al obtener la campaña', position: 'top-right', theme: 'snackbar' }
        })
      )
    );
  }

  create(data: FormData) {
    return firstValueFrom(
      this.#http.post<IShopTheLook>(this.#apiUrl, data).pipe(
        this.#toast.observe({
          loading: { content: 'Creando campaña...', position: 'top-right', theme: 'snackbar' },
          success: { content: 'Campaña creada correctamente', position: 'top-right', theme: 'snackbar' },
          error: { content: 'Error al crear la campaña', position: 'top-right', theme: 'snackbar' }
        })
      )
    );
  }

  update(id: string, data: FormData | Partial<IShopTheLook>) {
    return firstValueFrom(
      this.#http.put<IShopTheLook>(`${this.#apiUrl}/${id}`, data).pipe(
        this.#toast.observe({
          loading: { content: 'Actualizando campaña...', position: 'top-right', theme: 'snackbar' },
          success: { content: 'Campaña actualizada correctamente', position: 'top-right', theme: 'snackbar' },
          error: { content: 'Error al actualizar la campaña', position: 'top-right', theme: 'snackbar' }
        })
      )
    );
  }

  delete(id: string) {
    return firstValueFrom(
      this.#http.delete<{ message: string }>(`${this.#apiUrl}/${id}`).pipe(
        this.#toast.observe({
          loading: { content: 'Eliminando campaña...', position: 'top-right', theme: 'snackbar' },
          success: { content: 'Campaña eliminada correctamente', position: 'top-right', theme: 'snackbar' },
          error: { content: 'Error al eliminar la campaña', position: 'top-right', theme: 'snackbar' }
        })
      )
    );
  }
}
