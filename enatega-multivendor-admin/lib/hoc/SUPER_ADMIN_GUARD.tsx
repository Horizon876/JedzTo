'use client';
// Core
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';

// Hooks
import { useUserContext } from '@/lib/hooks/useUser';

// Constants and Utils
import { ROUTES } from '@/lib/utils/constants';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import { getAccessToken } from '@/lib/utils/methods/auth';

const SUPER_ADMIN_GUARD = <T extends object>(
  Component: React.ComponentType<T>
) => {
  const WrappedComponent = (props: T) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, isSessionVerified } = useUserContext();

    const hasSessionToken = !!getAccessToken();
    const findRouteName = ROUTES.find((v) => v.route === pathname);
    const staffAllowed =
      user?.userType !== 'STAFF' ||
      !findRouteName ||
      !Array.isArray(user.permissions) ||
      user.permissions.includes(findRouteName.text);
    const isAllowed =
      isSessionVerified &&
      !!user &&
      user.userType !== 'RESTAURANT' &&
      user.userType !== 'VENDOR' &&
      staffAllowed;

    useEffect(() => {
      if (!loading && !hasSessionToken) {
        router.replace('/authentication/login');
        return;
      }
      if (!loading && hasSessionToken && !isSessionVerified) {
        router.replace('/authentication/login');
        return;
      }
      if (!loading && isSessionVerified && !isAllowed) {
        // Wrong panel for this account — send them to their own dashboard
        // instead of trapping them on a dead 403 page.
        const fallback =
          DEFAULT_ROUTES[user?.userType as keyof typeof DEFAULT_ROUTES] ??
          '/authentication/login';
        router.replace(fallback);
      }
    }, [hasSessionToken, isAllowed, isSessionVerified, loading, router, user?.userType]);

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
