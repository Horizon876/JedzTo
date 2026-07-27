import 'dotenv/config'

export const PORT = Number(process.env.PORT || 8001)
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jedzto'
export const JWT_SECRET = process.env.JWT_SECRET || 'jedzto-local-dev-secret'
export const SEED_ON_START = process.env.SEED_ON_START !== '0'
export const LOCAL_API_OPEN = process.env.LOCAL_API_OPEN !== '0'
export const PUBLIC_TOKEN_TTL_HOURS = 12
export const USER_TOKEN_TTL_DAYS = 30
