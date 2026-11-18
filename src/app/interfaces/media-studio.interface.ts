import { IProductImage, IProductImageCrop } from './product.interface';

export type MediaStudioAspectRatio = 'original' | '1:1' | '4:5' | '9:16' | '16:9';

export interface MediaStudioCropRequest {
  aspectRatio: MediaStudioAspectRatio;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  quality?: number;
}

export interface MediaStudioUploadResult extends IProductImage {
  id: string;
  originalBytes?: number;
  savingsPercent?: number;
  crops: IProductImageCrop[];
}

export interface MediaStudioUploadOptions {
  quality?: number;
  folder?: string;
  idPrefix?: string;
}
