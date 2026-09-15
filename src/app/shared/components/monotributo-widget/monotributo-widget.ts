import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ArcaService, IMonotributoReport } from '../../../services/arca.service';

@Component({
  selector: 'app-monotributo-widget',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatIconModule, RouterLink],
  templateUrl: './monotributo-widget.html',
  styleUrl: './monotributo-widget.scss'
})
export class MonotributoWidget implements OnInit {
  private arcaService = inject(ArcaService);

  report = signal<IMonotributoReport | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.arcaService.getMonotributoReport().subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la salud fiscal de Monotributo.');
        this.loading.set(false);
      }
    });
  }

  getProgressBarColorClass(status?: string): string {
    if (status === 'danger') return 'progress-error';
    if (status === 'warning') return 'progress-warning';
    return 'progress-success';
  }

  getBadgeStatusClass(status?: string): string {
    if (status === 'danger') return 'bg-error/15 text-error border-error/30';
    if (status === 'warning') return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-success/15 text-success border-success/30';
  }

  getStatusLabel(status?: string): string {
    if (status === 'danger') return 'Excedido / Riesgo';
    if (status === 'warning') return 'Alerta de Límite';
    return 'En Regla';
  }
}
