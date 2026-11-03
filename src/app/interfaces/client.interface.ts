export interface IClientCurrentAccount {
  balance: number;
  creditLimit: number;
  isCreditAllowed: boolean;
}

export interface IClient {
  _id: string;
  name: string;
  lastName?: string;
  dni?: string;
  phone?: string;
  email: string;
  role: 'user';
  googleID: string | null;
  profilePhoto: string | null;
  currentAccount?: IClientCurrentAccount;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IClientPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IClientResponse {
  data: IClient[];
  pagination: IClientPagination;
}
