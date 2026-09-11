export type StaffRole = 'admin' | 'employee';

export interface IStaffMember {
  _id: string;
  name: string;
  lastName: string;
  dni?: string;
  phone?: string;
  email: string;
  role: StaffRole;
  position: string;
  isActive: boolean;
  hasPin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateStaffDto {
  name: string;
  lastName?: string;
  dni?: string;
  phone?: string;
  email: string;
  password: string;
  role?: StaffRole;
  position?: string;
  pinCode?: string;
}

export interface IUpdateStaffDto {
  name?: string;
  lastName?: string;
  dni?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: StaffRole;
  position?: string;
  pinCode?: string;
  isActive?: boolean;
}

export interface IStaffListResponse {
  success: boolean;
  data: IStaffMember[];
}

export interface IStaffDetailResponse {
  success: boolean;
  data: IStaffMember;
}

export interface IStaffActionResponse {
  success: boolean;
  message?: string;
  _id?: string;
  isActive?: boolean;
  data?: IStaffMember;
}
