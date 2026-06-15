import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IProductPrices, IProductFinance } from '../../../interfaces/product.interface';

@Component({
  selector: 'app-price-preview',
  standalone: true,
  imports: [MatIconModule, CurrencyPipe, DecimalPipe],
  templateUrl: './price-preview.html',
  styleUrl: './price-preview.scss'
})
export class PricePreview {
  price = input.required<IProductPrices>();
  finance = input<IProductFinance | null>(null);

  getProviderCost(): number {
    return this.finance()?.providerCost?.inARS || 0;
  }

  getAdditionalCostsTotal(): number {
    const providerCost = this.getProviderCost();
    return (this.finance()?.additionalCosts || []).reduce((sum, cost) => {
      if (cost.type === 'fixed') {
        return sum + cost.value;
      } else {
        return sum + (providerCost * cost.value) / 100;
      }
    }, 0);
  }

  getTotalCosts(): number {
    return this.getProviderCost() + this.getAdditionalCostsTotal();
  }

  getMpCommissionAmount(): number {
    const listPrice = this.price()?.listPrice || 0;
    const totalCosts = this.getTotalCosts();
    const card6InstallmentsProfit = this.finance()?.calculatedProfits?.card6Installments || 0;
    return Math.max(0, listPrice - totalCosts - card6InstallmentsProfit);
  }

  getMpCommissionPercent(): number {
    const listPrice = this.price()?.listPrice || 0;
    if (listPrice <= 0) return 0;
    return (this.getMpCommissionAmount() / listPrice) * 100;
  }

  getDiscountPercent(): number {
    return this.price()?.discountPercentageTransfer || 0;
  }

  getSacarPasarela(): number {
    const d = this.getDiscountPercent();
    const mp = this.finance()?.maxSafeDiscount ?? 0;
    return Math.min(d, mp);
  }

  getSacarGanancia(): number {
    const d = this.getDiscountPercent();
    const mp = this.finance()?.maxSafeDiscount ?? 0;
    return Math.max(0, d - mp);
  }
}
