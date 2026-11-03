import jwt from 'jsonwebtoken'
import { GraphQLError } from 'graphql'
import {
  JWT_SECRET,
  LOCAL_API_OPEN,
  PUBLIC_TOKEN_TTL_HOURS,
  USER_TOKEN_TTL_DAYS,
  REFRESH_TOKEN_TTL_DAYS,
  PANEL_TOKEN_TTL_HOURS
} from '../config.js'

export const signPublicToken = () => {
  const expiresIn = PUBLIC_TOKEN_TTL_HOURS * 60 * 60
  const token = jwt.sign({ typ: 'public', role: 'bop' }, JWT_SECRET, { expiresIn })
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString()
  return { token, expiry }
}

/**
 * @param {object} user
 * @param {{ panel?: boolean }} [opts] panel=true → short-lived token for admin/owner web UI
 */
export const signUserToken = (user, opts = {}) => {
  const panel = Boolean(opts.panel)
  const expiresIn = panel
    ? Math.max(1, PANEL_TOKEN_TTL_HOURS) * 60 * 60
    : USER_TOKEN_TTL_DAYS * 24 * 60 * 60
  const refreshExpiresIn = panel
    ? Math.max(1, PANEL_TOKEN_TTL_HOURS) * 60 * 60
    : REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  const token = jwt.sign(
    {
      typ: 'user',
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId ? String(user.restaurantId) : null,
      panel: panel || undefined
    },
    JWT_SECRET,
    { expiresIn }
  )
  // The refresh token is a *separate* token carrying only the subject id, so a
  // leaked access token cannot be replayed to mint fresh sessions and the
  // refresh token itself grants no API access.
  const refreshToken = jwt.sign(
    { typ: 'refresh', userId: String(user._id), panel: panel || undefined },
    JWT_SECRET,
    { expiresIn: refreshExpiresIn }
  )
  return {
    token,
    tokenExpiration: expiresIn,
    refreshToken,
    refreshTokenExpiration: refreshExpiresIn
  }
}

export const verifyToken = (raw) => {
  if (!raw) return null
  const value = raw.startsWith('Bearer ') ? raw.slice(7) : raw
  try {
    return jwt.verify(value, JWT_SECRET)
  } catch {
    return null
  }
}

export const requireUser = (context, roles = null) => {
  if (!context.user?.userId) {
    throw new GraphQLError('UNAUTHENTICATED', {
      extensions: { code: 'UNAUTHENTICATED' }
    })
  }
  if (roles && !roles.includes(context.user.role)) {
    throw new GraphQLError('FORBIDDEN', {
      extensions: { code: 'FORBIDDEN' }
    })
  }
  return context.user
}

// Enforces that a RESTAURANT_OWNER can only touch their own restaurant's
// data. SUPER_ADMIN bypasses the scope check (full oversight access).
export const requireRestaurantOwner = (context, restaurantId) => {
  const user = requireUser(context, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
  if (user.role === 'SUPER_ADMIN') return user
  if (!restaurantId || String(user.restaurantId) !== String(restaurantId)) {
    throw new GraphQLError('FORBIDDEN: not your restaurant', {
      extensions: { code: 'FORBIDDEN' }
    })
  }
  return user
}

export const assertPublicAccess = (context) => {
  if (LOCAL_API_OPEN) return true
  if (context.isPublicBootstrap) return true
  if (context.publicAuth) return true
  throw new GraphQLError('Unauthorized: jwt expired', {
    extensions: { code: 'FORBIDDEN' }
  })
}
