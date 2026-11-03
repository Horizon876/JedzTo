'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import { useUserContext } from '@/lib/hooks/useUser';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import {
  getAccessToken,
  isSuperAdminPanelRole,
} from '@/lib/utils/methods/auth';

const VENDOR_GUARD = <T extends object>(Component: React.ComponentType<T>) => {
  const WrappedComponent = (props: T) => {
    const router = useRouter();
    const { user, loading, isSessionVerified, clearUserSession } =
      useUserContext();

    const hasSessionToken = !!getAccessToken();
    const isAllowed =
      isSessionVerified &&
      !!user &&
      (isSuperAdminPanelRole(user.userType) || user.userType === 'VENDOR') &&
      user.userType !== 'RESTAURANT' &&
      user.userType !== 'RIDER';

    useEffect(() => {
      if (loading) return;

      if (!hasSessionToken || !isSessionVerified) {
        clearUserSession();
        router.replace('/authentication/login');
        return;
      }

      if (!isAllowed) {
        const fallback =
          DEFAULT_ROUTES[user?.userType as keyof typeof DEFAULT_ROUTES] ??
          '/authentication/login';
        router.replace(fallback);
      }
    }, [
      clearUserSession,
      hasSessionToken,
      isAllowed,
      isSessionVerified,
      loading,
      router,
      user?.userType,
    ]);

    if (loading) {
      return <CustomLoader />;
    }

    if (!isAllowed) {
      return null;
    }

    return <Component {...props} />;
  };

  return WrappedComponent;
};

export default VENDOR_GUARD;
