'use client';

import CustomButton from '@/lib/ui/useable-components/button';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import { getAccessToken, getUserType } from '@/lib/utils/methods/auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const Forbidden = () => {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/authentication/login');
      return;
    }

    const userType = getUserType() as keyof typeof DEFAULT_ROUTES;
    const home = DEFAULT_ROUTES[userType];
    if (home) {
      router.replace(home);
    }
  }, [router]);

  return (
    <main className="h-screen w-full flex flex-col gap-2 justify-center items-center bg-white dark:bg-dark-950">
      <h1 className="text-9xl font-extrabold text-black dark:text-white tracking-widest">
        403
      </h1>
      <div className="bg-primary-dark text-white px-2 text-sm rounded rotate-12 absolute">
        Forbidden
      </div>
      <CustomButton
        onClick={() => {
          const userType = getUserType() as keyof typeof DEFAULT_ROUTES;
          router.replace(
            DEFAULT_ROUTES[userType] ?? '/authentication/login'
          );
        }}
        label="Wróć do panelu"
        className="bg-black text-white px-5 py-2"
      />
    </main>
  );
};

export default Forbidden;
