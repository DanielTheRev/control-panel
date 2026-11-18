export interface IProductFormBlock {
  validate(): string[];
  hydrate(product: any): void;
  appendToFormData(formData: FormData): void;
}
