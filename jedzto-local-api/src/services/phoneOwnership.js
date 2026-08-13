import { GraphQLError } from 'graphql'
import { User } from '../models/index.js'
import {
  hasFullPersonName,
  normalizePhone,
  phoneLookupVariants
} from '../utils/phone.js'

const badInput = (message) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } })

/**
 * A verified phone belongs to exactly one account (and that account's name).
 * Blocks takeover of someone else's already-confirmed number.
 */
export async function findVerifiedPhoneOwner(phone, { excludeUserId } = {}) {
  const variants = phoneLookupVariants(phone)
  if (!variants.length) return null

  const filter = {
    phone: { $in: variants },
    phoneIsVerified: true
  }
  if (excludeUserId) filter._id = { $ne: excludeUserId }

  return User.findOne(filter).select('_id name phone phoneIsVerified').lean()
}

export async function assertPhoneClaimAllowed({
  phone,
  name,
  userId,
  requireFullName = true
} = {}) {
  const phoneKey = normalizePhone(phone)
  if (!phoneKey || phoneKey.replace(/\D/g, '').length < 9) {
    throw badInput('Podaj prawidłowy numer telefonu')
  }

  const trimmedName = String(name || '').trim()
  if (requireFullName && !hasFullPersonName(trimmedName)) {
    throw badInput('Podaj imię i nazwisko, aby zweryfikować numer telefonu')
  }

  const owner = await findVerifiedPhoneOwner(phoneKey, { excludeUserId: userId })
  if (owner) {
    throw badInput(
      'Ten numer telefonu jest już zweryfikowany i przypisany do innej osoby'
    )
  }

  return { phoneKey, name: trimmedName }
}

/** Clears the same number from other unverified profiles so it stays unique. */
export async function releaseUnverifiedPhoneClaims(phone, keepUserId) {
  const variants = phoneLookupVariants(phone)
  if (!variants.length || !keepUserId) return
  await User.updateMany(
    {
      _id: { $ne: keepUserId },
      phone: { $in: variants },
      phoneIsVerified: { $ne: true }
    },
    { $set: { phone: '', phoneIsVerified: false } }
  )
}
