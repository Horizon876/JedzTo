'use client';

// Core
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Methods
import { getAccessToken, getUserType } from '@/lib/utils/methods/auth';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/authentication/login');
      return;
    }

    const userType = getUserType() as keyof typeof DEFAULT_ROUTES;
    router.replace(DEFAULT_ROUTES[userType] ?? '/authentication/login');
  }, [router]);

  return <CustomLoader />;
}
