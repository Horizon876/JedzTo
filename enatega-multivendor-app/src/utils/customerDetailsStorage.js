import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@jedzto/customer-details'
const REMEMBER_PERSONAL_KEY = '@jedzto/remember-personal-details'
const CHECKOUT_READY_KEY = '@jedzto/checkout-details-ready'
/** @deprecated kept so old installs clear cleanly */
const EPHEMERAL_GUEST_KEY = '@jedzto/ephemeral-guest'

export async function loadCustomerDetails() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      phone: parsed.phone || '',
      countryCode: parsed.countryCode || ''
    }
  } catch {
    return null
  }
}

export async function saveCustomerDetails(details) {
  const payload = {
    firstName: String(details?.firstName || '').trim(),
    lastName: String(details?.lastName || '').trim(),
    phone: String(details?.phone || '').trim(),
    countryCode: String(details?.countryCode || '').trim()
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return payload
}

export async function clearCustomerDetails() {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export async function hasSavedCustomerDetails() {
  const details = await loadCustomerDetails()
  return Boolean(details?.firstName && details?.lastName && details?.phone)
}

/** User checked "Zapisz dane" — remember name/phone for next orders. */
export async function setRememberPersonalDetails(enabled) {
  if (enabled) {
    await AsyncStorage.setItem(REMEMBER_PERSONAL_KEY, '1')
    return
  }
  await AsyncStorage.removeItem(REMEMBER_PERSONAL_KEY)
}

export async function shouldRememberPersonalDetails() {
  try {
    return (await AsyncStorage.getItem(REMEMBER_PERSONAL_KEY)) === '1'
  } catch {
    return false
  }
}

/** Mid-checkout after GuestCheckout — allow Cart → Checkout once. */
export async function setCheckoutDetailsReady(enabled) {
  if (enabled) {
    await AsyncStorage.setItem(CHECKOUT_READY_KEY, '1')
    return
  }
  await AsyncStorage.removeItem(CHECKOUT_READY_KEY)
}

export async function isCheckoutDetailsReady() {
  try {
    return (await AsyncStorage.getItem(CHECKOUT_READY_KEY)) === '1'
  } catch {
    return false
  }
}

/** @deprecated use setRememberPersonalDetails(false) */
export async function setEphemeralGuestSession(enabled) {
  if (enabled) {
    await setRememberPersonalDetails(false)
    return
  }
  await AsyncStorage.removeItem(EPHEMERAL_GUEST_KEY)
}

/** @deprecated use !shouldRememberPersonalDetails() */
export async function isEphemeralGuestSession() {
  if (await shouldRememberPersonalDetails()) return false
  try {
    return (await AsyncStorage.getItem(EPHEMERAL_GUEST_KEY)) === '1'
  } catch {
    return false
  }
}

export async function clearEphemeralGuestSession() {
  await AsyncStorage.removeItem(EPHEMERAL_GUEST_KEY)
}

/**
 * After placing an order when personal details were not saved:
 * clear local name/phone autofill and the mid-checkout flag.
 * Keeps the auth session so orders + favourites stay available.
 */
export async function endEphemeralGuestAfterOrder() {
  await setCheckoutDetailsReady(false)
  if (await shouldRememberPersonalDetails()) return false
  await clearCustomerDetails()
  await clearEphemeralGuestSession()
  return false
}
