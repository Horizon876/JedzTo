'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useLocale, useTranslations } from 'next-intl'
import { Calendar } from 'primereact/calendar'
import { InputText } from 'primereact/inputtext'
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context'
import { GET_RESTAURANT_BY_ID } from '@/lib/api/graphql'
import { SET_RESTAURANT_HOLIDAYS } from '@/lib/api/graphql/mutations/settlements'
import useToast from '@/lib/hooks/useToast'
import CustomTimeInput from '@/lib/ui/useable-components/time-input'
import { PageHeader } from '@/lib/ui/screen-components/protected/layout/shared'

type HolidayRow = {
  key: string
  date: string
  closed: boolean
  open: string
  close: string
  label: string
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function HolidaysScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const { showToast } = useToast()
  const {
    restaurantLayoutContextData: { restaurantId },
  } = useContext(RestaurantLayoutContext)

  const { data, refetch } = useQuery(GET_RESTAURANT_BY_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  })

  const [rows, setRows] = useState<HolidayRow[]>([])
  const [date, setDate] = useState<Date | null>(null)
  const [label, setLabel] = useState('')
  const [closed, setClosed] = useState(true)
  const [open, setOpen] = useState('10:00')
  const [close, setClose] = useState('18:00')

  useEffect(() => {
    const list = data?.restaurant?.holidayExceptions || []
    setRows(
      list.map(
        (
          h: {
            _id?: string
            date: string
            closed?: boolean
            open?: string
            close?: string
            label?: string
          },
          i: number
        ) => ({
          key: h._id || `${h.date}-${i}`,
          date: h.date,
          closed: h.closed !== false,
          open: h.open || '10:00',
          close: h.close || '18:00',
          label: h.label || '',
        })
      )
    )
  }, [data])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    [rows]
  )

  const formatDate = (ymd: string) => {
    try {
      return new Intl.DateTimeFormat(locale || 'pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(parseYmd(ymd))
    } catch {
      return ymd
    }
  }

  const [save, { loading }] = useMutation(SET_RESTAURANT_HOLIDAYS, {
    onCompleted: () => {
      refetch()
      showToast({
        type: 'success',
        title: t('Success'),
        message: t('Holidays updated successfully'),
        duration: 3000,
      })
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: t('Error'),
        message: error.graphQLErrors?.[0]?.message || t('ActionFailedTryAgain'),
        duration: 3000,
      })
    },
  })

  const persist = (next: HolidayRow[]) => {
    setRows(next)
    void save({
      variables: {
        restaurantId,
        holidays: next.map((r) => ({
          date: r.date,
          closed: r.closed,
          open: r.closed ? null : r.open,
          close: r.closed ? null : r.close,
          label: r.label,
        })),
      },
    })
  }

  const onAdd = () => {
    if (!date) {
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('HolidayDateRequired'),
        duration: 2500,
      })
      return
    }
    if (!closed && (!open || !close)) return
    const ymd = toYmd(date)
    if (rows.some((r) => r.date === ymd)) {
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('HolidayAlreadyExists'),
        duration: 3000,
      })
      return
    }
    persist([
      ...rows,
      {
        key: ymd,
        date: ymd,
        closed,
        open,
        close,
        label: label.trim() || t('Holiday'),
      },
    ])
    setDate(null)
    setLabel('')
    setClosed(true)
    setOpen('10:00')
    setClose('18:00')
  }

  return (
    <div className="screen-container">
      <PageHeader title={t('Closures')} />
      <p className="mb-5 mt-0 max-w-2xl text-sm leading-relaxed text-[var(--panel-muted)]">
        {t('HolidaysDescription')}
      </p>

      <section className="mb-8 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white">
        <div className="border-b border-[var(--panel-border)] bg-[#F8FAFC] px-5 py-3">
          <h2 className="m-0 text-sm font-bold uppercase tracking-wide text-[var(--panel-muted)]">
            {t('AddHoliday')}
          </h2>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--panel-text)]">
              {t('HolidayDate')}
            </label>
            <Calendar
              value={date}
              onChange={(e) => setDate(e.value as Date)}
              dateFormat="dd.mm.yy"
              inline
              className="holiday-calendar w-full"
            />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--panel-text)]">
                {t('HolidayLabel')}
              </label>
              <InputText
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('HolidayLabelPlaceholder')}
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-[var(--panel-text)]">
                {t('HolidayMode')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClosed(true)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    closed
                      ? 'border-[var(--primary-color)] bg-[#E8F0FE] text-[var(--primary-color)]'
                      : 'border-[var(--panel-border)] bg-white text-[var(--panel-text)] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-sm font-bold">{t('ClosedAllDay')}</div>
                  <div className="mt-0.5 text-xs opacity-80">
                    {t('HolidayClosedHint')}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setClosed(false)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    !closed
                      ? 'border-[var(--primary-color)] bg-[#E8F0FE] text-[var(--primary-color)]'
                      : 'border-[var(--panel-border)] bg-white text-[var(--panel-text)] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-sm font-bold">
                    {t('HolidayCustomHours')}
                  </div>
                  <div className="mt-0.5 text-xs opacity-80">
                    {t('HolidayCustomHoursHint')}
                  </div>
                </button>
              </div>
            </div>

            {!closed ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--panel-text)]">
                    {t('Start Time')}
                  </label>
                  <CustomTimeInput
                    name="holiday-open"
                    showLabel={false}
                    value={open}
                    onChange={(value: string) => setOpen(value)}
                    placeholder={t('Start Time')}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--panel-text)]">
                    {t('End Time')}
                  </label>
                  <CustomTimeInput
                    name="holiday-close"
                    showLabel={false}
                    value={close}
                    onChange={(value: string) => setClose(value)}
                    placeholder={t('End Time')}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-auto flex justify-end pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={onAdd}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-color)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {loading ? t('Loading') : t('AddHoliday')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 mt-0 text-sm font-bold uppercase tracking-wide text-[var(--panel-muted)]">
          {t('HolidayList')}
        </h2>

        {!sortedRows.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-white px-5 py-10 text-center text-sm text-[var(--panel-muted)]">
            {t('HolidaysEmpty')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white">
            {sortedRows.map((r) => (
              <div
                key={r.key}
                className="flex items-center gap-4 border-b border-[var(--panel-border)] px-4 py-3 last:border-b-0"
              >
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    r.closed
                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                      : 'bg-[#E8F0FE] text-[var(--primary-color)]'
                  }`}
                >
                  {r.date.slice(8, 10)}.{r.date.slice(5, 7)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[var(--panel-text)]">
                    {r.label || t('Holiday')}
                  </div>
                  <div className="truncate text-sm text-[var(--panel-muted)]">
                    {formatDate(r.date)}
                    {' · '}
                    {r.closed
                      ? t('ClosedAllDay')
                      : `${r.open}–${r.close}`}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                  onClick={() =>
                    persist(rows.filter((x) => x.key !== r.key))
                  }
                >
                  {t('Delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
