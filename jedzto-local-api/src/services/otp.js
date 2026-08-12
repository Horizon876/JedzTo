/**
 * services/otp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-use, time-limited one-time codes for e-mail/phone verification and
 * password reset.
 *
 * Replaces the previous hardcoded '123456' constant, which allowed anyone to
 * verify any contact detail and to reset any account's password.
 *
 * Storage is in-process on purpose: this API runs as a single instance. Swap
 * `store` for Redis before scaling horizontally.
 */

import crypto from 'crypto'
import { ALLOW_TEST_OTP } from '../config.js'

const TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const RESEND_INTERVAL_MS = 30 * 1000
const TEST_OTP = '123456'

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number, issuedAt: number }>} */
const store = new Map()

const keyFor = (purpose, identifier) =>
  `${purpose}:${String(identifier || '').trim().toLowerCase()}`

const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex')

/** Drops expired entries so the map cannot grow without bound. */
const evictExpired = (now = Date.now()) => {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key)
  }
}

/**
 * Issues a 6-digit code for (purpose, identifier).
 * Returns null when the previous code is still fresh (anti-spam / anti-cost).
 */
export const issueOtp = (purpose, identifier) => {
  const now = Date.now()
  evictExpired(now)

  const key = keyFor(purpose, identifier)
  const existing = store.get(key)
  if (existing && now - existing.issuedAt < RESEND_INTERVAL_MS) return null

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  store.set(key, { hash: hash(code), expiresAt: now + TTL_MS, attempts: 0, issuedAt: now })
  return code
}

/**
 * Verifies and consumes a code. Constant-time comparison, bounded attempts,
 * and the entry is always removed on success so a code works exactly once.
 */
export const consumeOtp = (purpose, identifier, code) => {
  const candidate = String(code || '').trim()
  if (!/^\d{6}$/.test(candidate)) return false

  // Development-only escape hatch so local test flows keep working.
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

export const OTP_PURPOSE = {
  EMAIL: 'email',
  PHONE: 'phone',
  PASSWORD_RESET: 'reset'
}
