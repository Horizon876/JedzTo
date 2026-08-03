import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@jedzto/customer-details'
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

/** Guest opted out of "Zapisz dane" — keep token only for the current checkout. */
export async function setEphemeralGuestSession(enabled) {
  if (enabled) {
    await AsyncStorage.setItem(EPHEMERAL_GUEST_KEY, '1')
    return
  }
  await AsyncStorage.removeItem(EPHEMERAL_GUEST_KEY)
}

export async function isEphemeralGuestSession() {
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
 * After a placed order, drop remembered guest details when the user opted out
 * of "Zapisz dane". Keep the auth token so OrderDetail stays mounted
 * (logging out remounts MainNavigator and the order screen vanishes).
 */
export async function endEphemeralGuestAfterOrder() {
  if (!(await isEphemeralGuestSession())) return
  await clearCustomerDetails()
  await clearEphemeralGuestSession()
}
