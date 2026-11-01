/**
 * Store / grocery order-pool helpers.
 *
 * Customer app Restaurants list filters by shopType === 'restaurant', so
 * Delikatesy stays shopType=restaurant and is recognized via cuisines/tags.
 */

const STORE_TAG_RE = /zakupy|sklep|delikatesy|grocery|spo[zż]ywcze/i

export function isStorePoolRestaurant(restaurant) {
  if (!restaurant) return false
  if (String(restaurant.shopType || '').toLowerCase() === 'grocery') return true
  const tags = [
    ...(restaurant.cuisines || []),
    ...(restaurant.tags || []),
    restaurant.name || ''
  ]
  return tags.some((t) => STORE_TAG_RE.test(String(t || '')))
}

/** Mongo filter for restaurants that use the rider-pool confirm flow. */
export function storePoolRestaurantMongoFilter() {
  return {
    $or: [
      { shopType: 'grocery' },
      { cuisines: { $elemMatch: { $regex: STORE_TAG_RE } } },
      { tags: { $elemMatch: { $regex: STORE_TAG_RE } } }
    ]
  }
}
