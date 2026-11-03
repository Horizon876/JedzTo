'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { Dropdown } from 'primereact/dropdown'
import { GET_RESTAURANT_SETTLEMENTS } from '@/lib/api/graphql/queries/settlements'
import { SETTLE_RESTAURANT_PERIOD } from '@/lib/api/graphql/mutations/settlements'
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

export default function SettlementsScreen() {
  const t = useTranslations()
  const options = periodOptions()

  const [activeTab, setActiveTab] = useState('current')
  const [historyPeriodKey, setHistoryPeriodKey] = useState(
    options[1]?.value || options[0]?.value
  )

  const currentPeriodKey = options[0].value
  const periodKey =
    activeTab === 'current' ? currentPeriodKey : historyPeriodKey

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_SETTLEMENTS, {
    variables: { periodKey },
    fetchPolicy: 'cache-and-network',
  })

  const [settle, { loading: settling }] = useMutation(SETTLE_RESTAURANT_PERIOD, {
    onCompleted: () => refetch(),
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

  const rows = data?.restaurantSettlements || []
  const totals = useMemo(() => {
    return rows.reduce(
      (
        acc: {
          gross: number
          payout: number
          owed: number
          commission: number
        },
        r: {
          totalGross?: number
          onlineGross?: number
          commissionDue?: number
          cashFeeDue?: number
        }
      ) => {
        const balance = finalSettlementBalance(r)
        return {
          gross: acc.gross + Number(r.totalGross || 0),
          commission: acc.commission + Number(r.commissionDue || 0),
          payout: acc.payout + (balance > 0 ? balance : 0),
          owed: acc.owed + (balance < 0 ? -balance : 0),
        }
      },
      { gross: 0, payout: 0, owed: 0, commission: 0 }
    )
  }, [rows])

  return (
    <>
      {printData ? <SettlementPdfReport data={printData} /> : null}

      <div className="screen-container print:hidden">
        <PageHeader title={t('Finance')} />
        <p className="mb-4 mt-0 text-sm text-[var(--panel-muted)]">
          Prowizje i bilanse wypłat dla restauracji (rozliczenie cotygodniowe)
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
            {t('Period')}: <strong>{options[0]?.label || currentPeriodKey}</strong>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t('TotalTurnover'), value: totals.gross },
            { label: t('CommissionDue'), value: totals.commission },
            { label: t('OnlinePayoutDue'), value: totals.payout },
            { label: t('CashOwedToPlatform'), value: totals.owed },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--panel-border)] bg-white p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--panel-muted)]">
                {card.label}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--panel-text)]">
                {moneyPln(card.value)}
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-[var(--panel-muted)]">{t('Loading')}…</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white">
            {rows.map(
              (r: {
                restaurantId: string
                restaurantName: string
                periodKey: string
                commissionRate: number
                status: string
                onlineGross: number
                cashGross: number
                commissionDue: number
                cashFeeDue?: number
                commissionOnOnline?: number
                commissionOnCash?: number
                totalGross?: number
              }) => {
                const balance = finalSettlementBalance(r)
                return (
                  <div
                    key={`${r.restaurantId}-${r.periodKey}`}
                    className="border-b border-[var(--panel-border)] p-4 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="m-0 text-lg font-bold text-[var(--panel-text)]">
                          {r.restaurantName}
                        </h2>
                        <p className="m-0 mt-1 text-sm text-[var(--panel-muted)]">
                          {t('CommissionPercent')}: {r.commissionRate}% ·{' '}
                          {r.status === 'SETTLED'
                            ? t('Settled')
                            : t('OpenPeriod')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status !== 'SETTLED' ? (
                          <button
                            type="button"
                            disabled={settling}
                            className="h-10 rounded-xl bg-[var(--primary-color)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
                            onClick={() =>
                              settle({
                                variables: {
                                  restaurantId: r.restaurantId,
                                  periodKey: r.periodKey,
                                },
                              })
                            }
                          >
                            {t('MarkSettled')}
                          </button>
                        ) : (
                          <span className="rounded-lg bg-[#DCFCE7] px-3 py-1.5 text-sm font-bold text-[#15803D]">
                            {t('Settled')}
                          </span>
                        )}
                        <button
                          type="button"
                          className="h-10 rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold text-[var(--panel-text)] hover:bg-[#F8FAFC]"
                          onClick={() => setPrintData(r)}
                        >
                          {t('PrintPdf')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-[#F5F7FA] p-3">
                        <div className="text-xs text-[var(--panel-muted)]">
                          {t('OnlineGross')}
                        </div>
                        <div className="mt-1 font-semibold">
                          {moneyPln(r.onlineGross)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#F5F7FA] p-3">
                        <div className="text-xs text-[var(--panel-muted)]">
                          {t('CashGross')}
                        </div>
                        <div className="mt-1 font-semibold">
                          {moneyPln(r.cashGross)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#F5F7FA] p-3">
                        <div className="text-xs text-[var(--panel-muted)]">
                          {t('CommissionDue')}
                        </div>
                        <div className="mt-1 font-semibold">
                          {moneyPln(r.commissionDue)}
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
                  </div>
                )
              }
            )}
            {!rows.length ? (
              <p className="p-5 text-[var(--panel-muted)]">
                {t('NoSettlementsThisPeriod')}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
