import { inject, Injectable } from '@angular/core';
import { HotToastService, ToastOptions } from '@ngxpert/hot-toast';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  #toast = inject(HotToastService);
  #config: ToastOptions<any> = {
    duration: 3000,
    position: 'top-right',
    dismissible: true,
    style: {
      fontFamily: '"Nunito Variable", sans-serif',
      borderRadius: '10px',
      background: '#333',
      color: '#fff',
    },
  }

  success(message: string) {
    this.#toast.success(message, this.#config);
  }

  error(message: string) {
    this.#toast.error(message, this.#config);
  }

  warning(message: string) {
    this.#toast.warning(message, this.#config);
  }

  info(message: string) {
    this.#toast.info(message, this.#config);
  }
}