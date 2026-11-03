'use client';

import React, { memo } from 'react';
import { useTranslations } from 'next-intl';
import { IUserStats } from '@/lib/utils/interfaces/users.interface';
import { formatDateTime } from '@/lib/utils/methods';

interface UserStatsProps {
  stats?: IUserStats | null;
  loading?: boolean;
}

const money = (value: number) =>
  `${Number(value || 0).toFixed(2).replace('.', ',')} zł`;

const UserStats: React.FC<UserStatsProps> = ({ stats, loading }) => {
  const t = useTranslations();

  const cards = [
    {
      label: t('user_stat_total_orders'),
      value: loading ? '…' : String(stats?.totalOrders ?? 0),
    },
    {
      label: t('user_stat_delivered'),
      value: loading ? '…' : String(stats?.deliveredOrders ?? 0),
    },
    {
      label: t('user_stat_cancelled'),
      value: loading ? '…' : String(stats?.cancelledOrders ?? 0),
    },
    {
      label: t('user_stat_total_spent'),
      value: loading ? '…' : money(stats?.totalSpent ?? 0),
    },
    {
      label: t('user_stat_avg_order'),
      value: loading ? '…' : money(stats?.averageOrderValue ?? 0),
    },
    {
      label: t('user_stat_last_order'),
      value: loading
        ? '…'
        : stats?.lastOrderAt
          ? formatDateTime(stats.lastOrderAt, 'pl-PL', undefined, '—')
          : '—',
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {card.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default memo(UserStats);
