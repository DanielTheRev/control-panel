import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { IProduct } from '../../interfaces/product.interface';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  productState = httpResource<IProduct[]>(
    () => ({
      url: `${environment.apiUrl}/products/all`,
      method: 'GET',
    }),
    {
      parse: (data: any) => {
        console.log(data);
        return data;
      },
    }
  );
}
