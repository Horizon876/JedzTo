'use client';

import { useContext } from 'react';
import { LayoutContext } from '@/lib/context/global/layout.context';
import {
  IGlobalComponentProps,
  ISidebarMenuItem,
  LayoutContextProps,
} from '@/lib/utils/interfaces';
import {
  faCog,
  faHome,
  faStore,
  faReceipt,
  faTicket,
  faEllipsis,
  faWallet,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import useCheckAllowedRoutes from '@/lib/hooks/useCheckAllowedRoutes';
import SidebarItem from './side-bar-item';
import { useTranslations } from 'next-intl';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';

function SuperAdminSidebar({ children }: IGlobalComponentProps) {
  const { isSuperAdminSidebarVisible } =
    useContext<LayoutContextProps>(LayoutContext);

  return (
    <div className="relative dark:text-white">
      <aside
        id="app-sidebar"
        className={`box-border transform overflow-hidden transition-all duration-300 ease-in-out ${isSuperAdminSidebarVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'}`}
      >
        <nav
          className={`flex h-full flex-col border-r border-dark-600 bg-dark-950 text-white shadow-sm transition-opacity duration-300 ${isSuperAdminSidebarVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <ul className="flex-1 pl-2">{children}</ul>
        </nav>
      </aside>
    </div>
  );
}

export default function MakeSidebar() {
  const t = useTranslations();
  const { isSuperAdminSidebarVisible } =
    useContext<LayoutContextProps>(LayoutContext);

  const navBarItems: ISidebarMenuItem[] = [
    {
      text: 'Home',
      label: t('Home'),
      route: '/home',
      isParent: true,
      icon: faHome,
      isClickable: true,
    },
    {
      text: 'Restaurants',
      label: t('Restaurants'),
      route: '/general/stores',
      isParent: true,
      icon: faStore,
      isClickable: true,
    },
    {
      text: 'Finance',
      label: t('Finance'),
      route: '/wallet',
      isParent: true,
      icon: faWallet,
      subMenu: useCheckAllowedRoutes([
        {
          text: 'Settlements',
          label: t('Settlements'),
          route: '/wallet/settlements',
          isParent: false,
        },
        {
          text: t('Earnings'),
          label: t('Earnings'),
          route: '/wallet/earnings',
          isParent: false,
        },
      ]),
      shouldShow: function () {
        return this.subMenu ? this.subMenu.length > 0 : false;
      },
    },
    {
      text: 'Orders',
      label: t('Orders'),
      route: '/management/orders',
      isParent: true,
      icon: faReceipt,
      isClickable: true,
    },
    {
      text: 'Users',
      label: t('Users'),
      route: '/general/users',
      isParent: true,
      icon: faUsers,
      isClickable: true,
    },
    {
      text: 'Marketing',
      label: t('Marketing'),
      route: '/management/coupons',
      isParent: true,
      icon: faTicket,
      isClickable: true,
    },
  ];

  return (
    <SuperAdminSidebar>
      <div className="h-[90vh] pb-4 overflow-y-auto overflow-x-hidden pr-2">
        {navBarItems.map((item, index) =>
          item.shouldShow && !item.shouldShow() ? null : (
            <SidebarItem
              key={index}
              expanded={isSuperAdminSidebarVisible}
              {...item}
            />
          )
        )}
      </div>
    </SuperAdminSidebar>
  );
}
