import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  ChannelKey,
  ChannelRuleMode,
  IDisplaySummaryItem,
  IPaymentRestrictions,
  IPriceBuilderCalculateResult,
  IPriceBuilderChannelPricing,
  IPriceBuilderChannelRule,
  IPriceBuilderChannelSnapshot,
  IPriceBuilderInsight,
  IPriceBuilderPresetItem,
  PricingPresetKey,
} from '../../../interfaces/price-builder.interface';
import { ICostConcept, IProductPrices } from '../../../interfaces/product.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { PriceBuilderService } from '../../../services/price-builder.service';
import { ProductService } from '../../../services/product.service';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { IProductFormBlock } from '../product-form-block.interface';

const CHANNEL_ORDER: ChannelKey[] = ['cash', 'transfer', 'qr', 'debit', 'credit1Pay', 'list'];

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  cash: '1. Efectivo',
  transfer: '2. Transferencia',
  qr: '3. Código QR',
  debit: '4. Tarjeta Débito',
  credit1Pay: '5. Crédito 1 Pago',
  list: '6. Precio Lista (Cuotas s/i)',
};

const LINK_TARGETS: { key: ChannelKey; label: string }[] = [
  { key: 'cash', label: 'Efectivo' },
  { key: 'transfer', label: 'Transferencia' },
  { key: 'qr', label: 'Código QR' },
  { key: 'debit', label: 'Débito' },
  { key: 'credit1Pay', label: '1 Pago Crédito' },
  { key: 'list', label: 'Precio de Lista' },
];

const ALLOWED_INSTALLMENT_TIERS = [18, 12, 9, 6, 3, 2] as const;

function createDefaultChannelRules(): Record<ChannelKey, IPriceBuilderChannelRule> {
  return {
    cash: { enabled: true, mode: 'auto', linkedTo: 'transfer', discountPercent: 15, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
    transfer: { enabled: true, mode: 'auto', linkedTo: 'cash', discountPercent: 15, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
    qr: { enabled: true, mode: 'auto', linkedTo: 'transfer', discountPercent: 15, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
    debit: { enabled: true, mode: 'auto', linkedTo: 'transfer', discountPercent: 10, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
    credit1Pay: { enabled: true, mode: 'auto', linkedTo: 'list', discountPercent: 5, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
    list: { enabled: true, mode: 'auto', linkedTo: 'credit1Pay', discountPercent: 0, fixedPrice: 0, inheritCosts: true, excludedCostConcepts: [], extraCosts: [] },
  };
}

@Component({
  selector: 'app-product-pricing-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showPriceBuilder()) {
      <div class="space-y-5">
        <!-- ========================================================= -->
        <!-- BLOQUE 1: COSTOS, MARGEN & RESTRICCIONES DEL PRODUCTO     -->
        <!-- ========================================================= -->
        <div class="border-t border-base-200 pt-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-primary">tune</mat-icon>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-base-content/85">
                1. Costos, Margen & Restricciones del Producto
              </h4>
            </div>
            <span class="badge badge-sm badge-outline font-bold">
              {{ storeCeilingLabel() }}
            </span>
          </div>

          <div class="form-control max-w-xs">
            <label class="label py-1">
              <span class="label-text text-xs font-bold">Costo de Proveedor ($) *</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              class="input input-bordered rounded-lg w-full tabular-nums font-semibold"
              [class.input-error]="submitAttempted() && (!providerCost() || providerCost()! <= 0)"
              placeholder="0.00"
              [ngModel]="providerCost()"
              (ngModelChange)="onCostChange($event)"
            />
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 bg-base-200/60 border border-base-300/80 rounded-lg px-3 py-2.5">
            <div class="space-y-0.5">
              <span class="text-xs font-bold block">Usar ganancia personalizada para este producto</span>
              <span class="text-[11px] text-base-content/65 block">
                Si está apagado, usa la estrategia global configurada en
                <a routerLink="/home/store-settings" class="link link-primary font-semibold">Ajustes → Precios y Costos Base</a>.
              </span>
              @if (!useCustomProfit() && globalProfitSummary()) {
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-1">
                  Estrategia global activa: {{ globalProfitSummary() }}
                </span>
              }
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [ngModel]="useCustomProfit()"
              (ngModelChange)="onUseCustomProfitChange($event)"
            />
          </div>

          @if (useCustomProfit()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="form-control">
                <label class="label py-0.5 justify-start gap-1.5">
                  <span class="label-text text-xs font-bold">Método de Ganancia</span>
                  <button
                    type="button"
                    class="btn btn-circle btn-ghost btn-xs text-primary border border-primary/30 w-5 h-5 min-h-0"
                    title="Ver explicación Markup vs Margen"
                    (click)="showMathExplainer.set(!showMathExplainer())"
                  >
                    ?
                  </button>
                </label>
                <select
                  class="select select-bordered select-sm rounded-lg w-full font-medium"
                  [ngModel]="pricingMethodChoice()"
                  (ngModelChange)="onMethodChange($event)"
                >
                  <option value="markup">Sobre costo (Markup)</option>
                  <option value="margin">Sobre venta (Margen real)</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label py-0.5">
                  <span class="label-text text-xs font-bold">Ganancia Objetivo (%)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  [attr.max]="pricingMethodChoice() === 'margin' ? 99 : null"
                  step="0.5"
                  class="input input-bordered input-sm rounded-lg w-full tabular-nums font-semibold"
                  [class.input-error]="useCustomProfit() && customProfitMargin() === null"
                  placeholder="Ej: 30"
                  [ngModel]="customProfitMargin()"
                  (ngModelChange)="onCustomProfitChange($event)"
                />
              </div>
            </div>

            @if (showMathExplainer()) {
              <div class="alert alert-info text-xs rounded-lg py-2.5 px-3">
                <div>
                  <strong class="block mb-1">¿Por qué \$10.000 + 50% = \$15.000 NO es 50% de margen sobre la venta?</strong>
                  <p>• <strong>Sobre costo (50%):</strong> si te sale \$10.000 y le sumás 50%, vendés a <strong>\$15.000</strong> (ganás \$5.000 = 33,3% del precio final).</p>
                  <p>• <strong>Sobre venta (50%):</strong> si querés que el 50% de lo que entra sea ganancia limpia, el precio debe ser <strong>\$20.000</strong>.</p>
                </div>
              </div>
            }
          }

          <!-- Costos adicionales base -->
          <div class="space-y-2.5 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="text-xs font-bold text-base-content block">Costos y Gastos Adicionales Base</span>
                <span class="text-[11px] text-base-content/65">
                  Precargados desde Ajustes. Si borrás todos manualmente, este producto se guarda sin costos adicionales.
                </span>
              </div>
              <button
                type="button"
                class="btn btn-outline btn-xs rounded-lg gap-1"
                (click)="addAdditionalCost()"
              >
                <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">add</mat-icon>
                Agregar
              </button>
            </div>

            @if (additionalCosts().length === 0) {
              <div class="text-xs text-base-content/60 bg-base-200/40 border border-dashed border-base-300 rounded-lg px-3 py-2.5">
                Sin costos adicionales configurados para este producto.
              </div>
            }

            @for (cost of additionalCosts(); track $index) {
              <div class="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center p-2.5 sm:p-0 rounded-lg bg-base-200/40 sm:bg-transparent border border-base-300/60 sm:border-0">
                <input
                  type="text"
                  class="input input-bordered input-sm rounded-lg col-span-2 sm:col-span-4"
                  placeholder="Concepto (ej: Packaging / IIBB)"
                  [ngModel]="cost.concept"
                  (ngModelChange)="updateAdditionalCost($index, { concept: $event })"
                />
                <select
                  class="select select-bordered select-sm rounded-lg col-span-1 sm:col-span-3"
                  [ngModel]="cost.type"
                  (ngModelChange)="updateAdditionalCost($index, { type: $event })"
                >
                  <option value="fixed">Fijo (\$)</option>
                  <option value="percent_over_provider">% s/ Costo</option>
                  <option value="percent_over_price">% s/ Venta</option>
                </select>
                <select
                  class="select select-bordered select-sm rounded-lg col-span-1 sm:col-span-2"
                  [ngModel]="cost.category || 'expense'"
                  (ngModelChange)="updateAdditionalCost($index, { category: $event })"
                >
                  <option value="expense">Gasto</option>
                  <option value="tax">Impuesto</option>
                  <option value="shipping">Envío</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  class="input input-bordered input-sm rounded-lg col-span-1 sm:col-span-2 tabular-nums"
                  placeholder="Valor"
                  [ngModel]="cost.value"
                  (ngModelChange)="updateAdditionalCost($index, { value: +$event || 0 })"
                />
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-square rounded-lg text-error col-span-1 justify-self-end"
                  (click)="removeAdditionalCost($index)"
                >
                  <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">close</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="divider my-1"></div>

          <!-- Restricciones de pago -->
          @if (isGatewayMissing()) {
            <div class="alert alert-warning text-xs rounded-lg py-3 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-start gap-2.5">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px] shrink-0 mt-0.5">account_balance_wallet</mat-icon>
                <div>
                  <strong class="block font-bold">No tenés ninguna pasarela de pagos activa</strong>
                  <span class="opacity-90">
                    Este producto no va a poder cobrarse por Código QR ni con Tarjeta (solo Efectivo o Transferencia) hasta que actives una pasarela en Cobros y Pagos.
                  </span>
                </div>
              </div>
              <a routerLink="/home/payment-methods" class="btn btn-neutral btn-xs font-bold shrink-0 gap-1">
                <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">settings</mat-icon>
                Configurar pasarela
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label class="flex items-center justify-between gap-3 p-3 rounded-lg border border-base-300 bg-base-200/50 cursor-pointer">
                <div>
                  <strong class="text-xs font-bold block">Acepta Tarjetas (Débito / Crédito)</strong>
                  <span class="text-[11px] text-base-content/65">
                    @if (allowCardPayment()) {
                      Habilita débito, crédito y cuotas en este producto.
                    } @else {
                      Solo Efectivo, Transferencia y QR con dinero en cuenta vía tu pasarela por defecto (sin tarjetas).
                    }
                  </span>
                </div>
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm shrink-0"
                  [ngModel]="allowCardPayment()"
                  (ngModelChange)="onAllowCardChange($event)"
                />
              </label>

              @if (storeAllowsInstallments() && allowCardPayment()) {
                <label class="flex items-center justify-between gap-3 p-3 rounded-lg border border-base-300 bg-base-200/50 cursor-pointer">
                  <div>
                    <strong class="text-xs font-bold block">Participa en Cuotas Sin Interés</strong>
                    <span class="text-[11px] text-base-content/65">
                      Si lo apagás, el producto queda capado a 1 pago (sin absorber CFT).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-primary toggle-sm shrink-0"
                    [ngModel]="allowInterestFreeInstallments()"
                    (ngModelChange)="onAllowInstallmentsChange($event)"
                  />
                </label>
              }
            </div>

            <!-- Cartel informativo del tope de la tienda -->
            <div
              class="alert text-xs rounded-lg py-2.5 px-3"
              [ngClass]="effectiveAbsorb() ? 'alert-info' : 'alert-warning'"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px] shrink-0">info</mat-icon>
              <span>{{ storeInstallmentsInfoMessage() }}</span>
            </div>

            <!-- Selector opcional de tope de cuotas <= tope de la tienda -->
            @if (effectiveAbsorb()) {
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-base-300 bg-base-200/40">
                <div>
                  <strong class="text-xs font-bold block">
                    Tope de Cuotas Sin Interés para este Producto
                  </strong>
                  <span class="text-[11px] text-base-content/65">
                    Podés restringir hacia abajo respecto al tope de tu tienda para optimizar ganancia en este producto.
                  </span>
                </div>
                <select
                  class="select select-bordered select-sm rounded-lg w-full sm:w-60 font-semibold"
                  [ngModel]="selectedMaxInstallments()"
                  (ngModelChange)="onProductMaxInstallmentsChange($event)"
                >
                  @for (tier of availableInstallmentTiers(); track tier) {
                    <option [ngValue]="tier">
                      {{ tier === storeMaxInstallments() ? tier + ' cuotas s/i (Igual que la tienda)' : 'Hasta ' + tier + ' cuotas s/i' }}
                    </option>
                  }
                </select>
              </div>
            }
          }
        </div>

        <!-- ========================================================= -->
        <!-- BLOQUE 2: PIPELINE & TARJETAS FUSIONADAS POR CANAL        -->
        <!-- ========================================================= -->
        <div class="border-t border-base-200 pt-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-base-content/85">
                2. Pipeline & Precios por Canal
              </h4>
              <p class="text-[11px] text-base-content/65 mt-0.5">
                Configurá cada canal y mirá en la misma tarjeta el precio calculado por el Backend y tu ganancia limpia.
              </p>
            </div>

            <div class="flex items-center gap-2">
              @if (activeGatewayLabel()) {
                <span class="badge badge-primary badge-outline badge-sm font-bold">{{ activeGatewayLabel() }}</span>
              }
              <button
                type="button"
                class="btn btn-primary btn-xs rounded-lg gap-1"
                [disabled]="isCalculating() || !providerCost() || providerCost()! <= 0"
                (click)="triggerCalculate(true)"
              >
                @if (isCalculating()) {
                  <span class="loading loading-spinner loading-xs"></span>
                } @else {
                  <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">refresh</mat-icon>
                }
                Recalcular
              </button>
            </div>
          </div>

          <!-- Presets del Backend -->
          @if (!isGatewayMissing() && presetEntries().length > 0) {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              @for (preset of presetEntries(); track preset.key) {
                <button
                  type="button"
                  class="btn btn-sm btn-outline border-base-300 hover:border-primary hover:bg-primary/5 rounded-lg justify-start text-left h-auto py-2 text-xs font-bold"
                  (click)="applyBackendPreset(preset.key)"
                >
                  {{ preset.label }}
                </button>
              }
            </div>
          }

          @if (calcError()) {
            <div class="alert alert-error text-xs rounded-lg py-2.5 px-3">
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">error_outline</mat-icon>
              <span>{{ calcError() }}</span>
            </div>
          }

          <!-- Tarjetas unificadas por canal -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
            @for (chKey of channelOrder; track chKey) {
              @let hiddenByGateway = isGatewayMissing() && chKey !== 'cash' && chKey !== 'transfer';
              @let hiddenByCard = isCardChannel(chKey) && !effectiveAllowCardPayment();
              @let hiddenByInstallments = chKey === 'list' && !effectiveAbsorb();
              @if (!hiddenByGateway && !hiddenByCard && !hiddenByInstallments) {
              @let rule = channelRules()[chKey]!;
              @let snap = channelSnapshots()?.[chKey];
              @let isBlocked = !rule.enabled;

              <div
                class="border rounded-xl overflow-hidden bg-base-100 transition-all"
                [ngClass]="{
                  'opacity-55 border-base-300 bg-base-200/40': isBlocked,
                  'border-error/60 bg-error/5': !isBlocked && snap?.isWarningLoss,
                  'border-warning/70': !isBlocked && !snap?.isWarningLoss && snap?.isBelowTargetMargin,
                  'border-success/50': !isBlocked && snap && !snap.isWarningLoss && !snap.isBelowTargetMargin,
                  'border-base-300': !isBlocked && !snap
                }"
              >
                <!-- Cabecera de tarjeta -->
                <div class="px-3.5 py-2.5 border-b border-base-300/70 flex items-start justify-between gap-2 bg-base-200/30">
                  <label class="flex items-start gap-2 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-primary checkbox-xs mt-0.5 shrink-0"
                      [ngModel]="rule.enabled"
                      (ngModelChange)="updateChannelRule(chKey, { enabled: $event })"
                    />
                    <div class="min-w-0">
                      <span class="text-xs font-extrabold block truncate">{{ channelLabels[chKey] }}</span>
                      <span class="text-[11px] text-base-content/65 block">
                        {{ snap?.feeLabel || 'Pendiente de cálculo (ingresá costo > 0)' }}
                      </span>
                    </div>
                  </label>

                  @if (isBlocked) {
                    <span class="badge badge-ghost badge-xs font-bold shrink-0">
                      {{ !rule.enabled ? 'Deshabilitado' : 'Bloqueado (tarjeta)' }}
                    </span>
                  } @else if (snap?.isWarningLoss) {
                    <span class="badge badge-error badge-xs font-bold shrink-0">Pérdida</span>
                  } @else if (snap?.isBelowTargetMargin) {
                    <span class="badge badge-warning badge-xs font-bold shrink-0">Bajo objetivo</span>
                  } @else if (snap) {
                    <span class="badge badge-success badge-xs font-bold shrink-0">Rentable</span>
                  }
                </div>

                <!-- Banda financiera en vivo -->
                <div
                  class="px-3.5 py-2.5 border-b border-base-300/70 flex flex-wrap items-center justify-between gap-2"
                  [ngClass]="{
                    'bg-error/5': !isBlocked && snap?.isWarningLoss,
                    'bg-warning/10': !isBlocked && !snap?.isWarningLoss && snap?.isBelowTargetMargin,
                    'bg-success/5': !isBlocked && snap && !snap.isWarningLoss && !snap.isBelowTargetMargin,
                    'bg-base-200/40': isBlocked || !snap
                  }"
                >
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-base-content/60 block">
                      Precio al público
                    </span>
                    <div class="text-xl font-extrabold tabular-nums text-base-content">
                      {{ snap ? ('$' + (snap.price | number:'1.0-0')) : '—' }}
                      @if (chKey === 'list' && snap && effectiveAbsorb() && snap.price > 0) {
                        <span class="text-xs font-bold text-primary ml-1">
                          ({{ effectiveMaxInstallments() }}x \${{ (snap.price / effectiveMaxInstallments()) | number:'1.0-0' }})
                        </span>
                      }
                    </div>
                  </div>

                  <div class="text-left sm:text-right">
                    @if (snap) {
                      <div
                        class="text-xs font-extrabold tabular-nums"
                        [ngClass]="snap.netProfit < 0 ? 'text-error' : 'text-success'"
                      >
                        En tu bolsillo: \${{ snap.netProfit | number:'1.0-0' }} ({{ snap.netMarginPercent }}%)
                      </div>
                      <span class="text-[11px] text-base-content/65 tabular-nums block">
                        Costo base: \${{ snap.costBaseARS | number:'1.0-0' }} · {{ rule.inheritCosts ? 'Hereda costos' : 'Costos propios' }}
                      </span>
                    } @else {
                      <span class="text-[11px] text-base-content/60">Sin simulación</span>
                    }
                  </div>
                </div>

                <!-- Reglas del canal -->
                <div class="p-3.5 space-y-2.5">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <div>
                      <span class="text-[11px] font-bold text-base-content/70 block mb-1">Regla de cálculo</span>
                      <select
                        class="select select-bordered select-sm rounded-lg w-full text-xs font-semibold pr-8 truncate"
                        [ngModel]="rule.mode"
                        (ngModelChange)="onChannelModeChange(chKey, $event)"
                      >
                        <option value="auto">Automático (comisión real)</option>
                        @if (chKey !== 'list') {
                          <option value="linked">Igualar a otro canal</option>
                          <option value="discount_from_list">% OFF s/ Lista</option>
                        }
                        <option value="fixed">Precio fijo (\$)</option>
                      </select>
                    </div>

                    <div>
                      <span class="text-[11px] font-bold text-base-content/70 block mb-1">
                        {{
                          rule.mode === 'linked' ? 'Canal de referencia' :
                          rule.mode === 'discount_from_list' ? 'Descuento (% OFF)' :
                          rule.mode === 'fixed' ? 'Precio fijo (\$ ARS)' : 'Referencia'
                        }}
                      </span>
                      @if (rule.mode === 'linked') {
                        <select
                          class="select select-bordered select-sm rounded-lg w-full text-xs font-semibold pr-8 truncate"
                          [ngModel]="rule.linkedTo"
                          (ngModelChange)="updateChannelRule(chKey, { linkedTo: $event })"
                        >
                          @for (t of getLinkTargetsFor(chKey); track t.key) {
                            <option [ngValue]="t.key">= {{ t.label }}</option>
                          }
                        </select>
                      } @else if (rule.mode === 'discount_from_list') {
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="0.5"
                          class="input input-bordered input-sm rounded-lg w-full tabular-nums text-xs"
                          [ngModel]="rule.discountPercent ?? 0"
                          (ngModelChange)="updateChannelRule(chKey, { discountPercent: +$event || 0 })"
                        />
                      } @else if (rule.mode === 'fixed') {
                        <input
                          type="number"
                          min="0"
                          step="100"
                          class="input input-bordered input-sm rounded-lg w-full tabular-nums text-xs"
                          [ngModel]="rule.fixedPrice ?? 0"
                          (ngModelChange)="updateChannelRule(chKey, { fixedPrice: +$event || 0 })"
                        />
                      } @else {
                        <div class="h-8 px-2.5 flex items-center rounded-lg border border-dashed border-base-300 bg-base-200/50 text-[11px] text-base-content/65 font-medium">
                          Calculado s/ tasa
                        </div>
                      }
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-base-content/80">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-primary checkbox-xs"
                        [ngModel]="rule.inheritCosts"
                        (ngModelChange)="updateChannelRule(chKey, { inheritCosts: $event })"
                      />
                      <span>Heredar costos base</span>
                    </label>

                    @if (!rule.inheritCosts) {
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs rounded-lg border border-base-300 text-[11px]"
                        (click)="addChannelExtraCost(chKey)"
                      >
                        + Costo propio
                      </button>
                    }
                  </div>

                  @if (!rule.inheritCosts) {
                    <div class="p-2.5 rounded-lg bg-base-200/50 border border-dashed border-base-300 space-y-2">
                      <span class="text-[11px] font-bold text-base-content/75 block">
                        Costos activos (tocá para excluir de este canal):
                      </span>
                      <div class="flex flex-wrap gap-1.5">
                        @for (c of additionalCosts(); track $index) {
                          @let isExcluded = (rule.excludedCostConcepts || []).includes(c.concept);
                          <button
                            type="button"
                            class="badge badge-sm gap-1 cursor-pointer font-semibold"
                            [ngClass]="isExcluded ? 'badge-ghost line-through opacity-60' : 'badge-info badge-outline'"
                            (click)="toggleChannelExcludedCost(chKey, c.concept)"
                          >
                            <span>{{ c.concept || 'Sin nombre' }} ({{ c.type === 'fixed' ? '$' + c.value : c.value + '%' }})</span>
                            <span>{{ isExcluded ? '+' : '✕' }}</span>
                          </button>
                        }
                      </div>

                      @for (ec of rule.extraCosts || []; track $index) {
                        <div class="grid grid-cols-2 sm:grid-cols-12 gap-1.5 items-center pt-1">
                          <input
                            type="text"
                            class="input input-bordered input-xs rounded-lg col-span-2 sm:col-span-5"
                            [ngModel]="ec.concept"
                            (ngModelChange)="updateChannelExtraCost(chKey, $index, { concept: $event })"
                          />
                          <select
                            class="select select-bordered select-xs rounded-lg col-span-1 sm:col-span-3"
                            [ngModel]="ec.type"
                            (ngModelChange)="updateChannelExtraCost(chKey, $index, { type: $event })"
                          >
                            <option value="fixed">Fijo (\$)</option>
                            <option value="percent_over_provider">% s/ Costo</option>
                            <option value="percent_over_price">% s/ Venta</option>
                          </select>
                          <input
                            type="number"
                            step="0.1"
                            class="input input-bordered input-xs rounded-lg col-span-1 sm:col-span-3 tabular-nums"
                            [ngModel]="ec.value"
                            (ngModelChange)="updateChannelExtraCost(chKey, $index, { value: +$event || 0 })"
                          />
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs btn-square rounded-lg text-error col-span-2 sm:col-span-1 justify-self-end"
                            (click)="removeChannelExtraCost(chKey, $index)"
                          >
                            ✕
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
              }
            }
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- INSIGHTS DEL BACKEND                                      -->
        <!-- ========================================================= -->
        @if (insights().length > 0) {
          <div class="space-y-2">
            @for (ins of insights(); track $index) {
              <div
                class="alert rounded-lg text-xs py-2.5 px-3 flex flex-wrap items-center justify-between gap-2"
                [ngClass]="{
                  'alert-error': ins.type === 'error',
                  'alert-warning': ins.type === 'warning',
                  'alert-info': ins.type === 'info'
                }"
              >
                <span>{{ ins.message }}</span>
                @if (ins.suggestedFix; as fix) {
                  <button
                    type="button"
                    class="btn btn-xs btn-warning rounded-lg font-bold"
                    (click)="applySuggestedFix(fix.expensiveCh, fix.cheapCh)"
                  >
                    {{ fix.label }}
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- ========================================================= -->
        <!-- BLOQUE 3 (AL FINAL): RESUMEN EN VIDRIERA (STOREFRONT)     -->
        <!-- ========================================================= -->
        @if (visibleDisplaySummary().length > 0) {
          <div class="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-base-content/85">
                  3. Resumen en Vidriera (Storefront)
                </h4>
                <p class="text-[11px] text-base-content/65">
                  Así lo recibe cualquier plantilla agrupando los canales activos que comparten precio.
                </p>
              </div>
              <span class="badge badge-success badge-sm font-bold">
                {{ visibleDisplaySummary().length }} {{ visibleDisplaySummary().length === 1 ? 'precio en vidriera' : 'precios en vidriera' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              @for (item of visibleDisplaySummary(); track item.label) {
                <div class="border border-primary/25 bg-primary/5 rounded-lg px-3.5 py-2.5">
                  <div class="text-[11px] font-bold text-primary">{{ item.label }}</div>
                  <div class="text-xl font-extrabold tabular-nums text-base-content mt-0.5">
                    \${{ item.price | number:'1.0-0' }}
                  </div>
                  @if (effectiveAbsorb() && item.channels.includes('list') && item.price > 0) {
                    <div class="text-[11px] font-bold text-primary/90 mt-0.5 tabular-nums">
                      {{ effectiveMaxInstallments() }} cuotas s/i de \${{ (item.price / effectiveMaxInstallments()) | number:'1.0-0' }}
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ProductPricingBlockComponent implements IProductFormBlock, OnInit, OnDestroy {
  private readonly priceBuilderService = inject(PriceBuilderService);
  private readonly storeConfigState = inject(StoreConfigStateService);
  private readonly notifications = inject(NotificationsService);
  private readonly productService = inject(ProductService);

  showPriceBuilder = input<boolean>(false);
  submitAttempted = input<boolean>(false);

  pricingSnapshotChange = output<{
    providerCost: number | null;
    price: number | null;
    discount: number;
    netMarginPercent?: number | null;
    netProfit?: number | null;
  }>();

  readonly channelOrder = CHANNEL_ORDER;
  readonly channelLabels = CHANNEL_LABELS;

  // Base product fields
  providerCost = signal<number | null>(null);
  price = signal<number | null>(null);
  discount = signal<number>(0);

  // Price Builder state
  useCustomProfit = signal(false);
  pricingMethodChoice = signal<'markup' | 'margin'>('markup');
  customProfitMargin = signal<number | null>(null);
  showMathExplainer = signal(false);

  additionalCosts = signal<ICostConcept[]>([]);
  private hasHydrated = signal(false);
  private hasPreloadedDefaults = signal(false);

  // Payment restrictions
  allowCardPayment = signal(true);
  allowInterestFreeInstallments = signal(true);
  productMaxInstallments = signal<number | null>(null);

  // Channel rules & Backend calculation state
  channelRules = signal<Record<ChannelKey, IPriceBuilderChannelRule>>(createDefaultChannelRules());
  presets = signal<Partial<Record<PricingPresetKey, IPriceBuilderPresetItem>>>({});
  isCalculating = signal(false);
  calcError = signal<string | null>(null);
  calcResult = signal<IPriceBuilderCalculateResult | null>(null);

  private calcDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Store-level config from Backend (read-only, zero silent fallbacks)
  readonly storeConfig = computed(() => this.storeConfigState.StoreConfig().config);

  readonly globalProfitSummary = computed(() => {
    const cfg = this.storeConfig();
    if (!cfg || typeof cfg.profit !== 'number') return '';
    const methodLabel =
      cfg.pricingStrategy?.method === 'margin'
        ? 'Sobre venta (Margen real)'
        : 'Sobre costo (Markup)';
    return `${cfg.profit}% · ${methodLabel}`;
  });

  readonly isGatewayMissing = computed(() => {
    const cfg = this.storeConfig();
    if (!cfg) return false;
    const g = cfg.paymentGateways;
    return !Boolean(g?.mercadopago?.active || g?.getnet?.active || g?.uala?.active);
  });

  readonly effectiveAllowCardPayment = computed(
    () => !this.isGatewayMissing() && this.allowCardPayment()
  );

  readonly storeAllowsInstallments = computed(() => {
    const cfg = this.storeConfig();
    if (!cfg) return false;
    const absorb = cfg.pricingStrategy?.absorbInstallments === true;
    const maxInst = Number(cfg.pricingStrategy?.maxInstallmentsToAbsorb ?? cfg.paymentGateways?.mercadopago?.maxInstallments ?? 1);
    return absorb && maxInst >= 2;
  });

  readonly storeMaxInstallments = computed(() => {
    const cfg = this.storeConfig();
    if (!cfg) return 1;
    return Number(cfg.pricingStrategy?.maxInstallmentsToAbsorb ?? cfg.paymentGateways?.mercadopago?.maxInstallments ?? 1);
  });

  readonly availableInstallmentTiers = computed(() => {
    const max = this.storeMaxInstallments();
    return ALLOWED_INSTALLMENT_TIERS.filter((n) => n <= max);
  });

  readonly selectedMaxInstallments = computed(() => {
    const max = this.storeMaxInstallments();
    const chosen = this.productMaxInstallments();
    if (!chosen || chosen > max) return max;
    return chosen;
  });

  readonly effectiveAbsorb = computed(() => {
    return (
      this.effectiveAllowCardPayment() &&
      this.allowInterestFreeInstallments() &&
      this.storeAllowsInstallments()
    );
  });

  readonly effectiveMaxInstallments = computed(() => {
    if (!this.effectiveAbsorb()) return 1;
    return Math.min(this.storeMaxInstallments(), this.selectedMaxInstallments());
  });

  readonly storeCeilingLabel = computed(() => {
    if (!this.storeConfig()) return 'Cargando config...';
    return this.storeAllowsInstallments()
      ? `Cobros y Pagos: hasta ${this.storeMaxInstallments()}x s/i`
      : 'Cobros y Pagos: sin cuotas s/i';
  });

  readonly storeInstallmentsInfoMessage = computed(() => {
    if (!this.storeAllowsInstallments()) {
      return 'Tu tienda no absorbe cuotas sin interés según tu configuración de Mercado Pago (Cobros y Pagos).';
    }
    if (!this.allowCardPayment()) {
      return `Tu tienda absorbe hasta ${this.storeMaxInstallments()} cuotas s/i, pero este producto tiene desactivado el pago con tarjeta.`;
    }
    if (!this.allowInterestFreeInstallments()) {
      return `Tu tienda absorbe hasta ${this.storeMaxInstallments()} cuotas s/i, pero este producto está capado a 1 pago (installments: 1 en checkout).`;
    }
    const chosen = this.effectiveMaxInstallments();
    const ceiling = this.storeMaxInstallments();
    return chosen < ceiling
      ? `Tu tienda absorbe hasta ${ceiling} cuotas s/i según tu config de Mercado Pago. Este producto está optimizado a hasta ${chosen} cuotas s/i.`
      : `Tu tienda absorbe hasta ${ceiling} cuotas s/i según tu config de Mercado Pago.`;
  });

  readonly presetEntries = computed(() => {
    const p = this.presets();
    return (Object.keys(p) as PricingPresetKey[]).map((key) => ({
      key,
      label: p[key]!.label,
    }));
  });

  readonly activeGatewayLabel = computed(() => this.calcResult()?.activeGateway?.label ?? '');
  readonly channelSnapshots = computed<Partial<Record<ChannelKey, IPriceBuilderChannelSnapshot>> | null>(
    () => this.calcResult()?.price?.channels ?? null,
  );
  readonly displaySummary = computed<IDisplaySummaryItem[]>(
    () => this.calcResult()?.price?.displaySummary ?? [],
  );

  readonly visibleDisplaySummary = computed<IDisplaySummaryItem[]>(() => {
    const items = this.displaySummary();
    if (!this.isGatewayMissing()) return items;
    return items.flatMap((item): IDisplaySummaryItem[] => {
      const filteredChannels: ChannelKey[] = item.channels.filter(
        (ch): ch is ChannelKey => ch === 'cash' || ch === 'transfer'
      );
      if (filteredChannels.length === 0) return [];
      const label = filteredChannels
        .map((ch) => (ch === 'cash' ? 'Efectivo' : 'Transferencia'))
        .join(' / ');
      return [{ ...item, channels: filteredChannels, label }];
    });
  });
  readonly insights = computed<IPriceBuilderInsight[]>(
    () => this.calcResult()?.insights ?? [],
  );

  constructor() {
    // Precarga de defaultAdditionalCosts y defaultEnabledChannels en Nuevo Producto
    effect(() => {
      const state = this.storeConfigState.StoreConfig();
      if (!state.hasData || !state.config || this.hasHydrated() || this.hasPreloadedDefaults()) {
        return;
      }
      this.hasPreloadedDefaults.set(true);

      const defaults = state.config.defaultAdditionalCosts;
      if (Array.isArray(defaults) && defaults.length > 0) {
        this.additionalCosts.set(defaults.map((c) => ({ ...c })));
      }

      const enabledDefaults = state.config.defaultEnabledChannels;
      if (enabledDefaults) {
        this.channelRules.update((curr) => {
          const next = { ...curr };
          for (const k of CHANNEL_ORDER) {
            if (typeof enabledDefaults[k] === 'boolean') {
              next[k] = { ...next[k], enabled: enabledDefaults[k]! };
            }
          }
          return next;
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.showPriceBuilder()) return;
    try {
      const res = await this.priceBuilderService.getPresetsAndRates();
      this.presets.set(res.presets);
    } catch (err: any) {
      this.calcError.set(
        err?.error?.message || err?.message || 'No se pudieron cargar los presets de Price Builder.',
      );
    }
  }

  ngOnDestroy(): void {
    if (this.calcDebounceTimer) clearTimeout(this.calcDebounceTimer);
  }

  isCardChannel(ch: ChannelKey): boolean {
    return ch === 'debit' || ch === 'credit1Pay' || ch === 'list';
  }

  getLinkTargetsFor(ch: ChannelKey): { key: ChannelKey; label: string }[] {
    return LINK_TARGETS.filter((t) => {
      if (t.key === ch) return false;
      if (this.isGatewayMissing() && t.key !== 'cash' && t.key !== 'transfer') return false;
      return true;
    });
  }

  emitSnapshot(): void {
    const channels = this.calcResult()?.price?.channels;
    const refSnap =
      (channels?.transfer?.enabled ? channels.transfer : null) ??
      (channels?.cash?.enabled ? channels.cash : null) ??
      (channels ? Object.values(channels).find((c) => c?.enabled) ?? null : null);

    this.pricingSnapshotChange.emit({
      providerCost: this.providerCost(),
      price: this.price(),
      discount: this.discount(),
      netMarginPercent: refSnap ? refSnap.netMarginPercent : null,
      netProfit: refSnap ? refSnap.netProfit : null,
    });
  }

  onCostChange(val: unknown): void {
    this.providerCost.set(
      val === '' || val === null || val === undefined ? null : Number(val),
    );
    this.emitSnapshot();
    this.scheduleCalculate();
  }

  onPriceChange(val: unknown): void {
    this.price.set(
      val === '' || val === null || val === undefined ? null : Number(val),
    );
    this.emitSnapshot();
  }

  onDiscountChange(val: unknown): void {
    this.discount.set(Number(val) || 0);
    this.emitSnapshot();
  }

  onUseCustomProfitChange(val: boolean): void {
    this.useCustomProfit.set(val);
    this.scheduleCalculate();
  }

  onMethodChange(val: 'markup' | 'margin'): void {
    this.pricingMethodChoice.set(val);
    this.scheduleCalculate();
  }

  onCustomProfitChange(val: unknown): void {
    this.customProfitMargin.set(val === '' || val === null ? null : Number(val));
    this.scheduleCalculate();
  }

  onAllowCardChange(val: boolean): void {
    this.allowCardPayment.set(val);
    this.scheduleCalculate();
  }

  onAllowInstallmentsChange(val: boolean): void {
    this.allowInterestFreeInstallments.set(val);
    this.scheduleCalculate();
  }

  onProductMaxInstallmentsChange(val: number | null): void {
    this.productMaxInstallments.set(val ? Number(val) : null);
    this.scheduleCalculate();
  }

  applySuggestedPrice(suggested: number): void {
    if (!this.price() && suggested > 0) {
      this.price.set(suggested);
      this.emitSnapshot();
    }
  }

  addAdditionalCost(): void {
    this.additionalCosts.update((list) => [
      ...list,
      { concept: '', type: 'fixed', category: 'expense', value: 0 },
    ]);
  }

  updateAdditionalCost(index: number, patch: Partial<ICostConcept>): void {
    this.additionalCosts.update((list) =>
      list.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
    this.scheduleCalculate();
  }

  removeAdditionalCost(index: number): void {
    this.additionalCosts.update((list) => list.filter((_, i) => i !== index));
    this.scheduleCalculate();
  }

  applyBackendPreset(presetKey: PricingPresetKey): void {
    const preset = this.presets()[presetKey];
    if (!preset?.channelPricing) return;
    const next = createDefaultChannelRules();
    for (const k of CHANNEL_ORDER) {
      if (preset.channelPricing[k]) {
        next[k] = {
          ...next[k],
          ...preset.channelPricing[k],
          excludedCostConcepts: [...(preset.channelPricing[k].excludedCostConcepts ?? [])],
          extraCosts: [...(preset.channelPricing[k].extraCosts ?? [])],
        };
      }
    }
    this.channelRules.set(next);
    this.triggerCalculate(true);
  }

  onChannelModeChange(ch: ChannelKey, mode: ChannelRuleMode): void {
    const fallbackTarget = this.getLinkTargetsFor(ch)[0]?.key ?? 'transfer';
    this.updateChannelRule(ch, {
      mode,
      ...(mode === 'linked' && !this.channelRules()[ch].linkedTo
        ? { linkedTo: fallbackTarget }
        : {}),
    });
  }

  updateChannelRule(ch: ChannelKey, patch: Partial<IPriceBuilderChannelRule>): void {
    this.channelRules.update((curr) => ({
      ...curr,
      [ch]: { ...curr[ch], ...patch },
    }));
    this.scheduleCalculate();
  }

  toggleChannelExcludedCost(ch: ChannelKey, concept: string): void {
    const current = this.channelRules()[ch].excludedCostConcepts ?? [];
    const exists = current.includes(concept);
    const updated = exists ? current.filter((c) => c !== concept) : [...current, concept];
    this.updateChannelRule(ch, { excludedCostConcepts: updated });
  }

  addChannelExtraCost(ch: ChannelKey): void {
    const current = this.channelRules()[ch].extraCosts ?? [];
    this.updateChannelRule(ch, {
      extraCosts: [
        ...current,
        { concept: `Extra ${ch}`, type: 'percent_over_price', category: 'tax', value: 1.5 },
      ],
    });
  }

  updateChannelExtraCost(
    ch: ChannelKey,
    idx: number,
    patch: Partial<ICostConcept>,
  ): void {
    const current = this.channelRules()[ch].extraCosts ?? [];
    this.updateChannelRule(ch, {
      extraCosts: current.map((ec, i) => (i === idx ? { ...ec, ...patch } : ec)),
    });
  }

  removeChannelExtraCost(ch: ChannelKey, idx: number): void {
    const current = this.channelRules()[ch].extraCosts ?? [];
    this.updateChannelRule(ch, {
      extraCosts: current.filter((_, i) => i !== idx),
    });
  }

  applySuggestedFix(expensiveCh: ChannelKey, cheapCh: ChannelKey): void {
    this.channelRules.update((curr) => ({
      ...curr,
      [expensiveCh]: { ...curr[expensiveCh], mode: 'auto' },
      [cheapCh]: { ...curr[cheapCh], mode: 'linked', linkedTo: expensiveCh },
    }));
    this.triggerCalculate(true);
  }

  private scheduleCalculate(): void {
    if (!this.showPriceBuilder()) return;
    if (this.calcDebounceTimer) clearTimeout(this.calcDebounceTimer);
    this.calcDebounceTimer = setTimeout(() => {
      void this.triggerCalculate(false);
    }, 320);
  }

  async triggerCalculate(showMissingCostToast: boolean): Promise<void> {
    if (!this.showPriceBuilder()) return;
    const cost = Number(this.providerCost());
    if (!cost || cost <= 0) {
      if (showMissingCostToast) {
        this.notifications.warning('Ingresá un costo de proveedor mayor a 0 para calcular.');
      }
      return;
    }

    if (
      this.useCustomProfit() &&
      (this.customProfitMargin() === null ||
        Number.isNaN(Number(this.customProfitMargin())) ||
        Number(this.customProfitMargin()) < 0)
    ) {
      this.calcError.set(
        'Ingresá una Ganancia Objetivo (%) personalizada para simular tus precios.'
      );
      return;
    }

    const sanitizedCosts: ICostConcept[] = this.additionalCosts()
      .filter((c) => c.concept.trim().length > 0)
      .map((c) => ({
        concept: c.concept.trim(),
        type: c.type || 'fixed',
        category: c.category || 'expense',
        value: Math.max(0, Number(c.value) || 0),
      }));

    const gatewayMissing = this.isGatewayMissing();
    const paymentRestrictions: IPaymentRestrictions = {
      allowCardPayment: this.effectiveAllowCardPayment(),
      allowInterestFreeInstallments: gatewayMissing ? false : this.allowInterestFreeInstallments(),
      maxInstallments: this.effectiveAbsorb() ? this.effectiveMaxInstallments() : 1,
    };

    const channelPricing: IPriceBuilderChannelPricing = {};
    const rules = this.channelRules();
    for (const k of CHANNEL_ORDER) {
      const r = rules[k];
      const forceDisabled = gatewayMissing && k !== 'cash' && k !== 'transfer';
      channelPricing[k] = {
        enabled: forceDisabled ? false : r.enabled,
        mode: r.mode,
        inheritCosts: r.inheritCosts,
        ...(r.mode === 'linked' && r.linkedTo ? { linkedTo: r.linkedTo } : {}),
        ...(r.mode === 'discount_from_list' ? { discountPercent: Number(r.discountPercent) || 0 } : {}),
        ...(r.mode === 'fixed' ? { fixedPrice: Number(r.fixedPrice) || 0 } : {}),
        ...(!r.inheritCosts
          ? {
              excludedCostConcepts: r.excludedCostConcepts ?? [],
              extraCosts: (r.extraCosts ?? [])
                .filter((ec) => ec.concept.trim().length > 0)
                .map((ec) => ({
                  concept: ec.concept.trim(),
                  type: ec.type || 'fixed',
                  category: ec.category || 'expense',
                  value: Math.max(0, Number(ec.value) || 0),
                })),
            }
          : {}),
      };
    }

    this.isCalculating.set(true);
    this.calcError.set(null);
    try {
      const res = await this.priceBuilderService.calculatePreview({
        providerCost: cost,
        useCustomProfit: this.useCustomProfit(),
        ...(this.useCustomProfit()
          ? {
              pricingMethodChoice: this.pricingMethodChoice(),
              ...(this.customProfitMargin() !== null
                ? { customProfitMargin: Number(this.customProfitMargin()) }
                : {}),
            }
          : {}),
        additionalCosts: sanitizedCosts,
        paymentRestrictions,
        channelPricing,
      });

      this.calcResult.set(res);
      const computedBase = res.price?.cashTransferPrice ?? res.price?.listPrice ?? null;
      if (computedBase !== null) {
        this.price.set(computedBase);
        this.emitSnapshot();
      }
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Error al calcular precios en el Backend.';
      this.calcError.set(msg);
      if (showMissingCostToast) {
        this.notifications.error(msg);
      }
    } finally {
      this.isCalculating.set(false);
    }
  }

  validate(): string[] {
    if (!this.showPriceBuilder()) return [];
    const errors: string[] = [];
    const cost = Number(this.providerCost());
    if (!this.providerCost() || Number.isNaN(cost) || cost <= 0) {
      errors.push('El costo de proveedor debe ser mayor a 0.');
    }
    if (
      this.useCustomProfit() &&
      (this.customProfitMargin() === null ||
        Number.isNaN(Number(this.customProfitMargin())) ||
        Number(this.customProfitMargin()) < 0)
    ) {
      errors.push('Ingresá el porcentaje de ganancia objetivo personalizada.');
    }
    return errors;
  }

  hydrate(product: any): void {
    this.hasHydrated.set(true);

    const costVal =
      product.providerCost?.costPrice ??
      product.providerCost ??
      product.finance?.providerCost?.inARS ??
      product.costs?.providerCost ??
      null;
    this.providerCost.set(typeof costVal === 'number' && costVal > 0 ? costVal : null);

    const priceVal =
      typeof product.price === 'number'
        ? product.price
        : product.price?.cashTransferPrice ?? product.price?.listPrice ?? null;
    this.price.set(priceVal);
    this.discount.set(Number(product.discount) || 0);

    this.useCustomProfit.set(Boolean(product.useCustomProfit));
    if (product.pricingMethodChoice) {
      this.pricingMethodChoice.set(product.pricingMethodChoice);
    }
    if (typeof product.customProfitMargin === 'number') {
      this.customProfitMargin.set(product.customProfitMargin);
    }

    const existingCosts = product.additionalCosts ?? product.finance?.additionalCosts;
    if (Array.isArray(existingCosts)) {
      this.additionalCosts.set(existingCosts.map((c: any) => ({ ...c })));
    }

    if (product.paymentRestrictions) {
      this.allowCardPayment.set(product.paymentRestrictions.allowCardPayment !== false);
      this.allowInterestFreeInstallments.set(
        product.paymentRestrictions.allowInterestFreeInstallments !== false,
      );
      this.productMaxInstallments.set(
        typeof product.paymentRestrictions.maxInstallments === 'number'
          ? product.paymentRestrictions.maxInstallments
          : null,
      );
    }

    if (product.channelPricing) {
      const next = createDefaultChannelRules();
      for (const k of CHANNEL_ORDER) {
        if (product.channelPricing[k]) {
          next[k] = {
            ...next[k],
            ...product.channelPricing[k],
            excludedCostConcepts: [...(product.channelPricing[k].excludedCostConcepts ?? [])],
            extraCosts: [...(product.channelPricing[k].extraCosts ?? [])],
          };
        }
      }
      this.channelRules.set(next);
    }

    this.emitSnapshot();
    if (this.showPriceBuilder() && this.providerCost() && this.providerCost()! > 0) {
      void this.triggerCalculate(false);
    }
  }

  appendToFormData(formData: FormData): void {
    if (!this.showPriceBuilder()) return;

    formData.append('providerCost', String(Number(this.providerCost())));
    if (this.price() !== null) {
      formData.append('price', String(Number(this.price())));
    }
    formData.append('discount', String(Number(this.discount()) || 0));
      formData.append('useCustomProfit', String(this.useCustomProfit()));
      if (this.useCustomProfit()) {
        formData.append('pricingMethodChoice', this.pricingMethodChoice());
        if (this.customProfitMargin() !== null) {
          formData.append('customProfitMargin', String(this.customProfitMargin()));
        }
      }

      // Siempre enviar additionalCosts (si el usuario borró todos, envía '[]' explícito)
      const sanitizedCosts: ICostConcept[] = this.additionalCosts()
        .filter((c) => c.concept.trim().length > 0)
        .map((c) => ({
          concept: c.concept.trim(),
          type: c.type || 'fixed',
          category: c.category || 'expense',
          value: Math.max(0, Number(c.value) || 0),
        }));
      formData.append('additionalCosts', JSON.stringify(sanitizedCosts));

      const gatewayMissing = this.isGatewayMissing();
      const paymentRestrictions: IPaymentRestrictions = {
        allowCardPayment: this.effectiveAllowCardPayment(),
        allowInterestFreeInstallments: gatewayMissing ? false : this.allowInterestFreeInstallments(),
        maxInstallments: this.effectiveAbsorb() ? this.effectiveMaxInstallments() : 1,
      };
      formData.append('paymentRestrictions', JSON.stringify(paymentRestrictions));
      const effectiveRules: IPriceBuilderChannelPricing = { ...this.channelRules() };
      if (gatewayMissing) {
        for (const k of CHANNEL_ORDER) {
          if (k !== 'cash' && k !== 'transfer' && effectiveRules[k]) {
            effectiveRules[k] = { ...effectiveRules[k]!, enabled: false };
          }
        }
      }
      formData.append('channelPricing', JSON.stringify(effectiveRules));
  }
}
