/** ISO week periodKey: YYYY-Www (UTC, Monday–Sunday). */

function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1)
  const monday = new Date(mondayWeek1)
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

export function currentPeriodKey(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const dayNr = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNr + 3)
  const isoYear = d.getUTCFullYear()
  const week1 = mondayOfIsoWeek(isoYear, 1)
  const week =
    1 + Math.round((d.getTime() - week1.getTime() - 3 * 864e5) / (7 * 864e5))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function periodBounds(periodKey: string): {
  periodStart: Date
  periodEnd: Date
} {
  const m = String(periodKey || '').match(/^(\d{4})-W(\d{1,2})$/i)
  if (m) {
    const periodStart = mondayOfIsoWeek(Number(m[1]), Number(m[2]))
    const periodEnd = new Date(periodStart)
    periodEnd.setUTCDate(periodStart.getUTCDate() + 6)
    periodEnd.setUTCHours(23, 59, 59, 999)
    return { periodStart, periodEnd }
  }
  const [y, mo] = String(periodKey).split('-').map(Number)
  const periodStart = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0))
  const periodEnd = new Date(Date.UTC(y, mo, 0, 23, 59, 59, 999))
  return { periodStart, periodEnd }
}

function formatDay(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
    d.getUTCMonth() + 1
  ).padStart(2, '0')}.${d.getUTCFullYear()}`
}

export function formatPeriodLabel(periodKey: string): string {
  try {
    const { periodStart, periodEnd } = periodBounds(periodKey)
    return `${periodKey} (${formatDay(periodStart)}–${formatDay(periodEnd)})`
  } catch {
    return periodKey
  }
}

/** Newest-first week options for dropdowns. */
export function periodOptions(count = 16): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = []
  const d = new Date()
  const cursor = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
  for (let i = 0; i < count; i++) {
    const key = currentPeriodKey(cursor)
    if (!opts.some((o) => o.value === key)) {
      opts.push({ label: formatPeriodLabel(key), value: key })
    }
    cursor.setUTCDate(cursor.getUTCDate() - 7)
  }
  return opts
}

export function finalSettlementBalance(row: {
  onlineGross?: number
  commissionDue?: number
  cashFeeDue?: number
}): number {
  return (
    Number(row.onlineGross || 0) -
    Number(row.commissionDue || 0) -
    Number(row.cashFeeDue || 0)
  )
}

export function moneyPln(n: number): string {
  return `${Number(n || 0).toFixed(2)} zł`
}
