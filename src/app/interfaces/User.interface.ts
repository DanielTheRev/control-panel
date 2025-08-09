export enum Role {
  user = 'user',
  admin = 'admin',
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
