import { Routes } from '@angular/router';
import { addonGuard, capabilityGuard } from '../guards/capability.guard';
import { ShippingOptions } from '../pages/shipping-options/shipping-options';

/**
 * Rutas modulares de catálogo web, marketing, envíos y storefront.
 * Protegidas estrictamente por capabilities y addons desde GET /api/tenant/bootstrap.
 */
export const fashionRoutes: Routes = [
  {
    path: 'shipping-options',
    canActivate: [capabilityGuard('showShippingOptions')],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ShippingOptions
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/shipping-options-create/shipping-options-create').then(c => c.ShippingOptionsCreate)
      },
      {
        path: 'edit/:shippingOptionID',
        loadComponent: () => import('../pages/shipping-options-create/shipping-options-create').then(c => c.ShippingOptionsCreate)
      }
    ]
  },
  {
    path: 'home-layout',
    title: 'Diseño del Home',
    canActivate: [capabilityGuard('showBanners')],
    loadComponent: () => import('../pages/home-layout/home-layout').then(c => c.HomeLayoutComponent),
  },
  {
    path: 'banners',
    canActivate: [capabilityGuard('showBanners')],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/banner-list/banner-list').then(c => c.BannerList)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/banner-create/banner-create').then(c => c.BannerCreate)
      },
      {
        path: 'edit/:bannerID',
        loadComponent: () => import('../pages/banner-create/banner-create').then(c => c.BannerCreate)
      }
    ]
  },
  {
    path: 'menus',
    canActivate: [capabilityGuard('showWebMenus')],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/menu-list/menu-list').then(c => c.MenuListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/menu-editor/menu-editor').then(c => c.MenuEditorComponent)
      },
      {
        path: 'edit/:menuId',
        loadComponent: () => import('../pages/menu-editor/menu-editor').then(c => c.MenuEditorComponent)
      }
    ]
  },
  {
    path: 'bento',
    redirectTo: 'menus',
    pathMatch: 'full'
  },
  {
    path: 'hero',
    canActivate: [capabilityGuard('showHeroSlider')],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/hero-list/hero-list').then(c => c.HeroListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/hero-create/hero-create').then(c => c.HeroCreateComponent)
      },
      {
        path: 'edit/:slideID',
        loadComponent: () => import('../pages/hero-create/hero-create').then(c => c.HeroCreateComponent)
      }
    ]
  },
  {
    path: 'shop-the-look',
    canActivate: [capabilityGuard('showProductBundles')],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/shop-the-look/shop-the-look-list/shop-the-look-list').then(c => c.ShopTheLookListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/shop-the-look/shop-the-look-create/shop-the-look-create').then(c => c.ShopTheLookCreateComponent)
      },
      {
        path: 'edit/:lookID',
        loadComponent: () => import('../pages/shop-the-look/shop-the-look-create/shop-the-look-create').then(c => c.ShopTheLookCreateComponent)
      }
    ]
  },
  {
    path: 'recommendations',
    title: 'Recomendaciones',
    canActivate: [capabilityGuard('showRecommendations')],
    loadComponent: () => import('../pages/recommendations/recommendations').then(c => c.RecommendationsComponent)
  },
  {
    path: 'emails',
    title: 'Emails & Plantillas',
    canActivate: [capabilityGuard('showEmailsTemplates')],
    loadComponent: () => import('../pages/emails/emails').then(c => c.EmailsComponent)
  },
  {
    path: 'coupons',
    title: 'Cupones de Descuento',
    canActivate: [capabilityGuard('showCoupons')],
    loadComponent: () => import('../pages/coupons/coupons').then(c => c.CouponsComponent)
  },
  {
    path: 'subscribers',
    title: 'Suscriptores Newsletter',
    canActivate: [addonGuard('newsletter')],
    loadComponent: () => import('../pages/newsletter/newsletter').then(c => c.NewsletterComponent)
  },
  {
    path: 'favorites',
    title: 'Favoritos',
    canActivate: [capabilityGuard('showFavorites')],
    loadComponent: () => import('../pages/favorites/favorites').then(c => c.FavoritesComponent)
  },
];
