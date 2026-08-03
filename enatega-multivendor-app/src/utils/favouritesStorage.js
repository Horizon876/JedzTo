import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@jedzto/favourites'

const listeners = new Set()

function notify(favourites) {
  listeners.forEach((listener) => {
    try {
      listener(favourites)
    } catch (_) {
      // ignore subscriber errors
    }
  })
}

export function subscribeFavourites(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function toFavouriteSnapshot(restaurant) {
  if (!restaurant?._id) return null
  return {
    _id: String(restaurant._id),
    name: restaurant.name || '',
    image: restaurant.image || '',
    logo: restaurant.logo || '',
    deliveryTime: restaurant.deliveryTime ?? null,
    minimumOrder: restaurant.minimumOrder ?? null,
    isAvailable: restaurant.isAvailable !== false,
    tax: restaurant.tax ?? null,
    shopType: restaurant.shopType || 'restaurant',
    cuisines: restaurant.cuisines || [],
    tags: restaurant.tags || [],
    reviewCount: restaurant.reviewCount ?? null,
    reviewAverage: restaurant.reviewAverage ?? null,
    freeDelivery: Boolean(restaurant.freeDelivery),
    acceptVouchers: Boolean(restaurant.acceptVouchers),
    deliveryFee: restaurant.deliveryFee ?? null,
    deliveryAreaName: restaurant.deliveryAreaName ?? null,
    address: restaurant.address ?? null,
    location: restaurant.location || null,
    openingTimes: restaurant.openingTimes || []
  }
}

export async function loadFavourites() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => toFavouriteSnapshot(item))
      .filter(Boolean)
  } catch {
    return []
  }
}

async function persistFavourites(favourites) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  notify(favourites)
  return favourites
}

export async function isFavouriteId(restaurantId) {
  if (!restaurantId) return false
  const favourites = await loadFavourites()
  const id = String(restaurantId)
  return favourites.some((item) => item._id === id)
}

export async function toggleFavourite(restaurant) {
  const snapshot = toFavouriteSnapshot(restaurant)
  if (!snapshot) return []

  const favourites = await loadFavourites()
  const exists = favourites.some((item) => item._id === snapshot._id)
  const next = exists
    ? favourites.filter((item) => item._id !== snapshot._id)
    : [snapshot, ...favourites.filter((item) => item._id !== snapshot._id)]

  return persistFavourites(next)
}

export async function clearFavourites() {
  await AsyncStorage.removeItem(STORAGE_KEY)
  notify([])
}
