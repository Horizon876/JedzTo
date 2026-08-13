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

/** Common storage variants for the same Polish mobile number. */
export function phoneLookupVariants(phone) {
  const raw = String(phone || '').trim()
  const normalized = normalizePhone(raw)
  const digits = normalized.replace(/\D/g, '')
  const variants = new Set()
  if (raw) variants.add(raw)
  if (normalized) variants.add(normalized)
  if (digits) {
    variants.add(digits)
    variants.add(`+${digits}`)
  }
  if (digits.length === 11 && digits.startsWith('48')) {
    const local = digits.slice(2)
    variants.add(local)
    variants.add(`+48${local}`)
    variants.add(`48${local}`)
  } else if (digits.length === 9) {
    variants.add(digits)
    variants.add(`+48${digits}`)
    variants.add(`48${digits}`)
  }
  return [...variants].filter(Boolean)
}

export function normalizePersonName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Imię + nazwisko (at least two words). */
export function hasFullPersonName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.length >= 2
}
