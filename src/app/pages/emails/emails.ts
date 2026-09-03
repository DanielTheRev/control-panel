import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { IEmailTemplateItem, IEmailTemplatesConfig } from '../../interfaces/config.interface';
import { NotificationsService } from '../../services/notifications.service';
import { SidebarService } from '../../services/sidebar.service';
import { StoreConfigService } from '../../services/store.config.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';

@Component({
  selector: 'app-emails',
  standalone: true,
  imports: [
    CommonModule,
    PageLayout,
    PageHeader,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './emails.html',
})
export class EmailsComponent implements OnInit {
  #sidebarService = inject(SidebarService);
  #storeConfigService = inject(StoreConfigService);
  storeConfigState = inject(StoreConfigStateService);
  #notificationService = inject(NotificationsService);
  #fb = inject(FormBuilder);

  emailsForm: FormGroup;
  resendQuickForm: FormGroup;

  isSaving = signal(false);
  isSavingResend = signal(false);
  showResendConfigModal = signal(false);
  showResendHelpModal = signal(false);
  showTestEmailModal = signal(false);
  isSendingTestEmail = signal(false);
  testEmailRecipient = signal<string>('');
  testEmailTemplateKey = signal<string>('orderConfirmation');

  // Preview & Editor state
  selectedEmailTemplate = signal<string>('orderConfirmation');
  previewDevice = signal<'desktop' | 'mobile'>('desktop');
  focusedField = signal<string>('message');

  // Visibility toggle for API key
  showResendKey = signal<boolean>(false);

  // Computed: Resend status
  isResendConfigured = computed(() => {
    const config = this.storeConfigState.StoreConfig().config;
    const resend = config?.integrations?.resend;
    return Boolean(resend?.apiKey && resend.apiKey.trim() !== '' && resend.active);
  });

  resendFromEmail = computed(() => {
    const config = this.storeConfigState.StoreConfig().config;
    return config?.integrations?.resend?.fromEmail || '';
  });

  resendFromName = computed(() => {
    const config = this.storeConfigState.StoreConfig().config;
    return config?.integrations?.resend?.fromName || config?.name || 'Mi Tienda';
  });

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
      subject: 'Instrucciones para abonar tu pedido #{{numero_orden}} 🏦',
      heading: 'Completá tu transferencia para confirmar la compra',
      message: 'Por favor realizá la transferencia bancaria con los siguientes datos para que podamos procesar tu envío:',
      extraInstructions: 'Recordá enviarnos el comprobante de pago respondiendo a este email o vía WhatsApp.',
      buttonText: 'Subir Comprobante de Pago'
    },
    cashPayment: {
      enabled: true,
      subject: 'Pedido #{{numero_orden}} registrado para pago en efectivo 💵',
      heading: 'Tu pedido está reservado para abonar en el local',
      message: 'Te esperamos en nuestro punto de retiro para abonar y retirar tus productos.',
      extraInstructions: 'Tenés hasta 48 horas hábiles para retirar tu pedido antes de que se libere el stock.',
      buttonText: 'Ver Ubicación del Local'
    },
    paymentReceived: {
      enabled: true,
      subject: '¡Pago recibido para la orden #{{numero_orden}}! ✅',
      heading: '¡Tu pago fue acreditado con éxito!',
      message: 'Confirmamos la recepción de tu pago. Tu compra ya está en proceso de armado y empaquetado.',
      extraInstructions: 'Te avisaremos por este medio en cuanto tu paquete sea despachado.',
      buttonText: 'Ver Mi Compra'
    },
    paymentPending: {
      enabled: true,
      subject: 'Tu pago para la orden #{{numero_orden}} está pendiente ⏳',
      heading: 'Estamos validando tu pago',
      message: 'La pasarela de pagos está procesando tu transacción. Te notificaremos en cuanto se complete.',
      extraInstructions: 'Si abonaste con cupón de efectivo (Rapipago/Pago Fácil), la acreditación puede demorar hasta 24 hs.',
      buttonText: 'Consultar Estado'
    },
    orderShipped: {
      enabled: true,
      subject: '¡Tu pedido #{{numero_orden}} ya va en camino! 🚚',
      heading: '¡Tu paquete ya fue despachado!',
      message: 'Tu compra ha sido entregada a la empresa de transporte y va rumbo a tu domicilio.',
      extraInstructions: 'Podés rastrear el envío en tiempo real con el código de seguimiento provisto.',
      buttonText: 'Seguir Mi Envío'
    },
    orderDelivered: {
      enabled: true,
      subject: '¿Qué te pareció tu compra #{{numero_orden}}? ⭐',
      heading: '¡Tu pedido fue entregado con éxito!',
      message: 'Esperamos que disfrutes tus productos. Tu opinión nos ayuda muchísimo a seguir mejorando.',
      extraInstructions: '¿Tuviste algún inconveniente? Respondé a este correo y te asistiremos de inmediato.',
      buttonText: 'Dejar una Reseña'
    },
    abandonedCart: {
      enabled: false,
      subject: '¿Olvidaste algo en tu carrito? 🛒',
      heading: 'Tus productos favoritos te están esperando',
      message: 'Notamos que dejaste artículos en tu carrito de compras. ¡Completá tu pedido antes de que se agoten!',
      extraInstructions: 'Usá el cupón VUELVE10 para obtener un 10% de descuento en tu compra hoy.',
      buttonText: 'Recuperar Mi Carrito'
    },
    backInStock: {
      enabled: false,
      subject: '¡{{producto_nombre}} vuelve a tener stock disponible! ✨',
      heading: '¡El producto que querías ya está disponible!',
      message: 'Te avisamos que el artículo que guardaste en tus favoritos volvió a ingresar con stock renovado.',
      extraInstructions: 'Las unidades son limitadas, te recomendamos asegurar tu compra pronto.',
      buttonText: 'Comprar Ahora'
    }
  };

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Emails & Plantillas'
    });

    const createTemplateGroup = (def?: IEmailTemplateItem) => this.#fb.group({
      enabled: [def?.enabled ?? true],
      subject: [def?.subject ?? ''],
      heading: [def?.heading ?? ''],
      message: [def?.message ?? ''],
      extraInstructions: [def?.extraInstructions ?? ''],
      buttonText: [def?.buttonText ?? ''],
      fromName: [def?.fromName ?? ''],
      fromEmail: [def?.fromEmail ?? ''],
      replyTo: [def?.replyTo ?? '']
    });

    this.emailsForm = this.#fb.group({
      branding: this.#fb.group({
        primaryColor: [this.defaultEmailTemplates.branding?.primaryColor ?? '#111827'],
        footerText: [this.defaultEmailTemplates.branding?.footerText ?? ''],
        showSocialLinks: [this.defaultEmailTemplates.branding?.showSocialLinks ?? true],
        showStoreLogo: [this.defaultEmailTemplates.branding?.showStoreLogo ?? true]
      }),
      orderConfirmation: createTemplateGroup(this.defaultEmailTemplates.orderConfirmation),
      bankTransfer: createTemplateGroup(this.defaultEmailTemplates.bankTransfer),
      cashPayment: createTemplateGroup(this.defaultEmailTemplates.cashPayment),
      paymentReceived: createTemplateGroup(this.defaultEmailTemplates.paymentReceived),
      paymentPending: createTemplateGroup(this.defaultEmailTemplates.paymentPending),
      orderShipped: createTemplateGroup(this.defaultEmailTemplates.orderShipped),
      orderDelivered: createTemplateGroup(this.defaultEmailTemplates.orderDelivered),
      abandonedCart: createTemplateGroup(this.defaultEmailTemplates.abandonedCart),
      backInStock: createTemplateGroup(this.defaultEmailTemplates.backInStock)
    });

    this.resendQuickForm = this.#fb.group({
      active: [true],
      apiKey: [''],
      fromEmail: [''],
      fromName: ['']
    });

    effect(() => {
      const config = this.storeConfigState.StoreConfig().config;
      if (config) {
        if (config.emailTemplates) {
          this.emailsForm.patchValue(config.emailTemplates, { emitEvent: false });
        }
        if (config.integrations?.resend) {
          this.resendQuickForm.patchValue({
            active: config.integrations.resend.active ?? true,
            apiKey: config.integrations.resend.apiKey ?? '',
            fromEmail: config.integrations.resend.fromEmail ?? '',
            fromName: config.integrations.resend.fromName ?? config.name ?? ''
          }, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit(): void {
    this.storeConfigState.refresh();
  }

  get emailBrandingControl(): FormGroup {
    return this.emailsForm.get('branding') as FormGroup;
  }

  get currentTemplateControl(): FormGroup {
    const key = this.selectedEmailTemplate();
    return (this.emailsForm.get(key) as FormGroup) || (this.emailsForm.get('orderConfirmation') as FormGroup);
  }

  get currentDefaultTemplate(): IEmailTemplateItem {
    const key = this.selectedEmailTemplate() as keyof IEmailTemplatesConfig;
    return (this.defaultEmailTemplates[key] as IEmailTemplateItem) || this.defaultEmailTemplates.orderConfirmation;
  }

  get previewLogoUrl(): string | null {
    return this.storeConfigState.StoreConfig().config?.logo || null;
  }

  get previewStoreName(): string {
    return this.storeConfigState.StoreConfig().config?.name || 'Mi Tienda';
  }

  get livePreviewSubject(): string {
    const formVal = this.currentTemplateControl.get('subject')?.value || this.currentDefaultTemplate.subject || '';
    return this.replaceSampleVariables(formVal);
  }

  get livePreviewHeading(): string {
    const formVal = this.currentTemplateControl.get('heading')?.value || this.currentDefaultTemplate.heading || '';
    return this.replaceSampleVariables(formVal);
  }

  get livePreviewMessage(): string {
    const formVal = this.currentTemplateControl.get('message')?.value || this.currentDefaultTemplate.message || '';
    return this.replaceSampleVariables(formVal);
  }

  get livePreviewExtraInstructions(): string {
    const formVal = this.currentTemplateControl.get('extraInstructions')?.value || this.currentDefaultTemplate.extraInstructions || '';
    return this.replaceSampleVariables(formVal);
  }

  get livePreviewButtonText(): string {
    return this.currentTemplateControl.get('buttonText')?.value || this.currentDefaultTemplate.buttonText || 'Ver Estado';
  }

  get livePreviewSender(): string {
    const tplFromName = this.currentTemplateControl.get('fromName')?.value;
    const tplFromEmail = this.currentTemplateControl.get('fromEmail')?.value;
    const fromName = tplFromName || this.resendFromName();
    const fromEmail = tplFromEmail || this.resendFromEmail() || 'ordenes@mitienda.com';
    return `${fromName} <${fromEmail}>`;
  }

  replaceSampleVariables(template: string): string {
    if (!template) return '';
    const sampleVars: Record<string, string> = {
      cliente_nombre: 'Federico Gómez',
      numero_orden: 'ORD-8492',
      nombre_tienda: this.previewStoreName,
      total_orden: '$ 45.900',
      metodo_envio: 'Envío a Domicilio Express',
      direccion_envio: 'Av. Corrientes 1234, CABA',
      codigo_seguimiento: 'AR-99382104',
      transporte: 'Andreani',
      alias_transferencia: 'vura.tienda.nx',
      cbu_transferencia: '0000003100077162947946',
      banco_transferencia: 'Naranja X',
      titular_transferencia: 'Fernando Larrosa',
      producto_nombre: 'Remera Oversize Basic',
      codigo_cupon: 'BIENVENIDO10'
    };

    let result = template;
    for (const [k, v] of Object.entries(sampleVars)) {
      const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, v);
    }
    return result;
  }

  selectEmailTemplate(key: string) {
    this.selectedEmailTemplate.set(key);
  }

  setFocusedField(fieldName: string) {
    this.focusedField.set(fieldName);
  }

  insertVariable(tag: string) {
    const field = this.focusedField();
    const ctrl = this.currentTemplateControl.get(field);
    if (!ctrl) return;

    const currentVal = ctrl.value || '';
    ctrl.setValue(currentVal + (currentVal ? ' ' : '') + tag);
    ctrl.markAsDirty();
  }

  async saveEmailTemplates() {
    this.isSaving.set(true);
    try {
      await this.storeConfigState.saveConfig({
        emailTemplates: this.emailsForm.value
      });
      this.#notificationService.success('Plantillas de email guardadas exitosamente');
    } catch (err) {
      this.#notificationService.error('Error al guardar plantillas de email');
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveResendQuickConfig() {
    this.isSavingResend.set(true);
    try {
      const rVal = this.resendQuickForm.value;
      const currentConfig = this.storeConfigState.StoreConfig().config;

      await this.storeConfigState.saveConfig({
        integrations: {
          ...currentConfig?.integrations,
          resend: {
            active: rVal.active ?? true,
            apiKey: rVal.apiKey?.trim() ?? '',
            fromEmail: rVal.fromEmail?.trim() ?? '',
            fromName: rVal.fromName?.trim() ?? ''
          }
        }
      });

      this.#notificationService.success('Configuración de Resend guardada correctamente');
      this.showResendConfigModal.set(false);
    } catch (err) {
      this.#notificationService.error('Error al guardar configuración de Resend');
    } finally {
      this.isSavingResend.set(false);
    }
  }

  async sendTestEmail() {
    const recipient = this.testEmailRecipient().trim();
    if (!recipient) {
      this.#notificationService.error('Ingresá un correo destinatario para la prueba');
      return;
    }

    if (!this.isResendConfigured()) {
      this.#notificationService.error('Primero debés configurar y activar tu API Key de Resend');
      return;
    }

    this.isSendingTestEmail.set(true);
    try {
      const res = await this.#storeConfigService.sendTestEmail(this.testEmailTemplateKey(), recipient);
      this.#notificationService.success(res.message || `¡Email de prueba enviado a ${recipient}!`);
      this.showTestEmailModal.set(false);
    } catch (err: any) {
      this.#notificationService.error(err?.error?.message || err?.message || 'Error al enviar email de prueba. Verificá tu API Key y dominio en Resend.');
    } finally {
      this.isSendingTestEmail.set(false);
    }
  }
}
