import { CommonModule, NgClass } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '../../services/notifications.service';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { StoreConfigService } from '../../services/store.config.service';
import { PaymentMethodsStateService } from '../../states/payment-methods.state.service';
import { IDolarRate, IPricingStrategy } from '../../interfaces/config.interface';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [
    PageLayout,
    PageHeader,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink,
    MatSnackBarModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgClass
  ],
  templateUrl: './payment-methods.html',
})
export class PaymentMethods implements OnInit {
  #SidebarService = inject(SidebarService);
  #fb = inject(FormBuilder);
  #paymentMethodsState = inject(PaymentMethodsStateService);
  #paymentMethodsService = inject(PaymentMethodsService);
  #storeConfigService = inject(StoreConfigService);
  storeConfigState = inject(StoreConfigStateService);
  #NotificationService = inject(NotificationsService);

  readonly state = this.#paymentMethodsState.state;
  activeTab = signal<'gateways' | 'manual' | 'pricing'>('gateways');

  // Forms
  gatewaysForm: FormGroup;
  discountsForm: FormGroup;
  pricingForm: FormGroup;

  isSavingGateways = signal(false);
  isSavingDiscounts = signal(false);
  isSavingPricing = signal(false);
  isRecalculating = signal(false);
  dolarQuotes = signal<IDolarRate[]>([]);
  isLoadingDolares = signal(false);

  // Recálculo masivo & Preview State
  showRecalculateModal = signal<boolean>(false);
  isLoadingPreview = signal<boolean>(false);
  isExecutingRecalculate = signal<boolean>(false);
  recalculateOnlyActive = signal<boolean>(true);
  recalculatePreviewData = signal<any | null>(null);
  previewSearch = signal<string>('');
  hasPendingRecalculation = signal<boolean>(false);

  // Secret Fields Visibility (Anti-Password Manager)
  showMpToken = signal<boolean>(false);
  showMpWebhook = signal<boolean>(false);
  showGetnetSecret = signal<boolean>(false);
  showUalaSecret = signal<boolean>(false);

  displayedColumns: string[] = ['name', 'status', 'description', 'actions'];

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Cobros & Pagos'
    });

    // Inicializar Formulario de Pasarelas
    this.gatewaysForm = this.#fb.group({
      mercadopago: this.#fb.group({
        active: [false],
        publicKey: [''],
        accessToken: [''],
        webhookSecret: [''],
        environment: ['production'],
        checkoutMode: ['bricks'],
        baseCommission: [6.6],
        cft3cuotas: [12.09],
        cft6Cuotas: [19.09],
        cft12cuotas: [0],
        maxInstallments: [3],
        absorbInstallments: [true],
        maxInstallmentsToAbsorb: [3],
        card1PayDiscount: [false]
      }),
      getnet: this.#fb.group({
        active: [false],
        clientId: [''],
        clientSecret: [''],
        environment: ['sandbox'],
        checkoutMode: ['redirect'],
        baseCommission: [3.5],
        cft3cuotas: [0],
        cft6Cuotas: [10],
        cft12cuotas: [0],
        maxInstallments: [6]
      }),
      uala: this.#fb.group({
        active: [false],
        userName: [''],
        clientId: [''],
        clientSecret: [''],
        baseCommission: [0],
        cft3cuotas: [0],
        cft6Cuotas: [0],
        cft12cuotas: [0],
        callbackSuccess: [''],
        callbackFail: [''],
        notificationUrl: ['']
      }),
      transfer: this.#fb.group({
        active: [true]
      })
    });

    // Inicializar Formulario de Descuentos
    this.discountsForm = this.#fb.group({
      transferDiscountPercentage: [0],
      cashDiscountPercentage: [0]
    });

    // Inicializar Formulario de Precios & Estrategia
    this.pricingForm = this.#fb.group({
      profit: [50],
      method: ['markup'],
      costCurrency: ['USD'],
      dollarQuoteType: ['oficial'],
      customDollarRate: [0]
    });

    // Efecto para sincronizar con StoreConfig cuando carga
    effect(() => {
      const config = this.storeConfigState.StoreConfig().config;
      if (config) {
        // Patch Gateways
        if (config.paymentGateways) {
          if (config.paymentGateways.mercadopago) {
            this.gatewaysForm.get('mercadopago')?.patchValue({
              active: config.paymentGateways.mercadopago.active ?? false,
              publicKey: config.paymentGateways.mercadopago.publicKey ?? '',
              accessToken: config.paymentGateways.mercadopago.accessToken ?? '',
              webhookSecret: config.paymentGateways.mercadopago.webhookSecret ?? '',
              environment: config.paymentGateways.mercadopago.environment ?? 'production',
              checkoutMode: config.paymentGateways.mercadopago.checkoutMode ?? 'bricks',
              baseCommission: config.paymentGateways.mercadopago.baseCommission ?? 6.6,
              cft3cuotas: config.paymentGateways.mercadopago.cft3cuotas ?? 12.09,
              cft6Cuotas: config.paymentGateways.mercadopago.cft6Cuotas ?? 19.09,
              cft12cuotas: config.paymentGateways.mercadopago.cft12cuotas ?? 0,
              maxInstallments: config.paymentGateways.mercadopago.maxInstallments ?? 3,
              absorbInstallments: config.pricingStrategy?.absorbInstallments ?? true,
              maxInstallmentsToAbsorb: config.pricingStrategy?.maxInstallmentsToAbsorb ?? 3,
              card1PayDiscount: config.pricingStrategy?.card1PayDiscount ?? false
            });
          }
          if (config.paymentGateways.getnet) {
            this.gatewaysForm.get('getnet')?.patchValue({
              active: config.paymentGateways.getnet.active ?? false,
              clientId: config.paymentGateways.getnet.clientId ?? '',
              clientSecret: config.paymentGateways.getnet.clientSecret ?? '',
              environment: config.paymentGateways.getnet.environment ?? 'sandbox',
              checkoutMode: config.paymentGateways.getnet.checkoutMode ?? 'redirect',
              baseCommission: config.paymentGateways.getnet.baseCommission ?? 3.5,
              cft3cuotas: config.paymentGateways.getnet.cft3cuotas ?? 0,
              cft6Cuotas: config.paymentGateways.getnet.cft6Cuotas ?? 10,
              cft12cuotas: config.paymentGateways.getnet.cft12cuotas ?? 0,
              maxInstallments: config.paymentGateways.getnet.maxInstallments ?? 6
            });
          }
          if (config.paymentGateways.uala) {
            this.gatewaysForm.get('uala')?.patchValue({
              active: config.paymentGateways.uala.active ?? false,
              userName: config.paymentGateways.uala.credentials?.userName ?? '',
              clientId: config.paymentGateways.uala.credentials?.clientId ?? '',
              clientSecret: config.paymentGateways.uala.credentials?.clientSecret ?? '',
              baseCommission: config.paymentGateways.uala.baseCommission ?? 0,
              cft3cuotas: config.paymentGateways.uala.cft3cuotas ?? 0,
              cft6Cuotas: config.paymentGateways.uala.cft6Cuotas ?? 0,
              cft12cuotas: config.paymentGateways.uala.cft12cuotas ?? 0,
              callbackSuccess: config.paymentGateways.uala.callbackSuccess ?? config.callbackURLs?.success ?? '',
              callbackFail: config.paymentGateways.uala.callbackFail ?? config.callbackURLs?.fail ?? '',
              notificationUrl: config.paymentGateways.uala.notificationUrl ?? config.callbackURLs?.notification ?? ''
            });
          }
          if (config.paymentGateways.transfer) {
            this.gatewaysForm.get('transfer')?.patchValue({
              active: config.paymentGateways.transfer.active ?? true
            });
          }
        }

        // Patch Discounts
        if (config.pricingStrategy) {
          this.discountsForm.patchValue({
            transferDiscountPercentage: config.pricingStrategy.transferDiscountPercentage ?? 0,
            cashDiscountPercentage: config.pricingStrategy.cashDiscountPercentage ?? 0
          });

          this.pricingForm.patchValue({
            method: config.pricingStrategy.method ?? 'markup',
          });
        }

        // Patch Pricing General
        this.pricingForm.patchValue({
          profit: config.profit ?? 50,
          costCurrency: config.costCurrency ?? 'USD',
          dollarQuoteType: config.dollarQuoteType ?? 'oficial',
          customDollarRate: config.customDollarRate ?? 0
        });
      }
    });
  }

  ngOnInit() {
    this.#paymentMethodsState.refresh();
    this.storeConfigState.refresh();
    this.fetchDolarQuotes(true);
  }

  async fetchDolarQuotes(refresh = false) {
    this.isLoadingDolares.set(true);
    try {
      const data = await this.storeConfigState.getDolares(refresh);
      this.dolarQuotes.set(data || []);
    } catch {
      // Manejado silenciosamente
    } finally {
      this.isLoadingDolares.set(false);
    }
  }

  signMercadoPago() {
    this.storeConfigState.signMercadoPago();
  }

  private getCompletePricingStrategy(override: Partial<IPricingStrategy>): IPricingStrategy {
    const current = this.storeConfigState.StoreConfig().config?.pricingStrategy;
    return {
      method: override.method ?? current?.method ?? 'markup',
      transferGrossUp: override.transferGrossUp ?? current?.transferGrossUp ?? true,
      absorbInstallments: override.absorbInstallments ?? current?.absorbInstallments ?? true,
      maxInstallmentsToAbsorb: override.maxInstallmentsToAbsorb ?? current?.maxInstallmentsToAbsorb ?? 3,
      transferDiscountPercentage: override.transferDiscountPercentage ?? current?.transferDiscountPercentage ?? 0,
      cashDiscountPercentage: override.cashDiscountPercentage ?? current?.cashDiscountPercentage ?? 0,
      card1PayDiscount: override.card1PayDiscount ?? current?.card1PayDiscount ?? false,
    };
  }

  async saveGateways() {
    this.isSavingGateways.set(true);
    try {
      const gVal = this.gatewaysForm.value;
      const mpVal = gVal.mercadopago || {};
      const getnetVal = gVal.getnet || {};
      const ualaVal = gVal.uala || {};
      const currentConfig = this.storeConfigState.StoreConfig().config;

      await this.storeConfigState.saveConfig({
        paymentGateways: {
          ...currentConfig?.paymentGateways,
          mercadopago: {
            ...currentConfig?.paymentGateways?.mercadopago,
            active: mpVal.active ?? false,
            publicKey: mpVal.publicKey ?? '',
            accessToken: mpVal.accessToken ?? '',
            webhookSecret: mpVal.webhookSecret ?? '',
            environment: mpVal.environment ?? 'production',
            checkoutMode: mpVal.checkoutMode ?? 'bricks',
            baseCommission: Number(mpVal.baseCommission) || 0,
            cft3cuotas: Number(mpVal.cft3cuotas) || 0,
            cft6Cuotas: Number(mpVal.cft6Cuotas) || 0,
            cft12cuotas: Number(mpVal.cft12cuotas) || 0,
            maxInstallments: Number(mpVal.maxInstallments) || 3
          },
          getnet: {
            ...currentConfig?.paymentGateways?.getnet,
            active: getnetVal.active ?? false,
            clientId: getnetVal.clientId ?? '',
            clientSecret: getnetVal.clientSecret ?? '',
            environment: getnetVal.environment ?? 'sandbox',
            checkoutMode: getnetVal.checkoutMode ?? 'redirect',
            baseCommission: Number(getnetVal.baseCommission) || 0,
            cft3cuotas: Number(getnetVal.cft3cuotas) || 0,
            cft6Cuotas: Number(getnetVal.cft6Cuotas) || 0,
            cft12cuotas: Number(getnetVal.cft12cuotas) || 0,
            maxInstallments: Number(getnetVal.maxInstallments) || 6
          },
          uala: {
            ...currentConfig?.paymentGateways?.uala,
            active: ualaVal.active ?? false,
            baseCommission: Number(ualaVal.baseCommission) || 0,
            cft3cuotas: Number(ualaVal.cft3cuotas) || 0,
            cft6Cuotas: Number(ualaVal.cft6Cuotas) || 0,
            cft12cuotas: Number(ualaVal.cft12cuotas) || 0,
            callbackSuccess: ualaVal.callbackSuccess ?? '',
            callbackFail: ualaVal.callbackFail ?? '',
            notificationUrl: ualaVal.notificationUrl ?? '',
            credentials: {
              userName: ualaVal.userName ?? '',
              clientId: ualaVal.clientId ?? '',
              clientSecret: ualaVal.clientSecret ?? ''
            }
          },
          transfer: {
            ...currentConfig?.paymentGateways?.transfer,
            active: gVal.transfer?.active ?? true
          }
        },
        callbackURLs: {
          ...currentConfig?.callbackURLs,
          success: ualaVal.callbackSuccess ?? currentConfig?.callbackURLs?.success ?? '',
          fail: ualaVal.callbackFail ?? currentConfig?.callbackURLs?.fail ?? '',
          notification: ualaVal.notificationUrl ?? currentConfig?.callbackURLs?.notification ?? ''
        },
        pricingStrategy: this.getCompletePricingStrategy({
          absorbInstallments: mpVal.absorbInstallments ?? true,
          maxInstallmentsToAbsorb: Number(mpVal.maxInstallmentsToAbsorb) || 3,
          card1PayDiscount: mpVal.card1PayDiscount ?? false
        })
      });
      this.#paymentMethodsState.refresh();
      this.#NotificationService.success('Configuración de pasarelas guardada correctamente');
      this.hasPendingRecalculation.set(true);
    } catch (err) {
      this.#NotificationService.error('Error al guardar pasarelas');
    } finally {
      this.isSavingGateways.set(false);
    }
  }

  async saveDiscounts() {
    this.isSavingDiscounts.set(true);
    try {
      const dVal = this.discountsForm.value;

      await this.storeConfigState.saveConfig({
        pricingStrategy: this.getCompletePricingStrategy({
          transferDiscountPercentage: Number(dVal.transferDiscountPercentage) || 0,
          cashDiscountPercentage: Number(dVal.cashDiscountPercentage) || 0
        })
      });
      this.#NotificationService.success('Descuentos actualizados correctamente');
    } catch (err) {
      this.#NotificationService.error('Error al guardar descuentos');
    } finally {
      this.isSavingDiscounts.set(false);
    }
  }

  async savePricing() {
    this.isSavingPricing.set(true);
    try {
      const pVal = this.pricingForm.value;

      const res = await this.storeConfigState.saveConfig({
        profit: Number(pVal.profit) || 50,
        costCurrency: pVal.costCurrency,
        dollarQuoteType: pVal.dollarQuoteType,
        customDollarRate: Number(pVal.customDollarRate) || 0,
        pricingStrategy: this.getCompletePricingStrategy({
          method: pVal.method
        })
      });

      if (res.shouldRecalculate) {
        this.#NotificationService.info('Se recomienda recalcular los precios del catálogo para aplicar los nuevos márgenes o cotización.');
        this.hasPendingRecalculation.set(true);
      }
    } catch (err) {
      this.#NotificationService.error('Error al guardar la estrategia de precios');
    } finally {
      this.isSavingPricing.set(false);
    }
  }

  async recalculateCatalogPrices() {
    this.isRecalculating.set(true);
    try {
      await this.storeConfigState.recalculatePrices();
    } finally {
      this.isRecalculating.set(false);
    }
  }

  async toggleMPActive(active: boolean) {
    try {
      const mpState = this.state().automaticGateways.mercadopago;
      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            active,
            excludedPaymentMethods: mpState.excludedPaymentMethods || [],
            excludedPaymentTypes: mpState.excludedPaymentTypes || []
          }
        }
      });
      this.gatewaysForm.get('mercadopago.active')?.setValue(active);
      this.#NotificationService.success(`Mercado Pago ${active ? 'activado' : 'desactivado'}`);
    } catch (err) {
      this.#NotificationService.error('Error al actualizar Mercado Pago');
    }
  }

  async toggleMethodExclusion(methodId: string) {
    try {
      const mpState = this.state().automaticGateways.mercadopago;
      const currentMethods = mpState.excludedPaymentMethods || [];
      const isExcluded = currentMethods.includes(methodId);
      const updatedMethods = isExcluded
        ? currentMethods.filter(id => id !== methodId)
        : [...currentMethods, methodId];

      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            active: this.gatewaysForm.get('mercadopago.active')?.value ?? mpState.active,
            excludedPaymentMethods: updatedMethods,
            excludedPaymentTypes: mpState.excludedPaymentTypes || []
          }
        }
      });
      this.#NotificationService.info('Preferencia de tarjeta actualizada');
    } catch (err) {
      this.#NotificationService.error('Error al actualizar tarjeta');
    }
  }

  async toggleTypeExclusion(type: string) {
    try {
      const mpState = this.state().automaticGateways.mercadopago;
      const currentTypes = mpState.excludedPaymentTypes || [];
      const isExcluded = currentTypes.includes(type);
      const updatedTypes = isExcluded
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];

      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            active: this.gatewaysForm.get('mercadopago.active')?.value ?? mpState.active,
            excludedPaymentMethods: mpState.excludedPaymentMethods || [],
            excludedPaymentTypes: updatedTypes
          }
        }
      });
      this.#NotificationService.info('Preferencia de cupón actualizada');
    } catch (err) {
      this.#NotificationService.error('Error al actualizar tipo');
    }
  }

  async toggleTransferActive(active: boolean) {
    try {
      const currentConfig = this.storeConfigState.StoreConfig().config;
      await this.storeConfigState.saveConfig({
        paymentGateways: {
          ...currentConfig?.paymentGateways,
          transfer: {
            ...currentConfig?.paymentGateways?.transfer,
            active
          }
        }
      });
      this.gatewaysForm.get('transfer.active')?.setValue(active);
      this.#NotificationService.success(`Transferencias bancarias ${active ? 'activadas' : 'desactivadas'}`);
    } catch (err) {
      this.#NotificationService.error('Error al actualizar estado de transferencia');
    }
  }

  async toggleManualMethodStatus(method: any) {
    try {
      await this.#paymentMethodsService.update(method._id, {
        isActive: !method.isActive
      });
      this.#paymentMethodsState.refresh();
      this.#NotificationService.success(`Método "${method.name}" ${!method.isActive ? 'activado' : 'desactivado'}`);
    } catch (err) {
      this.#NotificationService.error('Error al actualizar método');
    }
  }

  selectDollarQuote(casa: string) {
    this.pricingForm.get('dollarQuoteType')?.setValue(casa);
    this.pricingForm.markAsDirty();
  }

  async delete(id: string) {
    if (confirm('¿Estás seguro de eliminar este método de pago?')) {
      try {
        await this.#paymentMethodsState.deletePaymentMethod(id);
        this.#NotificationService.success('Método de pago eliminado');
      } catch (err) {
        this.#NotificationService.error('Error al eliminar');
      }
    }
  }

  // Métodos de Recálculo Masivo & Simulación
  async openRecalculateModal() {
    this.showRecalculateModal.set(true);
    await this.loadRecalculatePreview();
  }

  closeRecalculateModal() {
    this.showRecalculateModal.set(false);
  }

  async toggleRecalculateScope(onlyActive: boolean) {
    if (this.recalculateOnlyActive() === onlyActive) return;
    this.recalculateOnlyActive.set(onlyActive);
    await this.loadRecalculatePreview();
  }

  async loadRecalculatePreview() {
    this.isLoadingPreview.set(true);
    try {
      const res = await this.#storeConfigService.previewRecalculatePrices(this.recalculateOnlyActive());
      this.recalculatePreviewData.set(res);
    } catch (err) {
      this.#NotificationService.error('Error al generar la simulación de recálculo');
    } finally {
      this.isLoadingPreview.set(false);
    }
  }

  get filteredPreviewItems() {
    const data = this.recalculatePreviewData();
    if (!data || !data.items) return [];
    const search = this.previewSearch().toLowerCase().trim();
    if (!search) return data.items;
    return data.items.filter((item: any) =>
      item.model?.toLowerCase().includes(search) ||
      item.brand?.toLowerCase().includes(search)
    );
  }

  async confirmRecalculation() {
    this.isExecutingRecalculate.set(true);
    try {
      const res = await this.#storeConfigService.recalculatePrices(this.recalculateOnlyActive());
      this.#NotificationService.success(res.message || `¡Precios actualizados exitosamente! (${res.updatedCount} productos)`);
      this.showRecalculateModal.set(false);
      this.recalculatePreviewData.set(null);
    } catch (err) {
      this.#NotificationService.error('Error al aplicar el recálculo masivo');
    } finally {
      this.isExecutingRecalculate.set(false);
    }
  }
}
