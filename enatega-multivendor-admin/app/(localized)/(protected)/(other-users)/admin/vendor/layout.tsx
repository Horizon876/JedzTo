'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';

/** Vendor panel merged into restaurant store panel. */
export default function VendorRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/store/dashboard');
  }, [router]);
  return <CustomLoader />;
}
