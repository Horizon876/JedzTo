'use client';

import { LayoutContext } from '@/lib/context/global/layout.context';
import SimpleAdminDashboard from '@/lib/ui/screen-components/protected/super-admin/home/simple-dashboard';
import { useContext } from 'react';

export default function Home() {
  const { isSuperAdminSidebarVisible } = useContext(LayoutContext);
  return (
    <>
      <div
        className={`flex flex-col ${isSuperAdminSidebarVisible ? 'w-[99%]' : 'w-[100%]'} overflow-x-hidden p-3 h-full bg-[#f8f9fa] dark:bg-dark-950`}
      >
        <SimpleAdminDashboard />
      </div>
    </>
  );
}
