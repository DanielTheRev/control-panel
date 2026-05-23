import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { IEcommerceConfig } from '../../interfaces/config.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { NotificationsService } from '../../services/notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [PageHeader, PageLayout, ReactiveFormsModule, MatIcon, CommonModule],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss'
})
export class StoreSettings {
  configState = inject(StoreConfigStateService);
  #sidebarService = inject(SidebarService);
  #NotificationService = inject(NotificationsService)
  #router = inject(Router);
  #fb = inject(FormBuilder);
  mp_success = input<boolean>();
  mp_error = input<boolean>();

  configForm: FormGroup;
  showRecalculateModal = signal(false);
  isRecalculating = signal(false);

  constructor() {
    this.#sidebarService.navbarTitle.set({ title: 'Configuración Global' });

    this.configForm = this.#fb.group({
      name: [''],
      profit: [0],
      profit1Pay: [null],
      profitInstallments: [null],
      costCurrency: ['USD'],
      taxes: this.#fb.group({
        iva: [21]
      }),
      pricingStrategy: this.#fb.group({
        method: ['markup'],
        transferGrossUp: [true],
        absorbInstallments: [true]
      }),
      shippingConfig: this.#fb.group({
        freeShippingThreshold: [50000]
      }),
      contact: this.#fb.group({
        email: [''],
        phone: [''],
        address: ['']
      }),
      social: this.#fb.group({
        instagram: [''],
        facebook: [''],
        twitter: [''],
        tiktok: ['']
      }),
      clothingFits: [[]],
      paymentGateways: this.#fb.group({
        mercadopago: this.#fb.group({
          active: [false],
          baseCommission: [0],
          cft3cuotas: [0],
          cft6Cuotas: [0],
          accessToken: [''],
          publicKey: [''],
          webhookSecret: [''],
          maxInstallments: [12],
          excludedPaymentMethods: [[]],
          excludedPaymentTypes: [[]]
        }),
        uala: this.#fb.group({
          active: [false],
          baseCommission: [0],
          cft3cuotas: [0],
          cft6Cuotas: [0],
          credentials: this.#fb.group({
            userName: [''],
            clientId: [''],
            clientSecret: ['']
          })
        }),
        transfer: this.#fb.group({
          active: [false],
          cbu: [''],
          alias: ['']
        })
      })
    });

    effect(() => {
      const { hasData, config, hasError, isLoading } = this.configState.StoreConfig()
      if (hasData && !hasError && !isLoading) {
        this.configForm.patchValue(config);
      }
    })
    effect(() => {
      // Leemos las señales una sola vez
      const success = this.mp_success();
      const error = this.mp_error();

      if (success) {
        this.#NotificationService.success('Mercado pago sincronizado con éxito');
        this.cleanUrlParams();
      }

      if (error) {
        this.#NotificationService.error('Error al sincronizar con Mercado Pago');
        this.cleanUrlParams();
      }
    });
  }

  private cleanUrlParams() {
    this.#router.navigate([], {
      queryParams: {
        mp_success: null,
        mp_error: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  syncMercadoPago() {
    this.configState.signMercadoPago()
  }

  async saveConfig() {
    if (this.configForm.invalid) return;
    const formValue = this.configForm.value as IEcommerceConfig;

    const { success, shouldRecalculate } = await this.configState.saveConfig(formValue);

    if (success && shouldRecalculate) {
      this.showRecalculateModal.set(true);
    }
  }

  async confirmRecalculate() {
    this.isRecalculating.set(true);
    await this.configState.recalculateAllPrices();
    this.isRecalculating.set(false);
    this.showRecalculateModal.set(false);
  }

  cancelRecalculate() {
    this.showRecalculateModal.set(false);
  }

  get clothingFits() {
    return this.configForm.get('clothingFits')?.value as string[] || [];
  }

  addFit(newFitElement: HTMLInputElement) {
    const value = newFitElement.value.trim();
    if (!value) return;

    const currentFits = this.clothingFits;
    if (!currentFits.includes(value)) {
      this.configForm.patchValue({
        clothingFits: [...currentFits, value]
      });
      this.configForm.markAsDirty();
    }
    newFitElement.value = '';
  }

  removeFit(fitToRemove: string) {
    const currentFits = this.clothingFits;
    this.configForm.patchValue({
      clothingFits: currentFits.filter(f => f !== fitToRemove)
    });
    this.configForm.markAsDirty();
  }
}
