export interface IBentoImage {
  url: string;
  public_id: string;
}

export interface IBentoBlock {
  title: string;
  subtitle?: string;
  link: string;
  isActive: boolean;
  gridSpan?: string;
  order?: number;
  imageDesktop: IBentoImage | null;
  imageMobile?: IBentoImage | null;
}

export interface IBentoItem {
  _id?: string;
  title: string;
  subtitle?: string;
  link: string;
  isActive: boolean;
  gridSpan?: string;
  order?: number;
  imageDesktop: IBentoImage | null | string | File;
  imageMobile?: IBentoImage | null | string | File;
}

export interface IBentoConfig {
  _id?: string;
  sectionTitle: string;
  sectionSubtitle: string;
  items?: IBentoItem[];
  blocks?: {
    mainBlock?: IBentoBlock;
    topRightBlock?: IBentoBlock;
    bottomRightBlock?: IBentoBlock;
    footerBlock?: IBentoBlock;
  };
}
