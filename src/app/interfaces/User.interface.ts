export enum Role {
  user = 'user',
  admin = 'admin',
  employee = 'employee',
}

export interface IUser {
  name: string;
  email: string;
  role: Role;
  googleID: string;
  profilePhoto: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
