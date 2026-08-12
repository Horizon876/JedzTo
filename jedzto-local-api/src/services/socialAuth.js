/**
 * services/socialAuth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side verification of social sign-in.
 *
 * Previously `login(type: "google", email: "...")` created or returned a
 * session for any address with no proof at all — a full authentication bypass.
 * The provider's ID token must be validated by us, never by the client.
 */

import { GraphQLError } from 'graphql'
import { GOOGLE_CLIENT_IDS, NODE_ENV } from '../config.js'

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

const unauthenticated = (message) =>
  new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } })

/**
 * Verifies a Google ID token and returns the e-mail Google vouches for.
 * When GOOGLE_CLIENT_IDS is configured the audience is checked too, which
 * prevents replaying a token minted for a different application.
 */
const verifyGoogleIdToken = async (idToken) => {
  const response = await fetch(
    `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`
  )
  if (!response.ok) throw unauthenticated('Invalid Google token')

  const payload = await response.json()
  if (!payload.email || payload.email_verified === 'false') {
    throw unauthenticated('Google account has no verified e-mail')
  }
  if (GOOGLE_CLIENT_IDS.length && !GOOGLE_CLIENT_IDS.includes(payload.aud)) {
    throw unauthenticated('Google token was issued for another application')
  }
  return { email: String(payload.email).toLowerCase(), name: payload.name || null }
}

/**
 * Resolves a verified identity for a social login attempt.
 * Returns null when the provider cannot be verified in development, letting
 * the caller fall back to the legacy (customer-only) path.
 */
export const verifySocialIdentity = async ({ type, idToken }) => {
  const provider = String(type || '').toLowerCase()

  if (provider === 'google' && idToken) {
    return verifyGoogleIdToken(idToken)
  }

  if (NODE_ENV === 'production') {
    throw unauthenticated(
      `Social login "${provider}" requires a verifiable idToken`
    )
  }

  return null
}
