import { BusinessFeatures } from '../../../services/business-profile.service';

export interface ISidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
  highlight?: boolean;
  adminOnly?: boolean;
  requiredFeature?: keyof BusinessFeatures;
}

export interface ISidebarGroup {
  id: string;
  title: string;
  adminOnly?: boolean;
  requiredFeature?: keyof BusinessFeatures;
  items: ISidebarItem[];
}
