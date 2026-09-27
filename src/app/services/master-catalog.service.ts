import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface MasterCatalogProduct {
  _id?: string;
  barcode: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  unit?: string;
  isSoldByWeight?: boolean;
  suggestedPrice?: number;
  source?: 'seed' | 'crowdsourced' | 'admin';
  verified?: boolean;
}

export interface MasterCatalogLookupResponse {
  success: boolean;
  found: boolean;
  source?: 'database' | 'external' | 'not_found';
  product?: MasterCatalogProduct;
}

export interface MasterCatalogSearchResponse {
  success: boolean;
  count: number;
  data: MasterCatalogProduct[];
}

@Injectable({
  providedIn: 'root'
})
export class MasterCatalogService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/master-catalog`;

  /**
   * Consulta el catálogo global por código de barras.
   * Busca en la base global centralizada y como fallback en OpenFoodFacts.
   */
  lookupBarcode(barcode: string): Observable<MasterCatalogLookupResponse> {
    const clean = encodeURIComponent(barcode.trim());
    return this.http.get<MasterCatalogLookupResponse>(`${this.baseUrl}/lookup/${clean}`);
  }

  /**
   * Búsqueda por texto (nombre, marca, categoría) en el catálogo global.
   */
  search(query: string, limit: number = 20): Observable<MasterCatalogSearchResponse> {
    const params = new HttpParams()
      .set('q', query.trim())
      .set('limit', limit.toString());

    return this.http.get<MasterCatalogSearchResponse>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Inicialización o re-siembra manual
   */
  seed(): Observable<{ success: boolean; count: number }> {
    return this.http.post<{ success: boolean; count: number }>(`${this.baseUrl}/seed`, {});
  }
}
