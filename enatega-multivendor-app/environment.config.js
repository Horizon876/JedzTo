// Local JedzTo API (jedzto-local-api). When the phone is on the same Wi-Fi as
// this Mac, EXPO_PUBLIC_JEDZTO_API_HOST can be the LAN IP. When connecting
// through the Expo tunnel (phone on a different network), point this at the
// ngrok tunnel exposing port 8001 instead — set via EXPO_PUBLIC_JEDZTO_API_URL.
const LOCAL_API_TUNNEL_URL = process.env.EXPO_PUBLIC_JEDZTO_API_URL || 'https://garbage-sizable-suffice.ngrok-free.dev'
const LOCAL_API_HOST =
  process.env.EXPO_PUBLIC_JEDZTO_API_HOST || '10.18.254.25'
const LOCAL_API_HTTP = LOCAL_API_TUNNEL_URL || `http://${LOCAL_API_HOST}:8001`
const LOCAL_API_WS = LOCAL_API_TUNNEL_URL
  ? LOCAL_API_TUNNEL_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  : `ws://${LOCAL_API_HOST}:8001`

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
    GRAPHQL_URL: 'https://aws-server-v2.enatega.com/graphql',
    WS_GRAPHQL_URL: 'wss://aws-server-v2.enatega.com/graphql',
    SERVER_URL: 'https://aws-server-v2.enatega.com/',
    SERVER_REST_URL: 'https://aws-server-v2.enatega.com/',
    USE_JEDZTO_LOCAL_RESTAURANTS: false,
    CLARITY_ENABLED: true
  },
  production: {
    GRAPHQL_URL: 'https://aws-server-v2.enatega.com/graphql',
    WS_GRAPHQL_URL: 'wss://aws-server-v2.enatega.com/graphql',
    SERVER_URL: 'https://aws-server-v2.enatega.com/',
    SERVER_REST_URL: 'https://aws-server-v2.enatega.com/',
    USE_JEDZTO_LOCAL_RESTAURANTS: false,
    CLARITY_ENABLED: true
  }
}

const normalizeEnvironment = (env) => {
  if (env === 'production' || env === 'staging') return env
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
