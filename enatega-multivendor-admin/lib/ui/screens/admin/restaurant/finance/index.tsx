'use client'

import { useContext, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { Dropdown } from 'primereact/dropdown'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { GET_RESTAURANT_SETTLEMENT } from '@/lib/api/graphql/queries/settlements'
import {
  PageHeader,
  PageTabs,
} from '@/lib/ui/screen-components/protected/layout/shared'
import SettlementPdfReport, {
  SettlementPdfData,
} from '@/lib/ui/screen-components/protected/shared/settlement-pdf-report'
import {
  finalSettlementBalance,
  moneyPln,
  periodOptions,
} from '@/lib/utils/settlement-period'

export default function RestaurantFinanceScreen() {
  const t = useTranslations()
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext)

  const options = periodOptions()
  const [activeTab, setActiveTab] = useState('current')
  const [historyPeriodKey, setHistoryPeriodKey] = useState(
    options[1]?.value || options[0]?.value
  )
  const currentPeriodKey = options[0].value
  const periodKey =
    activeTab === 'current' ? currentPeriodKey : historyPeriodKey

  const { data, loading } = useQuery(GET_RESTAURANT_SETTLEMENT, {
    variables: { restaurantId, periodKey },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  })

  const [printData, setPrintData] = useState<SettlementPdfData | null>(null)

  useEffect(() => {
    if (printData) {
      setTimeout(() => window.print(), 100)
    }
    const handleAfterPrint = () => setPrintData(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [printData])

  const row = data?.restaurantSettlement
  const balance = row ? finalSettlementBalance(row) : 0

  return (
    <>
      {printData ? <SettlementPdfReport data={printData} /> : null}

      <div className="screen-container print:hidden">
        <PageHeader title={t('Finance')} />
        <p className="mb-4 mt-0 text-sm text-[var(--panel-muted)]">
          Cotygodniowe rozliczenie prowizji i wypłat
        </p>

        <PageTabs
          tabs={[
            { id: 'current', label: t('CurrentWeek') },
            { id: 'history', label: t('PreviousWeeks') },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'history' ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--panel-muted)]">
              {t('SelectWeek')}
            </span>
            <Dropdown
              value={historyPeriodKey}
              options={options.slice(1)}
              onChange={(e) => setHistoryPeriodKey(e.value)}
              className="w-72"
            />
          </div>
        ) : (
          <div className="mb-4 text-sm text-[var(--panel-muted)]">
            {t('Period')}:{' '}
            <strong>{options[0]?.label || currentPeriodKey}</strong>
          </div>
        )}

        {!restaurantId || loading ? (
          <p className="text-[var(--panel-muted)]">{t('Loading')}…</p>
        ) : !row ? (
          <p className="text-[var(--panel-muted)]">
            {t('NoSettlementsThisPeriod')}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold text-[var(--panel-text)]">
                  {row.restaurantName}
                </h2>
                <p className="m-0 mt-1 text-sm text-[var(--panel-muted)]">
                  {t('CommissionPercent')}: {row.commissionRate}% ·{' '}
                  {row.status === 'SETTLED' ? t('Settled') : t('OpenPeriod')}
                </p>
              </div>
              <button
                type="button"
                className="h-10 rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold text-[var(--panel-text)] hover:bg-[#F8FAFC]"
                onClick={() => setPrintData(row)}
              >
                {t('PrintPdf')}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('OnlineGross')}
                </div>
                <div className="mt-1 font-semibold">
                  {moneyPln(row.onlineGross)}
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('CashGross')}
                </div>
                <div className="mt-1 font-semibold">
                  {moneyPln(row.cashGross)}
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('CommissionDue')}
                </div>
                <div className="mt-1 font-semibold">
                  {moneyPln(row.commissionDue)}
                </div>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  balance > 0
                    ? 'bg-[#E8F0FE]'
                    : balance < 0
                      ? 'bg-[#FEF3C7]'
                      : 'bg-[#F5F7FA]'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
                  {t('FinalSettlement')}
                </div>
                <div className="mt-1 font-bold text-[var(--panel-text)]">
                  {balance > 0
                    ? `${t('PlatformPays')}: ${moneyPln(balance)}`
                    : balance < 0
                      ? `${t('RestaurantPays')}: ${moneyPln(-balance)}`
                      : `${t('SettledZero')}: ${moneyPln(0)}`}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--panel-border)] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('TotalTurnover')}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {moneyPln(row.totalGross)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('OnlinePayoutDue')}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {moneyPln(balance > 0 ? balance : 0)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] p-3">
                <div className="text-xs text-[var(--panel-muted)]">
                  {t('CashOwedToPlatform')}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {moneyPln(balance < 0 ? -balance : 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
