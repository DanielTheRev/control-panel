import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IProductPrices } from '../../../interfaces/product.interface';

@Component({
  selector: 'app-price-preview',
  standalone: true,
  imports: [MatIconModule, CurrencyPipe],
  templateUrl: './price-preview.html',
  styleUrl: './price-preview.scss'
})
export class PricePreview {
  prices = input.required<IProductPrices>();
}
