export interface IBentoImage {
  url: string;
  public_id: string;
}

export interface IBentoBlock {
  title: string;
  subtitle?: string;
  link: string;
  isActive: boolean;
  imageDesktop: IBentoImage | null;
  imageMobile: IBentoImage | null;
}

export interface IBentoConfig {
  _id?: string;
  sectionTitle: string;
  sectionSubtitle: string;
  blocks: {
    mainBlock: IBentoBlock;
    topRightBlock: IBentoBlock;
    bottomRightBlock: IBentoBlock;
    footerBlock: IBentoBlock;
  };
}
