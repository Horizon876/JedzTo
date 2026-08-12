/**
 * utils/sanitize.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Input/output sanitisation helpers shared by resolvers and HTTP routes.
 */

const REGEX_META = /[.*+?^${}()|[\]\\]/g

/**
 * Escapes a user-supplied string so it can be used inside a Mongo $regex
 * without acting as a pattern. Unescaped input allows both filter bypass
 * (".*") and catastrophic backtracking (ReDoS, e.g. "(a+)+$").
 */
export const escapeRegex = (value) => String(value ?? '').replace(REGEX_META, '\\$&')

/** Builds a safe case-insensitive "contains" filter, capped in length. */
export const containsFilter = (value, maxLength = 120) => ({
  $regex: escapeRegex(String(value ?? '').slice(0, maxLength)),
  $options: 'i'
})

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/** Escapes text that is interpolated into an HTML response (anti-XSS). */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char])

/** Clamps a pagination size so a client cannot ask for the whole collection. */
export const clampPageSize = (value, fallback = 10, max = 100) => {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

/** Clamps a page/offset value to a non-negative integer. */
export const clampNonNegative = (value, fallback = 0) => {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Parses a monetary amount, rejecting negatives, NaN and Infinity. */
export const toMoney = (value, fallback = 0) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.round(n * 100) / 100
}
