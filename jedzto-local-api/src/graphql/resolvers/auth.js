/**
 * resolvers/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication resolvers: login, register, OTP, password reset, token refresh.
 * Also contains the ownerResponse / authResponse shape helpers.
 */

import crypto from 'crypto'
import { GraphQLError } from 'graphql'
import { User, Restaurant } from '../../models/index.js'
import {
  assertPublicAccess,
  requireUser,
  signPublicToken,
  signUserToken,
  verifyToken
} from '../../auth/jwt.js'
import { MIN_PASSWORD_LENGTH, SMSAPI_ENABLED } from '../../config.js'
import { issueOtp, consumeOtp, OTP_PURPOSE } from '../../services/otp.js'
import { sendSms, buildOtpSmsMessage } from '../../services/smsapi.js'
import { verifySocialIdentity } from '../../services/socialAuth.js'
import {
  assertPhoneClaimAllowed,
  findVerifiedPhoneOwner,
  releaseUnverifiedPhoneClaims
} from '../../services/phoneOwnership.js'
import { hasFullPersonName, normalizePersonName } from '../../utils/phone.js'
import { id, mapUserType, profileShape, toLatitude, toLongitude } from './helpers.js'

const OWNER_ROLES = ['SUPER_ADMIN', 'RESTAURANT_OWNER']
const PANEL_LOGIN_ROLES = ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'RIDER']

const badInput = (message) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } })

const unauthenticated = () =>
  new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })

/** Same message for "no such user" and "wrong password" — no user enumeration. */
const invalidCredentials = () =>
  new GraphQLError('Invalid email or password', {
    extensions: { code: 'UNAUTHENTICATED' }
  })

const assertPasswordStrength = (password) => {
  if (String(password || '').length < MIN_PASSWORD_LENGTH) {
    throw badInput(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

/** Digits only, so "+48 123" and "48123" cannot create two accounts. */
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '')

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
  const isRider = user.role === 'RIDER'

  // Riders are assigned to a restaurant; owners are matched by ownerId.
  let restaurants = []
  if (isAdmin) {
    restaurants = await Restaurant.find({})
      .select('_id name image address shopType')
      .lean()
  } else if (isRider) {
    if (user.restaurantId) {
      const assigned = await Restaurant.findById(user.restaurantId)
        .select('_id name image address shopType')
        .lean()
      restaurants = assigned ? [assigned] : []
    }
  } else {
    restaurants = await Restaurant.find({ ownerId: user._id })
      .select('_id name image address shopType')
      .lean()
  }

  const ownRestaurant = isAdmin
    ? null
    : restaurants.find((r) => String(r._id) === String(user.restaurantId)) ||
      restaurants[0] ||
      null

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
    permissions: isAdmin ? ['*'] : isRider ? ['rider'] : ['restaurant'],
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
    const auth = requireUser(ctx, PANEL_LOGIN_ROLES)
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
    if (ctx.user.role === 'RIDER') return permission === 'rider'
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

    // If the caller supplied a bare login (no "@"), treat it as ownerLogin@jedzto.local
    // — that's the internal email format used when super-admin creates a restaurant.
    // Full email addresses (e.g. super-admin) continue to work unchanged.
    const normalized = normalizeEmail(email)
    const resolvedEmail = normalized.includes('@') ? normalized : `${normalized}@jedzto.local`

    const user = await User.findOne({
      email: resolvedEmail,
      role: { $in: PANEL_LOGIN_ROLES }
    })
    if (!user || !(await user.comparePassword(String(password || '')))) {
      throw invalidCredentials()
    }
    if (user.isActive === false) throw unauthenticated()
    return ownerResponse(user)
  },

  login: async (_p, args, ctx) => {
    assertPublicAccess(ctx)
    const requestedEmail = normalizeEmail(args.email)
    const isSocial = args.type && args.type !== 'default' && args.type !== 'email'

    if (isSocial) {
      // The provider identity is verified server-side; the client-supplied
      // e-mail is only a hint and is ignored when the provider disagrees.
      const verified = await verifySocialIdentity({
        type: args.type,
        idToken: args.idToken
      })
      const email = verified?.email || requestedEmail
      if (!email) throw badInput('Email is required for social login')

      let user = await User.findOne({ email })
      if (user) {
        // Privileged accounts must always go through password authentication,
        // otherwise a social flow becomes an admin-takeover path.
        if (OWNER_ROLES.includes(user.role)) throw invalidCredentials()
        if (user.isActive === false) throw unauthenticated()
        return authResponse(user, false)
      }

      user = await User.create({
        email,
        name: verified?.name || args.name || 'Użytkownik JedzTo',
        // Random, unusable password: social accounts authenticate via provider.
        password: crypto.randomUUID(),
        role: 'CUSTOMER',
        emailIsVerified: Boolean(verified),
        phoneIsVerified: false,
        notificationToken: args.notificationToken || null
      })
      return authResponse(user, true)
    }

    const user = await User.findOne({ email: requestedEmail })
    if (!user || !(await user.comparePassword(String(args.password || '')))) {
      throw invalidCredentials()
    }
    if (user.isActive === false) throw unauthenticated()
    return authResponse(user, false)
  },

  createUser: async (_p, { userInput }, ctx) => {
    assertPublicAccess(ctx)
    const email = normalizeEmail(userInput.email)
    const phone = String(userInput.phone || '').trim()
    if (!email) throw badInput('Email is required')
    assertPasswordStrength(userInput.password)

    if (await User.exists({ email })) throw badInput('Email already exists')
    if (phone && (await User.exists({ phone }))) throw badInput('Phone already exists')

    const user = await User.create({
      name: String(userInput.name || '').trim() || 'Gość',
      email,
      phone,
      password: userInput.password,
      role: 'CUSTOMER',
      // Verification flags are server-owned: a client cannot declare itself verified.
      emailIsVerified: false,
      phoneIsVerified: false,
      notificationToken: userInput.notificationToken || null
    })
    return authResponse(user, true)
  },

  guestCheckout: async (_p, { name, phone, otp }, ctx) => {
    assertPublicAccess(ctx)
    const trimmedPhone = String(phone || '').trim()
    const trimmedName = String(name || '').trim() || 'Gość'
    if (normalizePhone(trimmedPhone).length < 7) throw badInput('Valid phone is required')
    if (!hasFullPersonName(trimmedName)) {
      throw badInput('Podaj imię i nazwisko')
    }

    const verifiedOwner = await findVerifiedPhoneOwner(trimmedPhone)
    if (verifiedOwner) {
      const sameName =
        normalizePersonName(verifiedOwner.name) === normalizePersonName(trimmedName)
      if (!sameName) {
        throw badInput(
          'Ten numer telefonu jest już zweryfikowany i przypisany do innej osoby'
        )
      }
      // Same person returning — only that account may continue (OTP if registered).
      const user = await User.findById(verifiedOwner._id)
      if (!user) throw badInput('Konto nie zostało znalezione')
      const isGuestRecord = user.isGuest === true || /^guest\+\d+@jedzto\.local$/.test(user.email)
      if (!isGuestRecord && !consumeOtp(OTP_PURPOSE.PHONE, trimmedPhone, otp)) {
        throw new GraphQLError(
          'Ten numer należy do konta użytkownika — zaloguj się lub potwierdź numer kodem SMS.',
          { extensions: { code: 'OTP_REQUIRED' } }
        )
      }
      return authResponse(user, false)
    }

    const user = await User.findOne({ phone: trimmedPhone })
    if (user) {
      // A phone number is public knowledge, so it must not be enough to obtain
      // a session for a *registered* account. Guest records (created by this
      // very mutation) can be reused; anything else needs an OTP or a login.
      const isGuestRecord = user.isGuest === true || /^guest\+\d+@jedzto\.local$/.test(user.email)
      if (!isGuestRecord && !consumeOtp(OTP_PURPOSE.PHONE, trimmedPhone, otp)) {
        throw new GraphQLError(
          'Ten numer należy do konta użytkownika — zaloguj się lub potwierdź numer kodem SMS.',
          { extensions: { code: 'OTP_REQUIRED' } }
        )
      }
      user.name = trimmedName
      await user.save()
      return authResponse(user, false)
    }

    const created = await User.create({
      name: trimmedName,
      email: `guest+${normalizePhone(trimmedPhone)}@jedzto.local`,
      phone: trimmedPhone,
      password: crypto.randomUUID(),
      role: 'CUSTOMER',
      isGuest: true,
      emailIsVerified: false,
      // The number is unverified until an OTP confirms it.
      phoneIsVerified: false
    })
    return authResponse(created, true)
  },

  updateUser: async (_p, { updateUserInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    // Whitelist of fields a user may update on their own profile.
    // Prevents mass assignment (e.g. escalating role to SUPER_ADMIN).
    const ALLOWED_FIELDS = [
      'name',
      'phone',
      'notificationToken',
      'isOrderNotification',
      'isOfferNotification'
    ]
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()

    const patch = {}
    for (const field of ALLOWED_FIELDS) {
      if (updateUserInput[field] !== undefined) {
        patch[field] = updateUserInput[field]
      }
    }

    const nextPhone =
      patch.phone !== undefined ? String(patch.phone || '').trim() : null
    const currentPhone = String(user.phone || '').trim()
    const phoneChanged = nextPhone != null && nextPhone !== currentPhone
    const nextName =
      patch.name !== undefined ? String(patch.name || '').trim() : String(user.name || '').trim()
    const becomingVerified =
      updateUserInput.phoneIsVerified === true && !phoneChanged

    // Only invalidate verification when the number actually changes.
    // Previously every updateUser({ phone }) forced phoneIsVerified=false,
    // which undid verifyOtp and blocked placeOrder forever.
    if (phoneChanged) {
      patch.phoneIsVerified = false
      // Claiming a new number must not steal someone else's verified phone.
      if (nextPhone) {
        await assertPhoneClaimAllowed({
          phone: nextPhone,
          name: nextName,
          userId: user._id,
          requireFullName: false
        })
      }
    } else if (becomingVerified) {
      const phoneToVerify = nextPhone || currentPhone
      await assertPhoneClaimAllowed({
        phone: phoneToVerify,
        name: nextName,
        userId: user._id,
        requireFullName: true
      })
      patch.phoneIsVerified = true
      patch.name = nextName
      // Persist a stable display form for the verified number.
      if (phoneToVerify) patch.phone = phoneToVerify
    }

    // Verified phone stays bound to this account's name — no anonymous rename.
    if (user.phoneIsVerified && patch.name !== undefined && !becomingVerified) {
      if (!hasFullPersonName(String(patch.name || ''))) {
        throw badInput('Podaj imię i nazwisko')
      }
    }

    Object.assign(user, patch)
    await user.save()

    if (user.phoneIsVerified && user.phone) {
      await releaseUnverifiedPhoneClaims(user.phone, user._id)
    }

    return profileShape(user)
  },

  emailExist: async (_p, { email }, ctx) => {
    assertPublicAccess(ctx)
    return Boolean(await User.exists({ email: normalizeEmail(email) }))
  },

  phoneExist: async (_p, { phone }, ctx) => {
    assertPublicAccess(ctx)
    return Boolean(await User.exists({ phone: String(phone || '').trim() }))
  },

  sendOtpToEmail: (_p, { email }, ctx) => {
    assertPublicAccess(ctx)
    const code = issueOtp(OTP_PURPOSE.EMAIL, normalizeEmail(email))
    // TODO(production): send via the mail provider instead of logging.
    if (code) console.log(`[OTP email ${email}] => ${code}`)
    // Always "true": a failed/throttled send must not reveal whether the
    // address exists or how often it was requested.
    return { result: true }
  },

  sendOtpToPhoneNumber: async (_p, { phone }, ctx) => {
    assertPublicAccess(ctx)
    const trimmed = String(phone || '').trim()
    const code = issueOtp(OTP_PURPOSE.PHONE, trimmed)
    // Throttled / hourly cap — still return true so callers cannot probe.
    if (!code) return { result: true }

    if (SMSAPI_ENABLED) {
      const sent = await sendSms({
        to: trimmed,
        message: buildOtpSmsMessage(code)
      })
      if (!sent.ok) {
        console.error(
          `[SMSAPI] send failed phone=${trimmed} error=${sent.error || '?'} ${sent.message || ''}`
        )
      } else {
        console.log(
          `[SMSAPI] sent phone=${trimmed} id=${sent.id || '-'} status=${sent.status || '-'}`
        )
      }
      return { result: true }
    }

    // No gateway configured (local/dev): keep code in logs only.
    console.log(`[OTP phone ${trimmed}] => ${code}`)
    return { result: true }
  },

  verifyOtp: async (_p, { otp, email, phone }, ctx) => {
    assertPublicAccess(ctx)
    if (phone) {
      const trimmed = String(phone).trim()
      if (!consumeOtp(OTP_PURPOSE.PHONE, trimmed, otp)) return { result: false }
      // Do not mark arbitrary accounts verified here — phone ownership is
      // finalized in updateUser / guestCheckout with name binding.
      return { result: true }
    }
    if (email) {
      const normalized = normalizeEmail(email)
      if (!consumeOtp(OTP_PURPOSE.EMAIL, normalized, otp)) return { result: false }
      await User.updateOne({ email: normalized }, { emailIsVerified: true })
      return { result: true }
    }
    return { result: false }
  },

  forgotPassword: (_p, { email }, ctx) => {
    assertPublicAccess(ctx)
    const normalized = normalizeEmail(email)
    const code = issueOtp(OTP_PURPOSE.PASSWORD_RESET, normalized)
    // TODO(production): send via the mail provider instead of logging.
    if (code) console.log(`[Forgot password OTP ${normalized}] => ${code}`)
    // Constant response — never leak whether the account exists.
    return { result: true }
  },

  resetPassword: async (_p, { password, email, otp }, ctx) => {
    assertPublicAccess(ctx)
    const normalized = normalizeEmail(email)
    assertPasswordStrength(password)
    if (!consumeOtp(OTP_PURPOSE.PASSWORD_RESET, normalized, otp)) {
      throw new GraphQLError('Invalid or expired OTP', {
        extensions: { code: 'BAD_USER_INPUT' }
      })
    }
    const user = await User.findOne({ email: normalized })
    // The code was already consumed, so a wrong address cannot be probed twice.
    if (!user) return { result: true }
    user.password = password
    await user.save()
    return { result: true }
  },

  refreshToken: async (_p, { refreshToken: presented }, ctx) => {
    assertPublicAccess(ctx)
    const claims = verifyToken(presented)
    // Only a dedicated refresh token may mint a new session, and only for
    // panel roles — this endpoint returns an *owner* session payload.
    if (claims?.typ !== 'refresh' || !claims.userId) throw unauthenticated()

    const user = await User.findById(claims.userId).lean()
    if (!user || user.isActive === false || !OWNER_ROLES.includes(user.role)) {
      throw unauthenticated()
    }
    return ownerResponse(user)
  },

  // Address management
  createAddress: async (_p, { addressInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    user.addresses = (user.addresses || []).map((a) => { a.selected = false; return a })
    user.addresses.push({
      label: addressInput.label || 'Other',
      deliveryAddress: addressInput.deliveryAddress || '',
      details: addressInput.details || '',
      location: {
        coordinates: [
          toLongitude(addressInput.longitude),
          toLatitude(addressInput.latitude)
        ]
      },
      selected: true
    })
    await user.save()
    return profileShape(user)
  },

  editAddress: async (_p, { addressInput }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    // Scoped to the caller's own subdocuments, so another user's address id
    // simply does not resolve.
    const addr = user.addresses.id(addressInput._id)
    if (addr) {
      if (addressInput.label != null) addr.label = addressInput.label
      if (addressInput.deliveryAddress != null) addr.deliveryAddress = addressInput.deliveryAddress
      if (addressInput.details != null) addr.details = addressInput.details
      if (addressInput.longitude != null || addressInput.latitude != null) {
        addr.location.coordinates = [
          addressInput.longitude != null
            ? toLongitude(addressInput.longitude, addr.location.coordinates[0])
            : addr.location.coordinates[0],
          addressInput.latitude != null
            ? toLatitude(addressInput.latitude, addr.location.coordinates[1])
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
    if (!user) throw unauthenticated()
    user.addresses = (user.addresses || []).filter(
      (a) => String(a._id) !== String(addressId)
    )
    await user.save()
    return profileShape(user)
  },

  deleteBulkAddresses: async (_p, { ids }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    const doomed = new Set((ids || []).map(String))
    user.addresses = (user.addresses || []).filter((a) => !doomed.has(String(a._id)))
    await user.save()
    return profileShape(user)
  },

  selectAddress: async (_p, { id: addressId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    for (const address of user.addresses || []) {
      address.selected = String(address._id) === String(addressId)
    }
    await user.save()
    return profileShape(user)
  },

  changePassword: async (_p, { oldPassword, newPassword }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    assertPasswordStrength(newPassword)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    if (!(await user.comparePassword(String(oldPassword || '')))) {
      throw new GraphQLError('Invalid password', {
        extensions: { code: 'BAD_USER_INPUT' }
      })
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
    if (!user) throw unauthenticated()
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
    if (!user) throw unauthenticated()
    return profileShape(user)
  },

  addFavourite: async (_p, { id: restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const user = await User.findById(auth.userId)
    if (!user) throw unauthenticated()
    const fav = new Set((user.favourite || []).map(String))
    if (fav.has(String(restaurantId))) fav.delete(String(restaurantId))
    else fav.add(String(restaurantId))
    user.favourite = [...fav]
    await user.save()
    return profileShape(user)
  },

  Deactivate: async (_p, { isActive, email }, ctx) => {
    assertPublicAccess(ctx)
    const auth = requireUser(ctx)
    const normalized = normalizeEmail(email)

    // Self-service account deletion (app "Usuń dane") or SUPER_ADMIN by email.
    let user
    if (auth.role === 'SUPER_ADMIN' && normalized) {
      user = await User.findOne({ email: normalized })
    } else {
      user = await User.findById(auth.userId)
      if (user && normalized && normalizeEmail(user.email) !== normalized) {
        throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
      }
    }
    if (!user) throw new GraphQLError('User not found')

    // Hard-delete from Mongo when deactivating — GDPR wipe, not soft flag.
    if (isActive === false) {
      const shape = profileShape(user)
      shape.isActive = false
      await User.deleteOne({ _id: user._id })
      return shape
    }

    if (auth.role !== 'SUPER_ADMIN') {
      throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
    }
    user.isActive = true
    await user.save()
    return profileShape(user)
  }
}
