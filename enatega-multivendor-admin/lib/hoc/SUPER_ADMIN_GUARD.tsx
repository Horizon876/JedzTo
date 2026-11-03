'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import { useUserContext } from '@/lib/hooks/useUser';
import { ROUTES } from '@/lib/utils/constants';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import {
  getAccessToken,
  isSuperAdminPanelRole,
} from '@/lib/utils/methods/auth';

const SUPER_ADMIN_GUARD = <T extends object>(
  Component: React.ComponentType<T>
) => {
  const WrappedComponent = (props: T) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, isSessionVerified, clearUserSession } =
      useUserContext();

    const hasSessionToken = !!getAccessToken();
    const findRouteName = ROUTES.find((v) => v.route === pathname);
    const staffAllowed =
      user?.userType !== 'STAFF' ||
      !findRouteName ||
      !Array.isArray(user.permissions) ||
      user.permissions.includes(findRouteName.text) ||
      user.permissions.includes('*');

    // Only ADMIN / STAFF — never restaurant owners, riders, or customers.
    const isAllowed =
      isSessionVerified &&
      !!user &&
      isSuperAdminPanelRole(user.userType) &&
      staffAllowed;

    useEffect(() => {
      if (loading) return;

      if (!hasSessionToken || !isSessionVerified) {
        clearUserSession();
        router.replace('/authentication/login');
        return;
      }

      if (!isAllowed) {
        // Owner / rider trying to open /home or /general/* → own panel or login.
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

export default SUPER_ADMIN_GUARD;
