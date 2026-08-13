/**
 * Normalize phone numbers so "+48 530 315 860", "530315860" and "0048530315860"
 * map to the same key for coupon one-per-phone enforcement.
 */
export function normalizePhone(phone) {
  let value = String(phone || '').trim()
  if (!value) return ''

  value = value.replace(/[^\d+]/g, '')
  if (value.startsWith('00')) value = `+${value.slice(2)}`

  const digits = value.replace(/\D/g, '')
  if (value.startsWith('+')) {
    return `+${digits}`
  }
  if (digits.length === 9) {
    return `+48${digits}`
  }
  if (digits.length === 11 && digits.startsWith('48')) {
    return `+${digits}`
  }
  return digits ? `+${digits}` : ''
}
