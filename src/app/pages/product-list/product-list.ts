import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { IProduct } from '../../interfaces/product.interface';

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  productState = httpResource<IProduct[]>(
    () => ({
      url: 'http://localhost:3000/api/products/all',
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
