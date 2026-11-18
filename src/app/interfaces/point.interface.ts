export interface IPointDevice {
  id: string;
  name: string;
  operatingMode: string;
  posId?: string;
  storeId?: string;
  externalId?: string;
}

export interface IPointOrderResponse {
  orderId: string;
  status: string;
  deviceId: string;
  totalAmount: number;
  externalReference: string;
  createdAt?: string;
  paymentDetails?: {
    paymentId?: string;
    status?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    cardLastFourDigits?: string;
  };
}
