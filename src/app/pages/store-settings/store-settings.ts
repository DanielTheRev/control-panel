import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IEcommerceConfig, IDolarRate, IEmailTemplatesConfig, IEmailTemplateItem } from '../../interfaces/config.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { StoreConfigService } from '../../services/store.config.service';
import { NotificationsService } from '../../services/notifications.service';
import { Router } from '@angular/router';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [PageHeader, PageLayout, ReactiveFormsModule, FormsModule, MatIcon, CommonModule, SingleImageUpload, MatTooltipModule],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss'
})
export class StoreSettings {
  configState = inject(StoreConfigStateService);
  #storeConfigService = inject(StoreConfigService);
  #sidebarService = inject(SidebarService);
  #NotificationService = inject(NotificationsService);
  #router = inject(Router);
  #fb = inject(FormBuilder);
  mp_success = input<boolean>();
  mp_error = input<boolean>();
  tab = input<string>();

  configForm: FormGroup;
  logoControl = new FormControl<any>(null);
  isUploadingLogo = signal(false);
  showRecalculateModal = signal(false);
  isRecalculating = signal(false);
  dolarQuotes = signal<IDolarRate[]>([]);
  isLoadingDolares = signal(false);

  activeTab = signal<'general' | 'pricing' | 'gateways' | 'integrations' | 'emails' | 'contact' | 'clothing' | 'pos'>('general');

  // Emails & Templates signals
  selectedEmailTemplate = signal<string>('orderConfirmation');
  previewDevice = signal<'desktop' | 'mobile'>('desktop');
  isSendingTestEmail = signal<boolean>(false);
  testEmailRecipient = signal<string>('');

  emailTemplatesCatalog = [
    { key: 'orderConfirmation', title: 'Confirmación de Compra', icon: 'check_circle', desc: 'Enviado cuando el pago se aprueba y se confirma el pedido.', badge: 'Venta', color: 'text-success' },
    { key: 'bankTransfer', title: 'Datos de Transferencia', icon: 'account_balance', desc: 'Instrucciones bancarias para que el cliente transfiera y suba comprobante.', badge: 'Pago', color: 'text-info' },
    { key: 'cashPayment', title: 'Pago en Efectivo / Local', icon: 'payments', desc: 'Instrucciones para abonar en el punto de retiro o contra entrega.', badge: 'Pago', color: 'text-amber-500' },
    { key: 'paymentReceived', title: 'Pago Acreditado', icon: 'verified', desc: 'Notifica al cliente que su pago fue recibido y pasa a empaquetado.', badge: 'Estado', color: 'text-success' },
    { key: 'paymentPending', title: 'Pago en Revisión', icon: 'hourglass_top', desc: 'Avisa que la pasarela de pagos está validando la transacción.', badge: 'Estado', color: 'text-warning' },
    { key: 'orderShipped', title: 'Pedido en Camino', icon: 'local_shipping', desc: 'Notifica el envío con código de seguimiento y transporte.', badge: 'Envío', color: 'text-primary' },
    { key: 'orderDelivered', title: 'Pedido Entregado', icon: 'inventory_2', desc: 'Avisa la entrega y pide feedback / reseña al cliente.', badge: 'Entrega', color: 'text-secondary' },
    { key: 'abandonedCart', title: 'Carrito Abandonado', icon: 'shopping_cart_checkout', desc: 'Recupera ventas recordando los productos dejados con un cupón.', badge: 'Marketing', color: 'text-error' },
    { key: 'backInStock', title: 'Producto con Stock', icon: 'star', desc: 'Notifica a los usuarios con items en favoritos que volvió a haber stock.', badge: 'Marketing', color: 'text-purple-500' }
  ];

  availableVariables = [
    { tag: '{{cliente_nombre}}', label: 'Nombre del cliente' },
    { tag: '{{numero_orden}}', label: 'N° de orden' },
    { tag: '{{nombre_tienda}}', label: 'Nombre tienda' },
    { tag: '{{total_orden}}', label: 'Total orden' },
    { tag: '{{metodo_envio}}', label: 'Método envío' },
    { tag: '{{direccion_envio}}', label: 'Dirección envío' },
    { tag: '{{codigo_seguimiento}}', label: 'Cód. seguimiento' },
    { tag: '{{transporte}}', label: 'Transportista' },
    { tag: '{{alias_transferencia}}', label: 'Alias banco' },
    { tag: '{{cbu_transferencia}}', label: 'CBU / CVU' },
    { tag: '{{banco_transferencia}}', label: 'Banco' },
    { tag: '{{titular_transferencia}}', label: 'Titular cuenta' },
    { tag: '{{producto_nombre}}', label: 'Nombre producto' },
    { tag: '{{codigo_cupon}}', label: 'Cupón descuento' }
  ];

  defaultEmailTemplates: IEmailTemplatesConfig = {
    branding: {
      primaryColor: '#111827',
      footerText: '¡Gracias por comprar en nuestra tienda! Si tenés alguna duda, respondé directamente a este correo.',
      showSocialLinks: true,
      showStoreLogo: true
    },
    orderConfirmation: {
      enabled: true,
      subject: '¡Tu pedido #{{numero_orden}} está confirmado! 🎉',
      heading: '¡Gracias por tu compra, {{cliente_nombre}}!',
      message: 'Recibimos tu pedido correctamente y ya lo estamos preparando para vos.',
      extraInstructions: '',
      buttonText: 'Ver Estado del Pedido'
    },
    bankTransfer: {
      enabled: true,
      subject: 'Instrucciones de pago para tu pedido #{{numero_orden}} 💳',
      heading: 'Completá tu pago por transferencia',
      message: 'Hola {{cliente_nombre}}, tu pedido fue reservado. Realizá la transferencia bancaria con los siguientes datos y subí el comprobante para que podamos despacharlo.',
      extraInstructions: 'Recordá que tenés 24hs para transferir y subir tu comprobante antes de que se libere el stock.',
      buttonText: 'Subir Comprobante de Pago'
    },
    cashPayment: {
      enabled: true,
      subject: 'Tu pedido #{{numero_orden}} fue registrado con éxito 💵',
      heading: '¡Pedido registrado, {{cliente_nombre}}!',
      message: 'Tu pedido ya fue cargado en nuestro sistema para pago en efectivo al momento del retiro.',
      extraInstructions: 'Podés abonar al momento de retirar en el local o coordinar con nuestro equipo.',
      buttonText: 'Ver Detalle del Pedido'
    },
    paymentReceived: {
      enabled: true,
      subject: '¡Pago acreditado! Tu pedido #{{numero_orden}} está listo para empaquetar 📦',
      heading: '¡Pago acreditado con éxito!',
      message: 'Hola {{cliente_nombre}}, verificamos tu pago de {{total_orden}}. Tu orden ya pasó a preparación.',
      extraInstructions: '',
      buttonText: 'Seguir Mi Pedido'
    },
    paymentPending: {
      enabled: true,
      subject: 'Estamos procesando tu pago del pedido #{{numero_orden}} ⏳',
      heading: 'Tu pago está en revisión',
      message: 'Hola {{cliente_nombre}}, la pasarela de pagos está validando la transacción. Te avisaremos apenas se confirme.',
      extraInstructions: '',
      buttonText: 'Ver Pedido'
    },
    orderShipped: {
      enabled: true,
      subject: '¡Tu pedido #{{numero_orden}} va en camino! 🚚',
      heading: '¡Tu pedido ya fue despachado!',
      message: 'Hola {{cliente_nombre}}, tu paquete ya está en manos del correo o logística para la entrega.',
      extraInstructions: 'Podés hacer el seguimiento de tu envío en tiempo real con el código provisto.',
      buttonText: 'Rastrear Envío'
    },
    orderDelivered: {
      enabled: true,
      subject: '¡Tu pedido #{{numero_orden}} fue entregado! 🛍️',
      heading: '¡Esperamos que disfrutes tu compra!',
      message: 'Hola {{cliente_nombre}}, tu pedido figura como entregado. ¡Gracias por confiar en {{nombre_tienda}}!',
      extraInstructions: 'Si te gustó tu producto, nos encantaría que nos dejes tu reseña o nos etiquetes en redes.',
      buttonText: 'Volver a la Tienda'
    },
    abandonedCart: {
      enabled: true,
      subject: '¿Olvidaste algo? Tu carrito te espera en {{nombre_tienda}} 🛒',
      heading: '¡No dejes escapar tus favoritos!',
      message: 'Hola {{cliente_nombre}}, guardamos los productos que dejaste en tu carrito para que no te quedes sin stock.',
      extraInstructions: '',
      buttonText: 'Recuperar Mi Carrito'
    },
    backInStock: {
      enabled: true,
      subject: '¡Buenas noticias! {{producto_nombre}} volvió a tener stock ✨',
      heading: '¡El producto que querías está de vuelta!',
      message: 'Hola {{cliente_nombre}}, te avisamos que {{producto_nombre}} ya tiene stock disponible nuevamente.',
      extraInstructions: '¡Apurate antes de que se agoten las unidades!',
      buttonText: 'Comprar Ahora'
    }
  };

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
        cashDiscountPercentage: [0],
        card1PayDiscount: [false]
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
      posConfig: this.#fb.group({
        transferValidationMode: ['fast_receipt'],
        allowManualDiscount: [false],
        autoPrintReceipt: [true]
      }),
      shippingConfig: this.#fb.group({
        freeShippingThreshold: [50000]
      }),
      emailTemplates: this.#fb.group({
        branding: this.#fb.group({
          primaryColor: ['#111827'],
          footerText: [''],
          showSocialLinks: [true],
          showStoreLogo: [true]
        }),
        orderConfirmation: this.createTemplateGroup(this.defaultEmailTemplates.orderConfirmation!),
        bankTransfer: this.createTemplateGroup(this.defaultEmailTemplates.bankTransfer!),
        cashPayment: this.createTemplateGroup(this.defaultEmailTemplates.cashPayment!),
        paymentReceived: this.createTemplateGroup(this.defaultEmailTemplates.paymentReceived!),
        paymentPending: this.createTemplateGroup(this.defaultEmailTemplates.paymentPending!),
        orderShipped: this.createTemplateGroup(this.defaultEmailTemplates.orderShipped!),
        orderDelivered: this.createTemplateGroup(this.defaultEmailTemplates.orderDelivered!),
        abandonedCart: this.createTemplateGroup(this.defaultEmailTemplates.abandonedCart!),
        backInStock: this.createTemplateGroup(this.defaultEmailTemplates.backInStock!)
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
      const { hasData, config, hasError, isLoading } = this.configState.StoreConfig();
      if (hasData && !hasError && !isLoading) {
        this.configForm.patchValue(config);
        if (config.logo) {
          this.logoControl.setValue(config.logo);
        }
        if (config.contact?.email && !this.testEmailRecipient()) {
          this.testEmailRecipient.set(config.contact.email);
        }
      }
    });

    effect(() => {
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

    effect(() => {
      const requestedTab = this.tab();
      if (requestedTab && ['general', 'pricing', 'gateways', 'integrations', 'emails', 'contact', 'clothing'].includes(requestedTab)) {
        this.activeTab.set(requestedTab as any);
      }
    });

    // Mutua exclusividad entre pasarelas de tarjeta (Mercado Pago vs Ualá Bis)
    this.configForm.get('paymentGateways.mercadopago.active')?.valueChanges.subscribe((isActive) => {
      if (isActive && this.configForm.get('paymentGateways.uala.active')?.value) {
        this.configForm.get('paymentGateways.uala.active')?.setValue(false, { emitEvent: false });
        this.#NotificationService.info('Mercado Pago activada como pasarela principal de tarjetas. Ualá Bis desactivada.');
      }
    });

    this.configForm.get('paymentGateways.uala.active')?.valueChanges.subscribe((isActive) => {
      if (isActive && this.configForm.get('paymentGateways.mercadopago.active')?.value) {
        this.configForm.get('paymentGateways.mercadopago.active')?.setValue(false, { emitEvent: false });
        this.#NotificationService.info('Ualá Bis activada como pasarela principal de tarjetas. Mercado Pago desactivada.');
      }
    });

    this.loadDolarQuotes();
  }

  private createTemplateGroup(defaults: any): FormGroup {
    return this.#fb.group({
      enabled: [defaults.enabled ?? true],
      subject: [defaults.subject || ''],
      heading: [defaults.heading || ''],
      message: [defaults.message || ''],
      extraInstructions: [defaults.extraInstructions || ''],
      buttonText: [defaults.buttonText || ''],
      fromName: [defaults.fromName || ''],
      fromEmail: [defaults.fromEmail || ''],
      replyTo: [defaults.replyTo || '']
    });
  }

  get currentTemplateControl(): FormGroup {
    return this.configForm.get(`emailTemplates.${this.selectedEmailTemplate()}`) as FormGroup;
  }

  get emailBrandingControl(): FormGroup {
    return this.configForm.get('emailTemplates.branding') as FormGroup;
  }

  get previewSender(): string {
    const tplFromName = this.currentTemplateControl?.get('fromName')?.value?.trim();
    const tplFromEmail = this.currentTemplateControl?.get('fromEmail')?.value?.trim();
    const globalFromName = this.configForm.get('integrations.resend.fromName')?.value?.trim() || this.configForm.get('name')?.value || 'Mi Tienda';
    const globalFromEmail = this.configForm.get('integrations.resend.fromEmail')?.value?.trim() || this.configForm.get('contact.email')?.value || 'ordenes@mitienda.com';

    const senderName = tplFromName || globalFromName;
    const senderEmail = tplFromEmail || globalFromEmail;
    return `${senderName} <${senderEmail}>`;
  }

  lastFocusedField = signal<'subject' | 'heading' | 'message' | 'extraInstructions'>('message');

  get currentDefaultTemplate(): IEmailTemplateItem {
    return (this.defaultEmailTemplates as any)[this.selectedEmailTemplate()] || {};
  }

  setFocusedField(field: 'subject' | 'heading' | 'message' | 'extraInstructions') {
    this.lastFocusedField.set(field);
  }

  selectEmailTemplate(key: string) {
    this.selectedEmailTemplate.set(key);
  }

  insertVariable(tag: string, fieldName?: string) {
    const targetField = fieldName || this.lastFocusedField();
    const control = this.currentTemplateControl?.get(targetField);
    if (!control) return;
    const currentVal = (control.value || '').trim();
    const newVal = currentVal ? `${currentVal} ${tag}` : tag;
    control.setValue(newVal);
    control.markAsDirty();
    this.configForm.markAsDirty();
  }

  resetTemplateToDefault(key: string) {
    const defaultData = (this.defaultEmailTemplates as any)[key];
    if (defaultData) {
      this.configForm.get(`emailTemplates.${key}`)?.patchValue(defaultData);
      this.configForm.markAsDirty();
      this.#NotificationService.info('Plantilla restaurada a los valores predeterminados');
    }
  }

  async sendTestEmail() {
    const email = this.testEmailRecipient();
    if (!email || !email.includes('@')) {
      this.#NotificationService.error('Por favor ingresá un email válido para la prueba');
      return;
    }

    this.isSendingTestEmail.set(true);
    try {
      await this.#storeConfigService.sendTestEmail(this.selectedEmailTemplate(), email);
      this.#NotificationService.success(`¡Email de prueba enviado a ${email}!`);
    } catch (err: any) {
      this.#NotificationService.error(err?.error?.message || 'Error al enviar el email de prueba. Verificá tu API Key de Resend.');
    } finally {
      this.isSendingTestEmail.set(false);
    }
  }

  // Live Preview Helpers
  get previewSubject(): string {
    const raw = this.currentTemplateControl?.get('subject')?.value || '';
    return this.renderMockVariables(raw);
  }

  get previewHeading(): string {
    const raw = this.currentTemplateControl?.get('heading')?.value || '';
    return this.renderMockVariables(raw);
  }

  get previewMessage(): string {
    const raw = this.currentTemplateControl?.get('message')?.value || '';
    return this.renderMockVariables(raw);
  }

  get previewExtraInstructions(): string {
    const raw = this.currentTemplateControl?.get('extraInstructions')?.value || '';
    return this.renderMockVariables(raw);
  }

  get previewButtonText(): string {
    return this.currentTemplateControl?.get('buttonText')?.value || 'Ver Detalle';
  }

  get previewPrimaryColor(): string {
    return this.emailBrandingControl?.get('primaryColor')?.value || '#111827';
  }

  get previewFooterText(): string {
    return this.emailBrandingControl?.get('footerText')?.value || `¡Gracias por comprar en ${this.configForm.get('name')?.value || 'nuestra tienda'}! Si tenés dudas, respondé directamente a este correo.`;
  }

  get showPreviewSocial(): boolean {
    return this.emailBrandingControl?.get('showSocialLinks')?.value !== false;
  }

  get showPreviewLogo(): boolean {
    return this.emailBrandingControl?.get('showStoreLogo')?.value !== false;
  }

  renderMockVariables(text: string): string {
    if (!text) return '';
    const storeName = this.configForm.get('name')?.value || 'Mi Tienda';
    const mockVars: Record<string, string> = {
      cliente_nombre: 'Martín Pérez',
      cliente_primer_nombre: 'Martín',
      numero_orden: 'REV-9823',
      nombre_tienda: storeName,
      total_orden: '$ 48.500',
      metodo_envio: 'Envío a Domicilio',
      direccion_envio: 'Av. Santa Fe 3200, Palermo, CABA',
      codigo_seguimiento: 'AR-99887722',
      transporte: 'Andreani',
      alias_transferencia: this.configForm.get('paymentGateways.transfer.alias')?.value || 'MI.TIENDA.PAGOS',
      cbu_transferencia: this.configForm.get('paymentGateways.transfer.cbuCvu')?.value || '0000003100010002938472',
      banco_transferencia: this.configForm.get('paymentGateways.transfer.bankName')?.value || 'Banco Galicia',
      titular_transferencia: this.configForm.get('paymentGateways.transfer.titular')?.value || 'Martín Comercio S.A.',
      link_comprobante: '#',
      producto_nombre: 'Remera Premium Oversized',
      codigo_cupon: 'PROMO10'
    };

    let result = text;
    for (const [key, value] of Object.entries(mockVars)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
    return result;
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
    this.configState.signMercadoPago();
  }

  isSaving = signal<boolean>(false);
  isSavingSection = signal<string | null>(null);

  get previewLogoUrl(): string | null {
    if (this.logoControl.value && typeof this.logoControl.value === 'string') {
      return this.logoControl.value;
    }
    return this.configState.StoreConfig().config?.logo || null;
  }

  get activeSocialNetworks(): { name: string; url: string }[] {
    const list: { name: string; url: string }[] = [];
    const ig = this.configForm.get('social.instagram')?.value?.trim();
    const fb = this.configForm.get('social.facebook')?.value?.trim();
    const tt = this.configForm.get('social.tiktok')?.value?.trim();
    const wa = this.configForm.get('contact.whatsapp')?.value?.trim() || this.configForm.get('contact.phone')?.value?.trim();

    if (ig) list.push({ name: 'Instagram', url: `https://instagram.com/${ig.replace('@', '')}` });
    if (fb) list.push({ name: 'Facebook', url: fb });
    if (tt) list.push({ name: 'TikTok', url: `https://tiktok.com/@${tt.replace('@', '')}` });
    if (wa) list.push({ name: 'WhatsApp', url: `https://wa.me/${wa.replace(/[^0-9]/g, '')}` });

    return list;
  }

  async saveSlice(sectionName: string, sliceData: Partial<IEcommerceConfig>) {
    this.isSaving.set(true);
    this.isSavingSection.set(sectionName);
    try {
      const { success, shouldRecalculate } = await this.configState.saveConfig(sliceData);
      if (success && shouldRecalculate) {
        this.showRecalculateModal.set(true);
      }
    } finally {
      this.isSaving.set(false);
      this.isSavingSection.set(null);
    }
  }

  async saveGeneralSettings() {
    if (this.isNewLogoSelected) {
      await this.uploadLogo();
    }
    await this.saveSlice('general', {
      name: this.configForm.get('name')?.value
    });
  }

  async savePricingSettings() {
    await this.saveSlice('pricing', {
      profit: this.configForm.get('profit')?.value,
      profit1Pay: this.configForm.get('profit1Pay')?.value,
      profitInstallments: this.configForm.get('profitInstallments')?.value,
      costCurrency: this.configForm.get('costCurrency')?.value,
      dollarQuoteType: this.configForm.get('dollarQuoteType')?.value,
      customDollarRate: this.configForm.get('customDollarRate')?.value,
      taxes: this.configForm.get('taxes')?.value,
      pricingStrategy: this.configForm.get('pricingStrategy')?.value,
      shippingConfig: this.configForm.get('shippingConfig')?.value
    });
  }

  async savePaymentGateways() {
    await this.saveSlice('gateways', {
      paymentGateways: this.configForm.get('paymentGateways')?.value
    });
  }

  async saveIntegrations() {
    await this.saveSlice('integrations', {
      integrations: this.configForm.get('integrations')?.value
    });
  }

  async saveEmailTemplates() {
    await this.saveSlice('emails', {
      emailTemplates: this.configForm.get('emailTemplates')?.value
    });
  }

  async saveContactSettings() {
    await this.saveSlice('contact', {
      contact: this.configForm.get('contact')?.value,
      social: this.configForm.get('social')?.value,
      workingHours: this.configForm.get('workingHours')?.value
    });
  }

  async saveClothingSettings() {
    await this.saveSlice('clothing', {
      clothingFits: this.clothingFits
    });
  }

  get currentTabSaveLabel(): string {
    switch (this.activeTab()) {
      case 'general': return 'Guardar Identidad & Logo';
      case 'pricing': return 'Guardar Precios & Márgenes';
      case 'gateways': return 'Guardar Pasarelas de Pago';
      case 'integrations': return 'Guardar Integraciones';
      case 'emails': return 'Guardar Plantillas de Email';
      case 'contact': return 'Guardar Contacto & Redes';
      case 'clothing': return 'Guardar Cortes & Fits';
      default: return 'Guardar Cambios';
    }
  }

  async saveConfig() {
    const tab = this.activeTab();
    switch (tab) {
      case 'general': return this.saveGeneralSettings();
      case 'pricing': return this.savePricingSettings();
      case 'gateways': return this.savePaymentGateways();
      case 'integrations': return this.saveIntegrations();
      case 'emails': return this.saveEmailTemplates();
      case 'contact': return this.saveContactSettings();
      case 'clothing': return this.saveClothingSettings();
      default: return this.saveGeneralSettings();
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
