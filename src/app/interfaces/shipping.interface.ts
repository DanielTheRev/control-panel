// Enum para tipos de envío
export enum ShippingType {
  HOME_DELIVERY = 'Envío a domicilio',
  BRANCH_PICKUP = 'Retiro en sucursal',
  STORE_PICKUP = 'Retiro en local',
  PICKUP = 'Punto de encuentro',
}

// Interface para punto de venta
export interface IPickupPoint {
  name: string;
  address: string;
}

// Interface principal del documento
export interface IShippingOption {
  _id: string;
  type: ShippingType;
  name: string;
  cost: number;
  carrier?: string;
  estimatedDelivery?: string;
  instructions?: string;
  pickupPoints?: IPickupPoint[];
  isDefaultForCash: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
