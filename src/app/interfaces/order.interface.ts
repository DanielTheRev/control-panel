import { PaymentType } from './paymentInfo.interface';
import { IProduct, IProductPrices } from './product.interface';
import { IProvider } from './provider.interface';
import { ShippingType } from './shipping.interface';
import { IUser } from './User.interface';

// Enum para estados de orden
export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PROCESSING_SHIPPING = 'PROCESSING_SHIPPING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}
// Enum para estados de pago
export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  WAITING_CONFIRMATION = 'waiting_confirmation'
}

export interface IOrderItem {
  // Snapshot del producto al momento de la compra (con _id para stock ops)
  productSnapshot: {
    _id: string;
    brand: string;
    model: string;
    image?: string;
    slug: string;
    // Precios al momento de la compra — necesarios para calcular ganancias post-pago
    prices: IProductPrices;
    providerSnapshot: IProvider;
  };
  // Snapshot de la variante al momento de la compra
  variantSnapshot: {
    sku: string;
    size?: string;                                  // ClothingProduct (talle)
    attributes?: { key: string; value: string }[];   // TechProduct
    color?: { name: string; hex: string };
  };
  quantity: number;
  price: number;
}

// Interface para dirección de envío
export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Interface para información de envío
export interface IShippingInfo {
  type: ShippingType;
  pickupPoint?: {
    name: string;
    address: string;
  };
  cost: number;
}

// Interface para información de pago
export interface IPaymentInfo {
  method: PaymentType;
  status: PaymentStatus;
  transactionId?: string;
  paymentDate?: Date;
  amount: number;
}

// Interface principal de la orden
export interface IOrder {
  _id: string;
  user?: IUser;
  items: IOrderItem[];
  history: { status: OrderStatus; timestamp: Date; note?: string }[];
  shippingInfo: IShippingInfo;
  paymentInfo: IPaymentInfo;
  status: OrderStatus;
  shippingCost: number;
  buyerData: IFormPayerData;
  total: number;
  orderNumber: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFormPayerData {
  firstName: string;
  lastName: string;
  email: string;
  identificationType: string;
  identificationNumber: string;
}

export interface OrdersApiResponse {
  data: IOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}


// Interface para dirección de envío
export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Interface para información de envío
export interface IShippingInfo {
  type: ShippingType;
  pickupPoint?: {
    name: string;
    address: string;
  };
  shippingAddress?: IShippingAddress;
  cost: number;
}

// Interface para información de pago
export interface IPaymentInfo {
  method: PaymentType;
  status: PaymentStatus;
  transactionId?: string;
  paymentDate?: Date;
  amount: number;
  mercadopagoData?: any
}

// Interface para filtros
export interface OrderFilters {
  status?: string;
  userId?: string;
  dateRange?: string;
  page: number;
  limit: number;
}
