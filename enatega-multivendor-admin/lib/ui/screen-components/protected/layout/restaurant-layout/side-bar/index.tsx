'use client';

import { useContext, useState } from 'react';
import { LayoutContext } from '@/lib/context/global/layout.context';
import {
  IGlobalComponentProps,
  ISidebarMenuItem,
  LayoutContextProps,
} from '@/lib/utils/interfaces';
import {
  faArrowLeft,
  faChartLine,
  faMapLocationDot,
  faRectangleList,
  faStore,
  faUtensils,
  faPowerOff,
} from '@fortawesome/free-solid-svg-icons';
import SidebarItem from './side-bar-item';
import { useUserContext } from '@/lib/hooks/useUser';
import { onUseLocalStorage } from '@/lib/utils/methods';
import { useTranslations } from 'next-intl';

function AdminSidebar({ children }: IGlobalComponentProps) {
  const { isRestaurantSidebarVisible } =
    useContext<LayoutContextProps>(LayoutContext);

  return (
    <div className="relative">
      <aside
        id="app-sidebar"
        className={`box-border transform overflow-hidden transition-all duration-300 ease-in-out ${isRestaurantSidebarVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'}`}
      >
        <nav
          className={`flex h-full flex-col border-r border-dark-600 bg-dark-950 text-white shadow-sm transition-opacity duration-300 ${isRestaurantSidebarVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <ul className="flex-1 pl-2">{children}</ul>
        </nav>
      </aside>
    </div>
  );
}

export default function MakeSidebar() {
  const t = useTranslations();
  const { isRestaurantSidebarVisible } =
    useContext<LayoutContextProps>(LayoutContext);
  const { user } = useUserContext();
  const [routeStack, setRouteStack] = useState<string[]>(
    JSON.parse(onUseLocalStorage('get', 'routeStack') || '[]')
  );
  const lastRoute =
    routeStack.length > 0 ? routeStack[routeStack.length - 1] : null;

  const navBarItems: ISidebarMenuItem[] = [
    {
      text: t('Dashboard'),
      route: '/admin/store/dashboard',
      isParent: true,
      icon: faChartLine,
      isClickable: true,
    },
    {
      text: t('Menu'),
      route: '/admin/store/product-management',
      isParent: true,
      icon: faUtensils,
      subMenu: [
        {
          text: t('Products'),
          route: '/admin/store/product-management/food',
          isParent: false,
        },
        {
          text: t('Categories'),
          route: '/admin/store/product-management/category',
          isParent: false,
        },
        {
          text: t('Options'),
          route: '/admin/store/product-management/options',
          isParent: false,
        },
        {
          text: t('Addons'),
          route: '/admin/store/product-management/add-ons',
          isParent: false,
        },
      ],
    },
    {
      text: t('Delivery & Timing'),
      route: '/admin/store/general/delivery-areas',
      isParent: true,
      icon: faMapLocationDot,
      subMenu: [
        {
          text: t('Areas'),
          route: '/admin/store/general/delivery-areas',
          isParent: false,
        },
        {
          text: t('Timing'),
          route: '/admin/store/general/timing',
          isParent: false,
        },
        {
          text: t('Holidays'),
          route: '/admin/store/general/holidays',
          isParent: false,
        },
      ],
    },
    {
      text: t('Orders'),
      route: '/admin/store/orders',
      isParent: true,
      icon: faRectangleList,
      isClickable: true,
    },
    {
      text: t('PauseOrders'),
      route: '/admin/store/general/pause',
      isParent: true,
      icon: faPowerOff,
      isClickable: true,
    },
  ];

  return (
    <AdminSidebar>
      <div className="h-[92vh] overflow-y-auto overflow-x-hidden pr-2">
        {navBarItems.map((item, index) =>
          item.shouldShow && !item.shouldShow() ? null : (
            <SidebarItem
              key={index}
              expanded={isRestaurantSidebarVisible}
              {...item}
            />
          )
        )}
      </div>
    </AdminSidebar>
  );
}
