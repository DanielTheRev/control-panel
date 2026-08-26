import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { IEcommerceConfig, IDolarRate } from '../../interfaces/config.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { NotificationsService } from '../../services/notifications.service';
import { Router } from '@angular/router';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [PageHeader, PageLayout, ReactiveFormsModule, MatIcon, CommonModule, SingleImageUpload],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss'
})
export class StoreSettings {
  configState = inject(StoreConfigStateService);
  #sidebarService = inject(SidebarService);
  #NotificationService = inject(NotificationsService);
  #router = inject(Router);
  #fb = inject(FormBuilder);
  mp_success = input<boolean>();
  mp_error = input<boolean>();

  configForm: FormGroup;
  logoControl = new FormControl<any>(null);
  isUploadingLogo = signal(false);
  showRecalculateModal = signal(false);
  isRecalculating = signal(false);
  dolarQuotes = signal<IDolarRate[]>([]);
  isLoadingDolares = signal(false);

  activeTab = signal<'general' | 'pricing' | 'gateways' | 'integrations' | 'contact' | 'clothing'>('general');

  constructor() {
    this.#sidebarService.navbarTitle.set({ title: 'Configuración de la Tienda' });

    this.configForm = this.#fb.group({
      name: [''],
      profit: [0],
      profit1Pay: [null],
      profitInstallments: [null],
      costCurrency: ['USD'],
      dollarQuoteType: ['oficial'],
      customDollarRate: [0],
      taxes: this.#fb.group({
        iva: [21]
      }),
      pricingStrategy: this.#fb.group({
        method: ['markup'],
        transferGrossUp: [true],
        absorbInstallments: [true],
        maxInstallmentsToAbsorb: [3],
        transferDiscountPercentage: [0],
        cashDiscountPercentage: [0]
      }),
      integrations: this.#fb.group({
        metaPixel: this.#fb.group({
          active: [false],
          pixelId: [''],
          accessToken: [''],
          testEventCode: ['']
        }),
        googleAnalytics: this.#fb.group({
          active: [false],
          measurementId: ['']
        }),
        googleAuth: this.#fb.group({
          active: [true],
          clientId: ['']
        }),
        resend: this.#fb.group({
          active: [false],
          apiKey: [''],
          fromEmail: [''],
          fromName: ['']
        })
      }),
      shippingConfig: this.#fb.group({
        freeShippingThreshold: [50000]
      }),
      workingHours: this.#fb.group({
        weekdayStart: ['10:00'],
        weekdayEnd: ['20:00'],
        sundayStart: ['10:00'],
        sundayEnd: ['15:00'],
        noticeText: ['Lun a Sáb 10-20h / Dom 10-15h']
      }),
      contact: this.#fb.group({
        email: [''],
        phone: [''],
        address: [''],
        whatsapp: ['']
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
          cbuCvu: [''],
          alias: [''],
          bankName: [''],
          titular: ['']
        })
      })
    });

    effect(() => {
      const { hasData, config, hasError, isLoading } = this.configState.StoreConfig()
      if (hasData && !hasError && !isLoading) {
        this.configForm.patchValue(config);
        if (config.logo) {
          this.logoControl.setValue(config.logo);
        }
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

    this.loadDolarQuotes();
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

  async loadDolarQuotes(refresh = false) {
    this.isLoadingDolares.set(true);
    const quotes = await this.configState.getDolares(refresh);
    this.dolarQuotes.set(quotes);
    this.isLoadingDolares.set(false);
  }

  selectDollarQuote(casa: string) {
    this.configForm.get('dollarQuoteType')?.setValue(casa);
    this.configForm.markAsDirty();
  }

  async confirmRecalculate() {
    this.isRecalculating.set(true);
    await this.configState.recalculatePrices();
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

  get isNewLogoSelected(): boolean {
    return this.logoControl.value instanceof File;
  }

  async uploadLogo() {
    const file = this.logoControl.value;
    if (!(file instanceof File)) return;

    this.isUploadingLogo.set(true);
    const success = await this.configState.uploadLogo(file);
    this.isUploadingLogo.set(false);
  }
}
