import { parseDate, type DateInput } from './date'

export const timeAgo = (timestamp: DateInput): string => {
  const date = parseDate(timestamp)
  if (!date) return '—'

  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${Math.max(0, seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz.`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} dni`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mies.`
  const years = Math.floor(months / 12)

  return `${years} lat`
}
