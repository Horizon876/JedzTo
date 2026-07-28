import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@jedzto/address-search-history'
const MAX_ITEMS = 8

async function isLoggedIn() {
  const token = await AsyncStorage.getItem('token')
  return !!token
}

export async function loadAddressSearchHistory() {
  try {
    if (!(await isLoggedIn())) {
      await AsyncStorage.removeItem(STORAGE_KEY)
      return []
    }
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveAddressSearchHistoryEntry(entry) {
  if (!entry?.description) return []
  if (!(await isLoggedIn())) return []

  const normalized = {
    id: entry.id || entry.placeId || entry.description,
    description: entry.description,
    placeId: entry.placeId || null,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null
  }

  const existing = await loadAddressSearchHistory()
  const withoutDup = existing.filter(
    (item) =>
      item.description !== normalized.description &&
      item.placeId !== normalized.placeId
  )
  const next = [normalized, ...withoutDup].slice(0, MAX_ITEMS)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export async function removeAddressSearchHistoryEntry(id) {
  if (!(await isLoggedIn())) {
    await AsyncStorage.removeItem(STORAGE_KEY)
    return []
  }
  const existing = await loadAddressSearchHistory()
  const next = existing.filter((item) => item.id !== id && item.description !== id)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
