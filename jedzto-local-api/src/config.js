import 'dotenv/config'
import path from 'path'

export const PORT = Number(process.env.PORT || 8001)
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jedzto'

/** Allow on-disk mongodb-memory-server when real Mongo is down (dev only). */
export const ALLOW_MEMORY_MONGO =
  process.env.ALLOW_MEMORY_MONGO != null
    ? process.env.ALLOW_MEMORY_MONGO !== '0'
    : NODE_ENV !== 'production'

/** Persistent data directory for local Mongo fallback (survives API restart). */
export const MONGO_MEMORY_DB_PATH =
  process.env.MONGO_MEMORY_DB_PATH ||
  path.resolve(process.cwd(), '.data', 'mongodb')

const DEFAULT_JWT_SECRET = 'jedzto-local-dev-secret'
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

// Fail fast in production when running with the default dev secret — a
// leaked or trivially guessable secret lets anyone forge valid tokens.
if (
  NODE_ENV === 'production' &&
  JWT_SECRET === DEFAULT_JWT_SECRET
) {
  console.error(
    '[FATAL] JWT_SECRET jest ustawiony na wartość domyślną w środowisku produkcyjnym. ' +
    'Wygeneruj silny klucz (openssl rand -hex 64) i ustaw zmienną środowiskową JWT_SECRET.'
  )
  process.exit(1)
}

if (!process.env.JWT_SECRET) {
  console.warn(
    '[security] JWT_SECRET nie ustawiony — używam wartości deweloperskiej. ' +
    'NIE używaj tego w środowisku produkcyjnym.'
  )
}

export const SEED_ON_START = NODE_ENV === 'production' ? false : process.env.SEED_ON_START !== '0'

// "Open mode" skips the public (bop) token check. It exists to make local
// development painless, so it must never be reachable in production — an
// unauthenticated attacker would otherwise get the whole public API surface.
export const LOCAL_API_OPEN =
  NODE_ENV === 'production' ? false : process.env.LOCAL_API_OPEN !== '0'

// When unset, phone OTP stays fixed at 123456 (UI + logs) until an SMS
// gateway is connected. Set SMS_GATEWAY_ENABLED=1 for random codes.
export const SMS_GATEWAY_ENABLED = process.env.SMS_GATEWAY_ENABLED === '1'

// Dev convenience: accept the well-known 123456 OTP for email/reset too.
// Always off in production (password-reset takeover risk).
export const ALLOW_TEST_OTP =
  NODE_ENV === 'production' ? false : process.env.ALLOW_TEST_OTP !== '0'

// Pricing rules the server owns. The mobile app shows the same numbers, but
// the authoritative amount for an order is always recomputed here.
export const DELIVERY_RATE = Number(process.env.DELIVERY_RATE || 9.99)
export const COD_CASH_FEE = Number(process.env.COD_CASH_FEE || 2)
export const MAX_ITEM_QUANTITY = 50

export const PUBLIC_TOKEN_TTL_HOURS = 12
export const USER_TOKEN_TTL_DAYS = 30
export const REFRESH_TOKEN_TTL_DAYS = 60
export const MIN_PASSWORD_LENGTH = 8
export const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || ''
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

if (NODE_ENV === 'production' && STRIPE_SECRET_KEY && !STRIPE_WEBHOOK_SECRET) {
  console.error(
    '[FATAL] STRIPE_WEBHOOK_SECRET nie jest ustawiony. Bez weryfikacji podpisu webhooka ' +
    'nie można bezpiecznie potwierdzać płatności (whsec_... z panelu Stripe).'
  )
  process.exit(1)
}
export const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '')

// Most free/cheap hosts (Render, Fly, Cloud Run, ...) wipe local disk on every
// deploy or restart. When these are set, uploaded images go to Cloudinary
// instead of ./uploads, so restaurant/menu photos survive redeploys.
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ''
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ''
export const CLOUDINARY_ENABLED = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
)

if (NODE_ENV === 'production' && !CLOUDINARY_ENABLED) {
  console.warn(
    '[storage] CLOUDINARY_* nie skonfigurowane — obrazki uploadowane przez panel/apkę ' +
    'będą trafiać na lokalny dysk kontenera i ZGINĄ przy każdym redeployu. ' +
    'Ustaw CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET (darmowe konto na cloudinary.com).'
  )
}

// Accepted `aud` values for Google ID tokens (comma separated OAuth client ids).
// Leave empty to skip the audience check (development only).
export const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

// CORS: comma-separated list of allowed origins.
// Example: https://admin.jedzto.pl,https://app.jedzto.pl
// Leave empty in development — falls back to permissive localhost-only mode.
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
