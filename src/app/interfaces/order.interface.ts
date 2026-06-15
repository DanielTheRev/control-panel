import { PaymentType } from './paymentInfo.interface';
import { IProduct, IProductFinance, IProductPrices } from './product.interface';
import { IProvider } from './provider.interface';
import { ShippingType } from './shipping.interface';
import { IUser } from './User.interface';

// Enum para estados de orden
export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PROCESSING_SHIPPING = 'PROCESSING_SHIPPING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
// Enum para estados de pago
export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  WAITING_CONFIRMATION = 'waiting_confirmation',
}

export interface IProductSnapshot {
  _id: string;
  brand: string;
  model: string;
  image?: string;
  slug?: string;
  price: IProductPrices;
  finance?: IProductFinance;
  providerSnapshot: IProvider;
}

export interface IVariantSnapshot {
  sku: string;
  size?: string; // ClothingProduct (talle)
  attributes?: { key: string; value: string }[]; // TechProduct
  color?: { name: string; hex: string };
  imageReference: {
    url: string;
    public_id: string;
  };
}

export interface IOrderItem {
  _id?: string; // Auto-generado por Mongoose
  // Snapshot del producto al momento de la compra (con _id para stock ops)
  productSnapshot: IProductSnapshot;
  // Snapshot de la variante al momento de la compra
  variantSnapshot: IVariantSnapshot;
  quantity: number;
  price: number;
	costPriceSnapshot: {
		inUSD: number;
		inARS: number;
	};
}

// Interface para dirección de envío
export interface IShippingAddress {
  street: string;
  number?: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  recipientName?: string;
}

// Interface para información de envío
export interface IShippingInfo {
  _id?: string; // Auto-generado por Mongoose
  type: ShippingType;
  pickupPoint?: {
    name: string;
    address: string;
  };
  shippingAddress?: IShippingAddress;
  cost: number;
  shippedAt: Date;
  deliveredAt: Date;
  freeShippingApplied: boolean;
}

export interface IOrderFinance {
  total: number;
  baseCost: number;
  earnings: number;
  totalOppositeCurrency?: number;
  earningsOppositeCurrency?: number;
  exchangeRateSnapshot?: number;
  installments: number;
  paymentGatewayFee?: number;
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
  buyerData: IFormPayerData;
  total: number;
  orderNumber: string;
  notes?: string;
  finance: IOrderFinance;
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
  number?: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  recipientName?: string;
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
  mercadopagoData?: any;
}

// Interface para filtros
export interface OrderFilters {
  status?: string;
  userId?: string;
  dateRange?: string;
  page: number;
  limit: number;
}
