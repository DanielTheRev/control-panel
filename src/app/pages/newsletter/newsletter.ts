import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NewsletterService, INewsletterSubscriber } from '../../services/newsletter.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule],
  templateUrl: './newsletter.html'
})
export class NewsletterComponent implements OnInit {
  #newsletterService = inject(NewsletterService);

  subscribers = signal<INewsletterSubscriber[]>([]);
  isLoading = signal<boolean>(true);
  copiedAlert = signal<boolean>(false);

  ngOnInit(): void {
    this.loadSubscribers();
  }

  loadSubscribers(): void {
    this.isLoading.set(true);
    this.#newsletterService.getSubscribers().subscribe({
      next: (data) => {
        this.subscribers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando suscriptores', err);
        this.isLoading.set(false);
      }
    });
  }

  copyAllEmails(): void {
    const list = this.subscribers().map(s => s.email).join(', ');
    navigator.clipboard.writeText(list).then(() => {
      this.copiedAlert.set(true);
      setTimeout(() => this.copiedAlert.set(false), 3000);
    });
  }

  exportCSV(): void {
    const headers = 'Email,Fecha de Suscripcion\n';
    const rows = this.subscribers().map(s => `"${s.email}","${new Date(s.subscribedAt).toLocaleString('es-AR')}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suscriptores-vura-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  deleteSubscriber(id: string): void {
    if (confirm('¿Estás seguro de eliminar este correo de la lista?')) {
      this.#newsletterService.deleteSubscriber(id).subscribe({
        next: () => this.loadSubscribers(),
        error: (err) => console.error('Error al eliminar suscriptor', err)
      });
    }
  }
}
