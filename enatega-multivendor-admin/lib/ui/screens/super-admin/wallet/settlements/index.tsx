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

function periodOptions() {
  const now = new Date()
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    opts.push({ label: key, value: key })
  }
  return opts
}

function money(n: number) {
  return `${Number(n || 0).toFixed(2)} zł`
}

function finalBalance(row: {
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

  const [printData, setPrintData] = useState<Record<string, unknown> | null>(
    null
  )

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
        const balance = finalBalance(r)
        return {
          gross: acc.gross + Number(r.totalGross || 0),
          commission: acc.commission + Number(r.commissionDue || 0),
          // Same net logic as per-restaurant "Ostateczne rozliczenie"
          payout: acc.payout + (balance > 0 ? balance : 0),
          owed: acc.owed + (balance < 0 ? -balance : 0),
        }
      },
      { gross: 0, payout: 0, owed: 0, commission: 0 }
    )
  }, [rows])

  return (
    <>
      {printData ? (
        <div className="absolute left-0 top-0 z-[99999] hidden min-h-screen w-full bg-white p-10 font-sans text-black print:block">
          <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 p-8">
            <div className="mb-8 flex items-center justify-between border-b pb-4">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-800">
                  Raport Rozliczeniowy
                </h1>
                <p className="mt-1 text-gray-500">
                  Okres:{' '}
                  <span className="font-semibold">
                    {String(printData.periodKey || '')}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800">
                  {String(printData.restaurantName || '')}
                </h2>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm uppercase text-gray-500">Obrót Online</p>
                <p className="text-xl font-semibold">
                  {money(Number(printData.onlineGross || 0))}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm uppercase text-gray-500">
                  Obrót Gotówkowy
                </p>
                <p className="text-xl font-semibold">
                  {money(Number(printData.cashGross || 0))}
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm uppercase text-gray-500">Całkowity Obrót</p>
                <p className="text-2xl font-bold">
                  {money(Number(printData.totalGross || 0))}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="mb-4 border-b pb-2 text-lg font-bold">
                Rozliczenie prowizji
              </h3>
              <table className="w-full text-left">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">Stawka prowizji</td>
                    <td className="py-3 text-right font-semibold">
                      {String(printData.commissionRate || 0)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">
                      Prowizja od płatności online
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {money(Number(printData.commissionOnOnline || 0))}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 text-gray-600">
                      Prowizja od gotówki
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {money(Number(printData.commissionOnCash || 0))}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-2 py-3 font-bold text-gray-800">
                      Suma należnej prowizji
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-gray-800">
                      {money(Number(printData.commissionDue || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(() => {
              const onlineGross = Number(printData.onlineGross || 0)
              const commissionOnOnline = Number(
                printData.commissionOnOnline || 0
              )
              const commissionOnCash = Number(printData.commissionOnCash || 0)
              const commissionDue = Number(printData.commissionDue || 0)
              const cashFeeDue = Number(printData.cashFeeDue || 0)
              const amount = finalBalance({
                onlineGross,
                commissionDue,
                cashFeeDue,
              })
              const afterOnlineCommission = onlineGross - commissionOnOnline

              return (
                <>
                  <div className="mb-8">
                    <h3 className="mb-2 border-b pb-2 text-lg font-bold">
                      Kompensata (rozliczenie końcowe)
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">
                      Płatności online trafiają na konto platformy, a gotówkę
                      zbiera lokal. Prowizja liczona jest od produktów, dostawy,
                      ewentualnej opłaty za transport oraz opłaty za płatność
                      gotówką. Sama opłata gotówkowa należy w całości do
                      platformy — nie wchodzi do obrotu lokalu. Zamiast
                      osobnych przelewów w obie strony, należności lokalu są{' '}
                      <strong>potrącane z wypłaty online</strong> (kompensata).
                    </p>
                    <table className="w-full text-left">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 text-gray-600">
                            Środki z płatności online (u platformy)
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {money(onlineGross)}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 text-gray-600">
                            − Prowizja od online
                          </td>
                          <td className="py-3 text-right font-semibold">
                            −{money(commissionOnOnline)}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 text-gray-600">
                            = Po potrąceniu prowizji online
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {money(afterOnlineCommission)}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 text-gray-600">
                            − Prowizja od gotówki (kompensata)
                          </td>
                          <td className="py-3 text-right font-semibold">
                            −{money(commissionOnCash)}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 text-gray-600">
                            − Opłata za płatność gotówką (dla platformy)
                          </td>
                          <td className="py-3 text-right font-semibold">
                            −{money(cashFeeDue)}
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-2 py-3 font-bold text-gray-800">
                            {amount > 0
                              ? 'Do wypłaty dla restauracji'
                              : amount < 0
                                ? 'Do zwrotu od restauracji'
                                : 'Saldo po kompensacie'}
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-gray-800">
                            {money(Math.abs(amount))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {commissionOnCash > 0 && amount > 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        Lokal zatrzymał gotówkę u siebie. Należną prowizję od
                        gotówki ({money(commissionOnCash)})
                        {cashFeeDue > 0
                          ? ` oraz opłatę transakcyjną (${money(cashFeeDue)})`
                          : ''}{' '}
                        odjęto od wypłaty online.
                      </p>
                    ) : null}
                    {cashFeeDue > 0 && commissionOnCash <= 0 && amount > 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        Opłata za płatność gotówką ({money(cashFeeDue)}) należy
                        do platformy i została potrącona z wypłaty.
                      </p>
                    ) : null}
                    {amount < 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        Należności przekraczają środki online u platformy.
                        Różnicę ({money(-amount)}) lokal dopłaca platformie
                        (prowizja
                        {cashFeeDue > 0
                          ? ` + opłata gotówkowa ${money(cashFeeDue)}`
                          : ''}
                        ).
                      </p>
                    ) : null}
                    {amount === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        Po kompensacie nie ma kwoty do wypłaty ani do dopłaty.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    {amount > 0 ? (
                      <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
                        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-green-700">
                          Do wypłaty dla restauracji
                        </p>
                        <p className="text-4xl font-bold text-green-600">
                          {money(amount)}
                        </p>
                        <p className="mt-2 text-sm text-green-800">
                          Platforma przelewa tę kwotę na konto lokalu
                        </p>
                      </div>
                    ) : amount < 0 ? (
                      <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6 text-center">
                        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-red-700">
                          Do zwrotu od restauracji
                        </p>
                        <p className="text-4xl font-bold text-red-600">
                          {money(-amount)}
                        </p>
                        <p className="mt-2 text-sm text-red-800">
                          Lokal przelewa tę kwotę na konto platformy
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-6 text-center">
                        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                          Rozliczono na zero
                        </p>
                        <p className="text-4xl font-bold text-gray-600">
                          {money(0)}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}

            <div className="mt-12 text-center text-sm text-gray-400">
              <p>Wygenerowano automatycznie z systemu JedzTo</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="screen-container print:hidden">
        <PageHeader title={t('Finance')} />
        <p className="mb-4 mt-0 text-sm text-[var(--panel-muted)]">
          Prowizje i bilanse wypłat dla restauracji
        </p>

        <PageTabs
          tabs={[
            { id: 'current', label: t('CurrentMonth') },
            { id: 'history', label: t('PreviousMonths') },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'history' ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--panel-muted)]">
              {t('SelectMonth')}
            </span>
            <Dropdown
              value={historyPeriodKey}
              options={options.slice(1)}
              onChange={(e) => setHistoryPeriodKey(e.value)}
              className="w-40"
            />
          </div>
        ) : (
          <div className="mb-4 text-sm text-[var(--panel-muted)]">
            {t('Period')}: <strong>{currentPeriodKey}</strong>
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
                {money(card.value)}
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
              }) => {
                const balance = finalBalance(r)
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
                          {money(r.onlineGross)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#F5F7FA] p-3">
                        <div className="text-xs text-[var(--panel-muted)]">
                          {t('CashGross')}
                        </div>
                        <div className="mt-1 font-semibold">
                          {money(r.cashGross)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#F5F7FA] p-3">
                        <div className="text-xs text-[var(--panel-muted)]">
                          {t('CommissionDue')}
                        </div>
                        <div className="mt-1 font-semibold">
                          {money(r.commissionDue)}
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
                            ? `${t('PlatformPays')}: ${money(balance)}`
                            : balance < 0
                              ? `${t('RestaurantPays')}: ${money(-balance)}`
                              : `${t('SettledZero')}: ${money(0)}`}
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
