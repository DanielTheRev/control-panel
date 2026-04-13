import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ProductService } from '../../../services/product.service';
import { IProduct } from '../../../interfaces/product.interface';

@Component({
  selector: 'app-product-search-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, FormsModule],
  templateUrl: './product-search-dialog.html'
})
export class ProductSearchDialogComponent implements OnInit {
  readonly #dialogRef = inject(MatDialogRef<ProductSearchDialogComponent>);
  readonly #productService = inject(ProductService);

  searchQuery = signal('');
  searchSubject = new Subject<string>();
  suggestions = signal<IProduct[]>([]);
  isSearching = signal(false);

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length === 0) {
          this.suggestions.set([]);
          this.isSearching.set(false);
          return [];
        }
        this.isSearching.set(true);
        return this.#productService.getSuggestions(query);
      })
    ).subscribe({
      next: (results) => {
        this.suggestions.set(results);
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false)
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  selectProduct(product: IProduct) {
    this.#dialogRef.close(product);
  }

  close() {
    this.#dialogRef.close();
  }
}
