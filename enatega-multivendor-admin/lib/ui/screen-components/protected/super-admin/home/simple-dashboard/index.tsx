'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_DASHBOARD_USERS } from '@/lib/api/graphql/queries/dashboard';
import { GET_RESTAURANT_SETTLEMENTS } from '@/lib/api/graphql/queries/settlements';

// Helper to get current period key
function getCurrentPeriodKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`;
}

export default function SimpleAdminDashboard() {
  const t = useTranslations();
  const [periodKey] = useState(getCurrentPeriodKey());

  // Pobranie danych o użytkownikach
  const { data: usersData, loading: usersLoading } = useQuery(GET_DASHBOARD_USERS, {
    fetchPolicy: 'cache-and-network',
  });

  // Pobranie rozliczeń wszystkich restauracji dla bieżącego miesiąca
  const { data: settlementsData, loading: settlementsLoading } = useQuery(GET_RESTAURANT_SETTLEMENTS, {
    variables: { periodKey },
    fetchPolicy: 'cache-and-network',
  });

  const dashboardUsers = useMemo(() => {
    if (!usersData) return null;
    return {
      usersCount: usersData?.getDashboardUsers?.usersCount ?? 0,
      restaurantsCount: usersData?.getDashboardUsers?.restaurantsCount ?? 0,
    };
  }, [usersData]);

  const financialStats = useMemo(() => {
    if (!settlementsData?.restaurantSettlements) return { commission: 0, turnover: 0 };
    
    let totalCommission = 0;
    let totalTurnover = 0;

    settlementsData.restaurantSettlements.forEach((s: any) => {
      totalCommission += Number(s.commissionDue || 0);
      totalTurnover += Number(s.totalGross || 0);
    });

    return {
      commission: totalCommission,
      turnover: totalTurnover
    };
  }, [settlementsData]);

  if (usersLoading || settlementsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-gray-500">Ładowanie statystyk...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-8 md:p-12 lg:p-16">
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-10">
        Podsumowanie biznesu ({periodKey})
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Zarobki (Prowizja na czysto) */}
        <div className="flex flex-col bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-sm rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-2">Prowizja (na czysto)</p>
          <p className="text-5xl font-bold text-primary-color dark:text-primary-color drop-shadow-sm">
            {money(financialStats.commission)}
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Łączny obrót restauracji: <span className="font-semibold text-gray-700 dark:text-gray-300">{money(financialStats.turnover)}</span>
            </p>
          </div>
        </div>

        {/* Liczba Restauracji */}
        <div className="flex flex-col bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-sm rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-2">Restauracje</p>
          <p className="text-5xl font-bold text-gray-800 dark:text-white drop-shadow-sm">
            {dashboardUsers?.restaurantsCount ?? 0}
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Zarejestrowane lokale w systemie
            </p>
          </div>
        </div>

        {/* Liczba Zamówień w tym miesiącu */}
        <div className="flex flex-col bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-sm rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-2">Zamówienia</p>
          <p className="text-5xl font-bold text-gray-800 dark:text-white drop-shadow-sm">
            {usersData?.getDashboardUsers?.monthlyOrdersCount ?? 0}
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Łączna liczba w tym miesiącu
            </p>
          </div>
        </div>

        {/* Liczba Użytkowników */}
        <div className="flex flex-col bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-sm rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
          <p className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-2">Użytkownicy</p>
          <p className="text-5xl font-bold text-gray-800 dark:text-white drop-shadow-sm">
            {dashboardUsers?.usersCount ?? 0}
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Zarejestrowani klienci aplikacji
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
