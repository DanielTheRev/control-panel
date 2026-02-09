// Enum para tipos de envío
export enum ShippingType {
  PICKUP = 'Punto de encuentro', // Punto de encuentro
  HOME_DELIVERY = 'Envío a domicilio', // Envío a domicilio
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
  pickupPoints?: IPickupPoint[];
  isDefaultForCash: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
