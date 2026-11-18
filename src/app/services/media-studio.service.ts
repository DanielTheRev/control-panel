import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { IProductImage, IProductImageCrop } from '../interfaces/product.interface';

import {
  MediaStudioAspectRatio,
  MediaStudioCropRequest,
  MediaStudioUploadOptions,
  MediaStudioUploadResult,
} from '../interfaces/media-studio.interface';

export type {
  MediaStudioAspectRatio,
  MediaStudioCropRequest,
  MediaStudioUploadOptions,
  MediaStudioUploadResult,
};

@Injectable({
  providedIn: 'root',
})
export class MediaStudioService {
  readonly #http = inject(HttpClient);
  readonly #endpoint = `${environment.apiUrl}/addons/media-studio/upload`;

  /**
   * Sube una imagen original junto con coordenadas normalizadas (0..1) por cada relación de aspecto.
   * El servidor (sharp) realiza el recorte y la optimización automática a WebP.
   */
  upload(
    file: File,
    crops: MediaStudioCropRequest[],
    options: MediaStudioUploadOptions = {}
  ): Observable<MediaStudioUploadResult> {
    if (!crops || crops.length === 0) {
      throw new Error('Media Studio requiere al menos un recorte (crops) para subir la imagen.');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('crops', JSON.stringify(crops));

    if (options.quality !== undefined) {
      formData.append('quality', String(options.quality));
    }
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.idPrefix) {
      formData.append('idPrefix', options.idPrefix);
    }

    return this.#http
      .post<{ success: boolean; data: MediaStudioUploadResult }>(this.#endpoint, formData)
      .pipe(map((res) => res.data));
  }
}
