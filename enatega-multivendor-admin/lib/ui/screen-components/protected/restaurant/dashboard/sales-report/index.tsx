'use client'

import { useContext, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { GET_RESTAURANT_SALES_REPORT } from '@/lib/api/graphql/queries/settlements'
import { GET_RESTAURANT_BY_ID } from '@/lib/api/graphql'

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`
}

export default function RestaurantSalesReportCard() {
  const t = useTranslations()
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext)

  const { data, loading } = useQuery(GET_RESTAURANT_SALES_REPORT, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  })

  const { data: restaurantData } = useQuery(GET_RESTAURANT_BY_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-first',
  })

  const report = data?.restaurantSalesReport
  const commissionRate = Number(
    restaurantData?.restaurant?.commissionRate ?? 10
  )

  const payout = useMemo(() => {
    if (!report) return null
    const totalGross = Number(report.totalGross || 0)
    const apiNet = report.restaurantNet
    const apiFee = report.platformCommission
    if (typeof apiNet === 'number' && typeof apiFee === 'number') {
      return {
        rate: Number(report.commissionRate ?? commissionRate),
        fee: apiFee,
        net: apiNet,
      }
    }
    const fee = Math.round(((totalGross * commissionRate) / 100) * 100) / 100
    return {
      rate: commissionRate,
      fee,
      net: Math.round((totalGross - fee) * 100) / 100,
    }
  }, [report, commissionRate])

  if (loading) {
    return (
      <div className="mb-4 rounded-xl border border-[var(--panel-border)] bg-white p-6 text-[var(--panel-muted)]">
        {t('Loading')}…
      </div>
    )
  }
  if (!report || !payout) return null

  return (
    <div className="mb-4 rounded-xl border border-[var(--panel-border)] bg-white p-5 text-[var(--panel-text)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="m-0 text-xl font-bold">{t('TurnoverOverview')}</h2>
          <p className="m-0 mt-1 text-sm text-[var(--panel-muted)]">
            {t('Last 30 days')}
          </p>
        </div>
        <div className="text-sm text-[var(--panel-muted)]">
          {t('CommissionRate')}: {payout.rate}%
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
            {t('TotalTurnover')}
          </div>
          <div className="mt-1 text-2xl font-bold">{money(report.totalGross)}</div>
          <div className="mt-1 text-xs text-[var(--panel-muted)]">
            {report.orderCount} {t('Orders').toLowerCase()}
          </div>
        </div>
        <div className="rounded-lg border border-[#2F6FED33] bg-[#E8F0FE] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#1f56c7]">
            {t('YourPayout')}
          </div>
          <div className="mt-1 text-2xl font-bold text-[#2F6FED]">
            {money(payout.net)}
          </div>
          <div className="mt-1 text-xs text-[#1f56c7]">{t('YourPayoutHint')}</div>
        </div>
        <div className="rounded-lg bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
            {t('PlatformFee')}
          </div>
          <div className="mt-1 text-2xl font-bold">{money(payout.fee)}</div>
        </div>
        <div className="rounded-lg bg-[#F5F7FA] p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
            {t('ByPayment')}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#30D158]">{t('OnlineGross')}</span>
            <span className="font-semibold">{money(report.onlineGross)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-[#FF9F0A]">{t('CashGross')}</span>
            <span className="font-semibold">{money(report.cashGross)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold">{t('Top items')}</div>
          {(report.topItems || []).slice(0, 5).map(
            (item: { id: string; title?: string; count: number }) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-[var(--panel-border)] py-1.5 text-sm"
              >
                <span>{item.title || item.id}</span>
                <span className="text-[var(--panel-muted)]">×{item.count}</span>
              </div>
            )
          )}
          {!report.topItems?.length ? (
            <p className="text-sm text-[var(--panel-muted)]">{t('NoData')}</p>
          ) : null}
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">{t('ByWeekday')}</div>
          {(report.byWeekday || []).map(
            (d: {
              weekday: number
              label: string
              gross: number
              orderCount: number
            }) => (
              <div
                key={d.weekday}
                className="flex justify-between border-b border-[var(--panel-border)] py-1.5 text-sm"
              >
                <span>{d.label}</span>
                <span>
                  {money(d.gross)} · {d.orderCount}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
