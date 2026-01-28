import { PaymentType } from './paymentInfo.interface';
import { ShippingType } from './shipping.interface';
import { IUser } from './User.interface';

// Enum para estados de orden
export enum OrderStatus {
  PENDING = 'Pendiente de encuentro',
  PROCESSING_SHIPPING = 'En proceso de envío',
  SHIPPED = 'Enviado',
  DELIVERED = 'Entregado',
  CANCELLED = 'Cancelado',
}

// Enum para estados de pago
export enum PaymentStatus {
  PENDING = 'Pendiente',
  APPROVED = 'Aprobado',
  PAID = 'Pagado',
  REJECTED = 'Rechazado',
  CANCELLED = 'Cancelado',
}

// Interface para items de la orden
export interface IOrderItem {
  product: string;
  quantity: number;
  price: number; // Precio al momento de la compra
  name: string; // Nombre del producto al momento de la compra
  image?: string; // Imagen del producto
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
  user: IUser;
  items: IOrderItem[];
  shippingInfo: IShippingInfo;
  paymentInfo: IPaymentInfo;
  status: OrderStatus;
  shippingCost: number;
  total: number;
  orderNumber: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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

// Interface para items de la orden
export interface IOrderItem {
  product: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
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
}

// Interface para filtros
export interface OrderFilters {
  status?: string;
  userId?: string;
  dateRange?: string;
  page: number;
  limit: number;
}
