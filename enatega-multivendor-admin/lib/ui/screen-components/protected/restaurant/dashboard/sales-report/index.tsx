'use client';

import { useContext } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { GET_RESTAURANT_SALES_REPORT } from '@/lib/api/graphql/queries/settlements';

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`;
}

export default function RestaurantSalesReportCard() {
  const t = useTranslations();
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext);

  const { data, loading } = useQuery(GET_RESTAURANT_SALES_REPORT, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });

  const report = data?.restaurantSalesReport;
  if (loading || !report) return null;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-dark-600 bg-dark-900 p-4 text-white">
      <h2 className="text-lg font-black text-primary-color mb-3">
        {t('Earnings')} · 30 dni
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <div className="text-xs text-gray-400">{t('Total')}</div>
          <div className="font-bold">{money(report.totalGross)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">{t('OnlineGross')}</div>
          <div className="font-bold text-[#30D158]">{money(report.onlineGross)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">{t('CashGross')}</div>
          <div className="font-bold text-[#FF9F0A]">{money(report.cashGross)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">{t('Orders')}</div>
          <div className="font-bold">{report.orderCount}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-semibold mb-2">{t('Top items')}</div>
          {(report.topItems || []).slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-dark-600">
              <span>{item.title || item.id}</span>
              <span className="text-gray-400">×{item.count}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Po dniach tygodnia</div>
          {(report.byWeekday || []).map((d: any) => (
            <div key={d.weekday} className="flex justify-between text-sm py-1 border-b border-dark-600">
              <span>{d.label}</span>
              <span>
                {money(d.gross)} · {d.orderCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
