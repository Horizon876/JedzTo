/**
 * Robust date parsing for API values (ISO strings, epoch ms/s, Date).
 * Avoid `new Date(Number(isoString))` — that always yields Invalid Date.
 */

export type DateInput = string | number | Date | null | undefined

export function parseDate(value: DateInput): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    // Unix seconds vs milliseconds
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const raw = String(value).trim()
  if (!raw || raw === 'null' || raw === 'undefined') return null

  // Pure numeric string → epoch
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return null
    const ms = raw.length <= 10 ? n * 1000 : n
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const DEFAULT_DATE: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}

const DEFAULT_DATETIME: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export function formatDate(
  value: DateInput,
  locale = 'pl-PL',
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE,
  fallback = '—'
): string {
  const d = parseDate(value)
  if (!d) return fallback
  return d.toLocaleDateString(locale, options)
}

export function formatDateTime(
  value: DateInput,
  locale = 'pl-PL',
  options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME,
  fallback = '—'
): string {
  const d = parseDate(value)
  if (!d) return fallback
  return d.toLocaleString(locale, options)
}
