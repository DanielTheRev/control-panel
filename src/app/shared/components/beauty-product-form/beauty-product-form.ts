import { CommonModule } from '@angular/common';
import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

export interface BeautyFormValue {
  volume?: string;
  concentration?: string;
  fragranceFamily?: string;
  gender?: string;
  scentNotes?: {
    top?: string;
    heart?: string;
    base?: string;
  };
  applicationArea?: string;
}

@Component({
  selector: 'app-beauty-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon],
  templateUrl: './beauty-product-form.html',
})
export class BeautyProductForm {
  readonly initialValues = input<BeautyFormValue | null>(null);
  readonly formChange = output<BeautyFormValue>();

  readonly form = new FormGroup({
    volume: new FormControl(''),
    concentration: new FormControl('Eau de Parfum (EDP)'),
    fragranceFamily: new FormControl('Amaderada'),
    gender: new FormControl('Unisex'),
    applicationArea: new FormControl('Cuerpo / Cuello'),
    scentNotesTop: new FormControl(''),
    scentNotesHeart: new FormControl(''),
    scentNotesBase: new FormControl(''),
  });

  readonly standardVolumes = ['30ml', '50ml', '75ml', '100ml', '125ml', '150ml', '200ml'];

  readonly concentrations = [
    'Eau de Parfum (EDP)',
    'Eau de Toilette (EDT)',
    'Parfum / Extrait',
    'Eau de Cologne (EDC)',
    'Body Splash / Bruma',
    'Serum / Tratamiento',
    'Crema / Loción',
    'Aceite Esencial',
    'Maquillaje / Cosmético',
  ];

  readonly fragranceFamilies = [
    'Amaderada',
    'Cítrica',
    'Floral',
    'Oriental / Ámbar',
    'Frutal',
    'Gourmand / Dulce',
    'Acuática / Marina',
    'Aromática / Fougère',
    'Cuero / Especiada',
    'Sin Fragancia / Neutro',
  ];

  readonly genders = ['Unisex', 'Hombre', 'Mujer', 'Niños'];

  constructor() {
    // Escuchar cambios y emitir
    this.form.valueChanges.subscribe((v) => {
      this.formChange.emit({
        volume: v.volume || undefined,
        concentration: v.concentration || undefined,
        fragranceFamily: v.fragranceFamily || undefined,
        gender: v.gender || undefined,
        applicationArea: v.applicationArea || undefined,
        scentNotes: (v.scentNotesTop || v.scentNotesHeart || v.scentNotesBase) ? {
          top: v.scentNotesTop || undefined,
          heart: v.scentNotesHeart || undefined,
          base: v.scentNotesBase || undefined,
        } : undefined,
      });
    });

    // Cargar valores iniciales en modo edición
    effect(() => {
      const init = this.initialValues();
      if (init) {
        this.form.patchValue(
          {
            volume: init.volume || '',
            concentration: init.concentration || 'Eau de Parfum (EDP)',
            fragranceFamily: init.fragranceFamily || 'Amaderada',
            gender: init.gender || 'Unisex',
            applicationArea: init.applicationArea || 'Cuerpo / Cuello',
            scentNotesTop: init.scentNotes?.top || '',
            scentNotesHeart: init.scentNotes?.heart || '',
            scentNotesBase: init.scentNotes?.base || '',
          },
          { emitEvent: false }
        );
      }
    });
  }

  setVolume(vol: string) {
    this.form.patchValue({ volume: vol });
  }
}
