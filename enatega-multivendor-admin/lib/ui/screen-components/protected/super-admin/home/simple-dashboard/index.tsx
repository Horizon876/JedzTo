'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'

import { GET_DASHBOARD_USERS } from '@/lib/api/graphql/queries/dashboard'
import { GET_RESTAURANT_SETTLEMENTS } from '@/lib/api/graphql/queries/settlements'
import {
  PageHeader,
} from '@/lib/ui/screen-components/protected/layout/shared'

function getCurrentPeriodKey() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`
}

function netBalance(row: {
  onlineGross?: number
  commissionDue?: number
  cashFeeDue?: number
}) {
  return (
    Number(row.onlineGross || 0) -
    Number(row.commissionDue || 0) -
    Number(row.cashFeeDue || 0)
  )
}

type SettlementRow = {
  restaurantId: string
  restaurantName?: string
  totalGross?: number
  onlineGross?: number
  commissionDue?: number
  cashFeeDue?: number
  status?: string
}

export default function SimpleAdminDashboard() {
  const t = useTranslations()
  const periodKey = getCurrentPeriodKey()

  const { data: usersData, loading: usersLoading } = useQuery(
    GET_DASHBOARD_USERS,
    { fetchPolicy: 'cache-and-network' }
  )

  const { data: settlementsData, loading: settlementsLoading } = useQuery(
    GET_RESTAURANT_SETTLEMENTS,
    {
      variables: { periodKey },
      fetchPolicy: 'cache-and-network',
    }
  )

  const counts = useMemo(
    () => ({
      users: usersData?.getDashboardUsers?.usersCount ?? 0,
      restaurants: usersData?.getDashboardUsers?.restaurantsCount ?? 0,
      riders: usersData?.getDashboardUsers?.ridersCount ?? 0,
      monthlyOrders: usersData?.getDashboardUsers?.monthlyOrdersCount ?? 0,
    }),
    [usersData]
  )

  const finance = useMemo(() => {
    const rows: SettlementRow[] =
      settlementsData?.restaurantSettlements || []
    return rows.reduce(
      (acc, s) => {
        const balance = netBalance(s)
        return {
          turnover: acc.turnover + Number(s.totalGross || 0),
          commission: acc.commission + Number(s.commissionDue || 0),
          cashFees: acc.cashFees + Number(s.cashFeeDue || 0),
          payout: acc.payout + (balance > 0 ? balance : 0),
          owed: acc.owed + (balance < 0 ? -balance : 0),
        }
      },
      { turnover: 0, commission: 0, cashFees: 0, payout: 0, owed: 0 }
    )
  }, [settlementsData])

  const platformIncome = finance.commission + finance.cashFees

  const topSettlements = useMemo(() => {
    const rows: SettlementRow[] =
      settlementsData?.restaurantSettlements || []
    return [...rows]
      .sort((a, b) => Math.abs(netBalance(b)) - Math.abs(netBalance(a)))
      .slice(0, 6)
  }, [settlementsData])

  const loading = usersLoading || settlementsLoading

  return (
    <div className="screen-container">
      <PageHeader title={t('Home')} />
      <p className="mb-5 mt-0 text-sm text-[var(--panel-muted)]">
        {t('Period')}: <strong>{periodKey}</strong>
      </p>

      {loading ? (
        <p className="text-[var(--panel-muted)]">{t('Loading')}…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: 'Przychód platformy',
                value: money(platformIncome),
                hint: `Prowizja ${money(finance.commission)} + opłaty COD ${money(finance.cashFees)}`,
                accent: true,
              },
              {
                label: t('TotalTurnover'),
                value: money(finance.turnover),
                hint: 'Obrót lokali (bez opłat COD)',
              },
              {
                label: t('OnlinePayoutDue'),
                value: money(finance.payout),
                hint: 'Suma wypłat do lokali',
              },
              {
                label: t('CashOwedToPlatform'),
                value: money(finance.owed),
                hint: 'Suma dopłat od lokali',
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-xl border p-4 ${
                  card.accent
                    ? 'border-[#2F6FED33] bg-[#E8F0FE]'
                    : 'border-[var(--panel-border)] bg-white'
                }`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    card.accent
                      ? 'text-[#1f56c7]'
                      : 'text-[var(--panel-muted)]'
                  }`}
                >
                  {card.label}
                </div>
                <div
                  className={`mt-2 text-xl font-bold ${
                    card.accent
                      ? 'text-[#2F6FED]'
                      : 'text-[var(--panel-text)]'
                  }`}
                >
                  {card.value}
                </div>
                {card.hint ? (
                  <div
                    className={`mt-1 text-xs ${
                      card.accent
                        ? 'text-[#1f56c7]'
                        : 'text-[var(--panel-muted)]'
                    }`}
                  >
                    {card.hint}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Restauracje', value: counts.restaurants },
              { label: 'Zamówienia (miesiąc)', value: counts.monthlyOrders },
              { label: 'Kurierzy', value: counts.riders },
              { label: 'Użytkownicy', value: counts.users },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[var(--panel-border)] bg-white p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
                  {card.label}
                </div>
                <div className="mt-2 text-xl font-bold text-[var(--panel-text)]">
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-border)] px-4 py-3">
              <h2 className="m-0 text-base font-bold text-[var(--panel-text)]">
                Rozliczenia lokali
              </h2>
              <Link
                href="/wallet/settlements"
                className="text-sm font-semibold text-[#2F6FED] hover:underline"
              >
                Zobacz wszystkie
              </Link>
            </div>
            {topSettlements.length ? (
              topSettlements.map((r) => {
                const balance = netBalance(r)
                return (
                  <div
                    key={r.restaurantId}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-border)] px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <div className="font-semibold text-[var(--panel-text)]">
                        {r.restaurantName || r.restaurantId}
                      </div>
                      <div className="text-xs text-[var(--panel-muted)]">
                        Obrót {money(Number(r.totalGross || 0))} ·{' '}
                        {r.status === 'SETTLED'
                          ? t('Settled')
                          : t('OpenPeriod')}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[var(--panel-text)]">
                      {balance > 0
                        ? `${t('PlatformPays')}: ${money(balance)}`
                        : balance < 0
                          ? `${t('RestaurantPays')}: ${money(-balance)}`
                          : `${t('SettledZero')}: ${money(0)}`}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="p-4 text-sm text-[var(--panel-muted)]">
                {t('NoSettlementsThisPeriod')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
