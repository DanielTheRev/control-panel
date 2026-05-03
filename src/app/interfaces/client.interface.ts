export interface IClient {
  _id: string;
  name: string;
  email: string;
  role: 'user';
  googleID: string | null;
  profilePhoto: string | null;
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
