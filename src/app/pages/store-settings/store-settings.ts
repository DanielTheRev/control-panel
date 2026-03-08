import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfigStateService } from '../../states/config.state.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatIcon } from '@angular/material/icon';
import { IEcommerceConfig } from '../../interfaces/config.interface';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [PageHeader, PageLayout, ReactiveFormsModule, MatIcon],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss'
})
export class StoreSettings implements OnInit {
  configState = inject(ConfigStateService);
  #sidebarService = inject(SidebarService);
  #fb = inject(FormBuilder);

  configForm: FormGroup;

  constructor() {
    this.#sidebarService.navbarTitle.set({ title: 'Configuración de la Tienda' });

    this.configForm = this.#fb.group({
      name: [''],
      profit: [0],
      taxes: this.#fb.group({
        iva: [21]
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
      paymentGateways: this.#fb.group({
        mercadopago: this.#fb.group({
          active: [false],
          baseCommission: [0],
          accessToken: [''],
          publicKey: ['']
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
        })
      })
    });
  }

  async ngOnInit() {
    await this.configState.loadConfig();
    const currentConfig = this.configState.config();
    if (currentConfig) {
      this.configForm.patchValue(currentConfig);
    }
  }

  async saveConfig() {
    if (this.configForm.invalid) return;
    const formValue = this.configForm.value as IEcommerceConfig;
    await this.configState.saveConfig(formValue);
  }
}
