import jwt from 'jsonwebtoken'
import { GraphQLError } from 'graphql'
import {
  JWT_SECRET,
  LOCAL_API_OPEN,
  PUBLIC_TOKEN_TTL_HOURS,
  USER_TOKEN_TTL_DAYS
} from '../config.js'

export const signPublicToken = () => {
  const expiresIn = PUBLIC_TOKEN_TTL_HOURS * 60 * 60
  const token = jwt.sign({ typ: 'public', role: 'bop' }, JWT_SECRET, { expiresIn })
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString()
  return { token, expiry }
}

export const signUserToken = (user) => {
  const expiresIn = USER_TOKEN_TTL_DAYS * 24 * 60 * 60
  const token = jwt.sign(
    {
      typ: 'user',
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId ? String(user.restaurantId) : null
    },
    JWT_SECRET,
    { expiresIn }
  )
  return { token, tokenExpiration: expiresIn, refreshToken: token, refreshTokenExpiration: expiresIn }
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
