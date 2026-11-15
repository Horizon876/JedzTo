// Local JedzTo API (jedzto-local-api). When the phone is on the same Wi-Fi as
// this PC, EXPO_PUBLIC_JEDZTO_API_HOST can be the LAN IP (default below).
// When connecting through an Expo tunnel (phone on a different network),
// set EXPO_PUBLIC_JEDZTO_API_URL to the ngrok tunnel exposing port 8001 instead.
const LOCAL_API_TUNNEL_URL = process.env.EXPO_PUBLIC_JEDZTO_API_URL || ''
const LOCAL_API_HOST =
  process.env.EXPO_PUBLIC_JEDZTO_API_HOST || '192.168.55.107'
const LOCAL_API_HTTP = LOCAL_API_TUNNEL_URL || `http://${LOCAL_API_HOST}:8001`
const LOCAL_API_WS = LOCAL_API_TUNNEL_URL
  ? LOCAL_API_TUNNEL_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  : `ws://${LOCAL_API_HOST}:8001`

// Prefer explicit override (useful until custom-domain DNS points at Railway).
const PROD_API_HTTP = (
  process.env.EXPO_PUBLIC_JEDZTO_API_URL ||
  'https://jedzto-production.up.railway.app'
).replace(/\/$/, '')
const PROD_API_WS = PROD_API_HTTP.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')

const ENV_CONFIG = {
  development: {
    GRAPHQL_URL: `${LOCAL_API_HTTP}/graphql`,
    WS_GRAPHQL_URL: `${LOCAL_API_WS}/graphql`,
    SERVER_URL: `${LOCAL_API_HTTP}/`,
    SERVER_REST_URL: `${LOCAL_API_HTTP}/`,
    // false = restaurants come from local GraphQL API (jedzto-local-api)
    USE_JEDZTO_LOCAL_RESTAURANTS: false,
    CLARITY_ENABLED: false
  },
  staging: {
    GRAPHQL_URL: `${PROD_API_HTTP}/graphql`,
    WS_GRAPHQL_URL: `${PROD_API_WS}/graphql`,
    SERVER_URL: `${PROD_API_HTTP}/`,
    SERVER_REST_URL: `${PROD_API_HTTP}/`,
    // false = restaurants come from our own GraphQL API (jedzto-local-api),
    // not the hardcoded demo data in src/data/jedztoLocalRestaurants.js.
    USE_JEDZTO_LOCAL_RESTAURANTS: false,
    CLARITY_ENABLED: true
  },
  production: {
    GRAPHQL_URL: `${PROD_API_HTTP}/graphql`,
    WS_GRAPHQL_URL: `${PROD_API_WS}/graphql`,
    SERVER_URL: `${PROD_API_HTTP}/`,
    SERVER_REST_URL: `${PROD_API_HTTP}/`,
    USE_JEDZTO_LOCAL_RESTAURANTS: false,
    CLARITY_ENABLED: true
  }
}

const normalizeEnvironment = (env) => {
  // Prefer an explicit APP_ENV so `expo start` can hit production API
  // without an EAS release channel (Updates.channel is empty in local runs).
  const resolved = env || process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV
  if (resolved === 'production' || resolved === 'staging') return resolved
  return 'development'
}

const getEnvironmentConfig = (env) => {
  return ENV_CONFIG[normalizeEnvironment(env)]
}

module.exports = {
  ENV_CONFIG,
  getEnvironmentConfig,
  normalizeEnvironment
}
