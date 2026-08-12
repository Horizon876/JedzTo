'use client';

import { IProvider } from '@/lib/utils/interfaces';

const Layout = ({ children }: IProvider) => {
  return <div className="min-h-screen w-full">{children}</div>;
};

export default Layout;
