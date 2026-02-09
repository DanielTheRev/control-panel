export interface IHeroSlide {
    _id?: string;
    title: string;
    imageDesktop: string;
    imageMobile: string;
    link: string;
    altText: string;
    buttonText: string;
    buttonStyle: string;
    order: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
