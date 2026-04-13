export interface IProvider {
  _id: string;
  name: string;
  cuit?: string;
  contactEmail?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  active: boolean;
}

export type IProviderCreate = Omit<IProvider, '_id'>;
export type IProviderUpdate = Partial<IProviderCreate>;