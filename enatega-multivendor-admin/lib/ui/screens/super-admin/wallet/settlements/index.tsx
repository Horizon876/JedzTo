'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import {
  GET_RESTAURANT_SETTLEMENTS,
} from '@/lib/api/graphql/queries/settlements';
import { SETTLE_RESTAURANT_PERIOD } from '@/lib/api/graphql/mutations/settlements';

function periodOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    opts.push({ label: key, value: key });
  }
  return opts;
}

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`;
}

export default function SettlementsScreen() {
  const t = useTranslations();
  const [periodKey, setPeriodKey] = useState(periodOptions()[0].value);
  const { data, loading, refetch } = useQuery(GET_RESTAURANT_SETTLEMENTS, {
    variables: { periodKey },
    fetchPolicy: 'network-only',
  });
  const [settle, { loading: settling }] = useMutation(SETTLE_RESTAURANT_PERIOD, {
    onCompleted: () => refetch(),
  });

  const rows = data?.restaurantSettlements || [];
  const totals = useMemo(() => {
    return rows.reduce(
      (acc: any, r: any) => ({
        gross: acc.gross + Number(r.totalGross || 0),
        payout: acc.payout + Number(r.onlinePayoutDue || 0),
        owed: acc.owed + Number(r.cashCommissionOwed || 0),
        commission: acc.commission + Number(r.commissionDue || 0),
      }),
      { gross: 0, payout: 0, owed: 0, commission: 0 }
    );
  }, [rows]);

  return (
    <div className="screen-container p-4 text-white bg-dark-950 min-h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary-color">
            {t('Settlements')}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Online → Ty wypłacasz. Gotówka → restauracja oddaje prowizję.
          </p>
        </div>
        <Dropdown
          value={periodKey}
          options={periodOptions()}
          onChange={(e) => setPeriodKey(e.value)}
          className="w-40"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('OnlineGross') + ' + cash', value: totals.gross },
          { label: t('CommissionDue'), value: totals.commission },
          { label: t('OnlinePayoutDue'), value: totals.payout },
          { label: t('CashOwedToPlatform'), value: totals.owed },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-dark-600 bg-dark-900 p-4"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {card.label}
            </div>
            <div className="mt-2 text-xl font-bold text-primary-color">
              {money(card.value)}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r: any) => (
            <div
              key={`${r.restaurantId}-${r.periodKey}`}
              className="rounded-xl border border-dark-600 bg-dark-900 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{r.restaurantName}</h2>
                  <p className="text-sm text-gray-400">
                    {t('CommissionPercent')}: {r.commissionRate}% ·{' '}
                    {r.status === 'SETTLED' ? t('Settled') : t('OpenPeriod')}
                  </p>
                </div>
                {r.status !== 'SETTLED' ? (
                  <Button
                    label={t('MarkSettled')}
                    loading={settling}
                    onClick={() =>
                      settle({
                        variables: {
                          restaurantId: r.restaurantId,
                          periodKey: r.periodKey,
                        },
                      })
                    }
                    className="bg-primary-color border-primary-color"
                  />
                ) : (
                  <span className="rounded-lg bg-[#30D158]/15 px-3 py-1 text-sm font-bold text-[#30D158]">
                    {t('Settled')}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <div className="text-gray-400">{t('OnlineGross')}</div>
                  <div className="font-semibold">{money(r.onlineGross)}</div>
                </div>
                <div>
                  <div className="text-gray-400">{t('CashGross')}</div>
                  <div className="font-semibold">{money(r.cashGross)}</div>
                </div>
                <div>
                  <div className="text-gray-400">{t('CommissionDue')}</div>
                  <div className="font-semibold">{money(r.commissionDue)}</div>
                </div>
                <div>
                  <div className="text-gray-400">{t('CashOwedToPlatform')}</div>
                  <div className="font-semibold text-[#FF9F0A]">
                    {money(r.cashCommissionOwed)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">{t('OnlinePayoutDue')}</div>
                  <div className="font-semibold text-[#30D158]">
                    {money(r.onlinePayoutDue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!rows.length && (
            <p className="text-gray-400">Brak restauracji / zamówień w tym miesiącu.</p>
          )}
        </div>
      )}
    </div>
  );
}
