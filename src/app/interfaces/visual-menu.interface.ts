export interface IVisualMenuImage {
  url: string;
  public_id: string;
}

export interface IVisualMenuItemChild {
  _id?: string;
  label: string;
  link: string;
  badge?: string;
  order?: number;
}

export interface IVisualMenuItem {
  _id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  link: string;
  isActive: boolean;
  colSpanDesktop: number; // 4, 6, 8, 12
  colSpanTablet?: number; // 3, 6
  colSpanMobile?: number; // 1, 2
  rowSpanDesktop?: number; // 1, 2
  order: number;
  imageDesktop: IVisualMenuImage | null | string | File;
  imageMobile?: IVisualMenuImage | null | string | File;
  children?: IVisualMenuItemChild[];
}

export interface IVisualMenuConfig {
  _id?: string;
  sectionTitle: string;
  sectionSubtitle: string;
  description?: string;
  displayMode?: 'grid' | 'masonry' | 'carousel';
  items: IVisualMenuItem[];
  isActive?: boolean;
}
