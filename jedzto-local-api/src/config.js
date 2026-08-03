import 'dotenv/config'

export const PORT = Number(process.env.PORT || 8001)
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jedzto'

const DEFAULT_JWT_SECRET = 'jedzto-local-dev-secret'
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

// Fail fast in production when running with the default dev secret — a
// leaked or trivially guessable secret lets anyone forge valid tokens.
if (
  process.env.NODE_ENV === 'production' &&
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

export const SEED_ON_START = process.env.SEED_ON_START !== '0'
export const LOCAL_API_OPEN = process.env.LOCAL_API_OPEN !== '0'
export const PUBLIC_TOKEN_TTL_HOURS = 12
export const USER_TOKEN_TTL_DAYS = 30
export const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || ''
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
export const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '')

// CORS: comma-separated list of allowed origins.
// Example: https://admin.jedzto.pl,https://app.jedzto.pl
// Leave empty in development — falls back to permissive localhost-only mode.
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
