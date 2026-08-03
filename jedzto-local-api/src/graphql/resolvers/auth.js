/**
 * resolvers/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication resolvers: login, register, OTP, password reset, token refresh.
 * Also contains the ownerResponse / authResponse shape helpers.
 */

import { GraphQLError } from 'graphql'
import { User, Restaurant } from '../../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  signPublicToken,
  signUserToken,
  verifyToken
} from '../../auth/jwt.js'
import { id, mapUserType, profileShape } from './helpers.js'
import { buildRestaurantTree } from './restaurant.js'

const TEST_OTP = '123456'

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

const authResponse = (user, isNewUser = false) => {
  const { token, tokenExpiration } = signUserToken(user)
  return {
    userId: id(user),
    token,
    tokenExpiration,
    isActive: user.isActive,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isNewUser
  }
}

export async function ownerResponse(user) {
  const tokens = signUserToken(user)
  const isAdmin = user.role === 'SUPER_ADMIN'
  const restaurants = await Restaurant.find(isAdmin ? {} : { ownerId: user._id }).lean()
  const ownRestaurant = isAdmin
    ? null
    : restaurants.find((r) => String(r._id) === String(user.restaurantId)) || restaurants[0] || null

  return {
    userId: id(user),
    token: tokens.token,
    tokenExpiration: tokens.tokenExpiration,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiration: tokens.refreshTokenExpiration,
    email: user.email,
    userType: mapUserType(user.role),
    userTypeId: isAdmin ? id(user) : id(ownRestaurant) || id(user),
    shopType: ownRestaurant?.shopType || '',
    permissions: isAdmin ? ['*'] : ['restaurant'],
    image: null,
    name: user.name,
    isActive: user.isActive !== false,
    restaurantId: ownRestaurant ? id(ownRestaurant) : null,
    restaurants: restaurants.map((r) => ({
      _id: id(r),
      orderId: id(r),
      name: r.name,
      image: r.image,
      address: r.address
    }))
  }
}

// ---------------------------------------------------------------------------
// Auth Queries
// ---------------------------------------------------------------------------

export const authQueries = {
  profile: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw new GraphQLError('User not found')
    return profileShape(user)
  },
  ownerSession: async (_p, _a, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const user = await User.findById(auth.userId)
    if (!user) {
      throw new GraphQLError('UNAUTHENTICATED', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
    }
    return ownerResponse(user)
  },
  hasOwnerPermission: (_p, { permission }, ctx) => {
    assertPublicAccess(ctx)
    if (!ctx.user?.role) return false
    if (ctx.user.role === 'SUPER_ADMIN') return true
    if (ctx.user.role !== 'RESTAURANT_OWNER') return false
    return permission === 'restaurant'
  }
}

// ---------------------------------------------------------------------------
// Auth Mutations
// ---------------------------------------------------------------------------

export const authMutations = {
  metricsGeneral: (_p, _a, ctx) => {
    ctx.isPublicBootstrap = true
    const { token, expiry } = signPublicToken()
    return {
      excellence: 'local',
      topgun: 'jedzto',
      experience: token,
      skydiver: 'ok',
      rider: 'local',
      haha: 'jedzto',
      hehe: expiry,
      huhu: '1',
      yoyo: 'multi-vendor',
      turu: 'myslenice'
    }
  },

  ownerLogin: async (_p, { email, password }, ctx) => {
    assertPublicAccess(ctx)
    const user = await User.findOne({
      email: email.toLowerCase(),
      role: { $in: ['SUPER_ADMIN', 'RESTAURANT_OWNER'] }
    })
    if (!user || !(await user.comparePassword(password))) {
      throw new GraphQLError('Invalid email or password')
    }
    return ownerResponse(user)
  },

  login: async (_p, args, ctx) => {
    assertPublicAccess(ctx)
    const email = (args.email || '').toLowerCase()
    let user = await User.findOne({ email })

    if (args.type && args.type !== 'default' && args.type !== 'email') {
      if (!user) {
        user = await User.create({
          email: email || `${args.type}-${Date.now()}@jedzto.local`,
          name: args.name || 'Użytkownik JedzTo',
          password: `${Date.now()}`,
          role: 'CUSTOMER',
          emailIsVerified: true,
          phoneIsVerified: true
        })
        return authResponse(user, true)
      }
      return authResponse(user, false)
    }

    if (!user || !(await user.comparePassword(args.password || ''))) {
      throw new GraphQLError('Invalid email or password')
    }
    return authResponse(user, false)
  },

  createUser: async (_p, { userInput }, ctx) => {
    assertPublicAccess(ctx)
    if (userInput.email && (await User.findOne({ email: userInput.email.toLowerCase() }))) {
      throw new GraphQLError('Email already exists')
    }
    if (userInput.phone && (await User.findOne({ phone: userInput.phone }))) {
      throw new GraphQLError('Phone already exists')
    }
    const user = await User.create({
      name: userInput.name || 'Gość',
      email: (userInput.email || '').toLowerCase(),
      phone: userInput.phone || '',
      password: userInput.password || `${Date.now()}`,
      role: 'CUSTOMER',
      emailIsVerified: Boolean(userInput.emailIsVerified),
      phoneIsVerified: false,
      notificationToken: userInput.notificationToken || null
    })
    return authResponse(user, true)
  },

  guestCheckout: async (_p, { name, phone }, ctx) => {
    assertPublicAccess(ctx)
    const trimmedPhone = String(phone || '').trim()
    const trimmedName = String(name || '').trim() || 'Gość'
    if (!trimmedPhone) throw new GraphQLError('Phone is required')

    let user = await User.findOne({ phone: trimmedPhone })
    if (user) {
      user.name = trimmedName
      user.phoneIsVerified = true
      await user.save()
      return authResponse(user, false)
    }

    const syntheticEmail = `guest+${trimmedPhone.replace(/\D/g, '')}@jedzto.local`
    user = await User.create({
      name: trimmedName,
      email: syntheticEmail,
      phone: trimmedPhone,
      password: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'CUSTOMER',
      emailIsVerified: false,
      phoneIsVerified: true
    })
    return authResponse(user, true)
  },

  updateUser: async (_p, { updateUserInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    // Whitelist of fields a user may update on their own profile.
    // Prevents mass assignment (e.g. escalating role to SUPER_ADMIN).
    const ALLOWED_FIELDS = ['name', 'phone', 'notificationToken', 'isOrderNotification', 'isOfferNotification']
    const patch = {}
    for (const field of ALLOWED_FIELDS) {
      if (updateUserInput[field] !== undefined) {
        patch[field] = updateUserInput[field]
      }
    }
    const user = await User.findByIdAndUpdate(auth.userId, patch, { new: true })
    return profileShape(user)
  },

  emailExist: async (_p, { email }, ctx) => {
    assertPublicAccess(ctx)
    return Boolean(await User.findOne({ email: email.toLowerCase() }))
  },

  phoneExist: async (_p, { phone }, ctx) => {
    assertPublicAccess(ctx)
    return Boolean(await User.findOne({ phone }))
  },

  sendOtpToEmail: (_p, { email }, ctx) => {
    assertPublicAccess(ctx)
    // Dev stub: OTP is always 123456.
    console.log(`[OTP email ${email}] => ${TEST_OTP}`)
    return { result: true }
  },

  sendOtpToPhoneNumber: (_p, { phone }, ctx) => {
    assertPublicAccess(ctx)
    console.log(`[OTP phone ${phone}] => ${TEST_OTP}`)
    return { result: true }
  },

  verifyOtp: async (_p, { otp, email, phone }, ctx) => {
    const ok = otp === TEST_OTP
    if (ok && phone) {
      await User.findOneAndUpdate({ phone }, { phoneIsVerified: true })
    }
    if (ok && email) {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { emailIsVerified: true }
      )
    }
    return { result: ok }
  },

  forgotPassword: (_p, { email }) => {
    console.log(`[Forgot password OTP ${email}] => ${TEST_OTP}`)
    return { result: true }
  },

  resetPassword: async (_p, { password, email, otp }) => {
    if (otp !== TEST_OTP) throw new GraphQLError('Invalid OTP')
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) throw new GraphQLError('User not found')
    user.password = password
    await user.save()
    return { result: true }
  },

  refreshToken: async (_p, { refreshToken: presented }, ctx) => {
    assertPublicAccess(ctx)
    const claims = verifyToken(presented)
    if (!claims?.userId) {
      throw new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })
    }
    const user = await User.findById(claims.userId).lean()
    if (!user || user.isActive === false) {
      throw new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })
    }
    return ownerResponse(user)
  },

  // Address management
  createAddress: async (_p, { addressInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const { toCoord } = await import('./helpers.js')
    const user = await User.findById(auth.userId)
    user.addresses = (user.addresses || []).map((a) => { a.selected = false; return a })
    user.addresses.push({
      label: addressInput.label || 'Other',
      deliveryAddress: addressInput.deliveryAddress || '',
      details: addressInput.details || '',
      location: {
        coordinates: [toCoord(addressInput.longitude), toCoord(addressInput.latitude)]
      },
      selected: true
    })
    await user.save()
    return profileShape(user)
  },

  editAddress: async (_p, { addressInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const { toCoord } = await import('./helpers.js')
    const user = await User.findById(auth.userId)
    const addr = user.addresses.id(addressInput._id)
    if (addr) {
      if (addressInput.label != null) addr.label = addressInput.label
      if (addressInput.deliveryAddress != null) addr.deliveryAddress = addressInput.deliveryAddress
      if (addressInput.details != null) addr.details = addressInput.details
      if (addressInput.longitude != null || addressInput.latitude != null) {
        addr.location.coordinates = [
          addressInput.longitude != null
            ? toCoord(addressInput.longitude, addr.location.coordinates[0])
            : addr.location.coordinates[0],
          addressInput.latitude != null
            ? toCoord(addressInput.latitude, addr.location.coordinates[1])
            : addr.location.coordinates[1]
        ]
      }
    }
    await user.save()
    return profileShape(user)
  },

  deleteAddress: async (_p, { id: addressId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    user.addresses = user.addresses.filter((a) => String(a._id) !== String(addressId))
    await user.save()
    return profileShape(user)
  },

  deleteBulkAddresses: async (_p, { ids }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const set = new Set(ids.map(String))
    const user = await User.findById(auth.userId)
    user.addresses = user.addresses.filter((a) => !set.has(String(a._id)))
    await user.save()
    return profileShape(user)
  },

  selectAddress: async (_p, { id: addressId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    user.addresses.forEach((a) => { a.selected = String(a._id) === String(addressId) })
    await user.save()
    return profileShape(user)
  },

  changePassword: async (_p, { oldPassword, newPassword }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!(await user.comparePassword(oldPassword))) {
      throw new GraphQLError('Invalid password')
    }
    user.password = newPassword
    await user.save()
    return true
  },

  pushToken: async (_p, { token }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findByIdAndUpdate(
      auth.userId,
      { notificationToken: token },
      { new: true }
    )
    return profileShape(user)
  },

  updateNotificationStatus: async (_p, args, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findByIdAndUpdate(
      auth.userId,
      {
        isOfferNotification: args.offerNotification,
        isOrderNotification: args.orderNotification
      },
      { new: true }
    )
    return profileShape(user)
  },

  addFavourite: async (_p, { id: restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    const fav = new Set((user.favourite || []).map(String))
    if (fav.has(String(restaurantId))) fav.delete(String(restaurantId))
    else fav.add(String(restaurantId))
    user.favourite = [...fav]
    await user.save()
    return profileShape(user)
  },

  Deactivate: async (_p, { isActive, email }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN'])
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isActive },
      { new: true }
    )
    if (!user) throw new GraphQLError('User not found')
    return profileShape(user)
  }
}
