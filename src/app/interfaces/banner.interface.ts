export interface IBanner {
  _id?: string;
  brandName: string;
  description: string;
  image: string;
  title: string;
  subtitle: string;
  textClass?: string;
  buttonClass?: string;
  icon?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}
