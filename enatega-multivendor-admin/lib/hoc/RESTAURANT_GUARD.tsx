'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import { useUserContext } from '@/lib/hooks/useUser';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import { getAccessToken } from '@/lib/utils/methods/auth';

const RESTAURANT_GUARD = <T extends object>(
  Component: React.ComponentType<T>
) => {
  const WrappedComponent = (props: T) => {
    const router = useRouter();
    const { user, loading, isSessionVerified, clearUserSession } =
      useUserContext();

    const hasSessionToken = !!getAccessToken();

    const staffRestaurantOk =
      user?.userType === 'STAFF' &&
      Array.isArray(user.permissions) &&
      (user.permissions.includes('Restaurants') ||
        user.permissions.includes('Stores') ||
        user.permissions.includes('Vendors') ||
        user.permissions.includes('*'));

    // Super-admin may open a restaurant (BackToAdmin). Owners stay here.
    // Riders / customers are never allowed.
    const isAllowed =
      isSessionVerified &&
      !!user &&
      (user.userType === 'ADMIN' ||
        user.userType === 'RESTAURANT' ||
        user.userType === 'VENDOR' ||
        staffRestaurantOk);

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

export default RESTAURANT_GUARD;
