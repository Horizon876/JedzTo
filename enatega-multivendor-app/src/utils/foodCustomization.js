/**
 * Product needs the ItemDetail screen when the customer must pick a size,
 * remove ingredients, or choose add-ons.
 *
 * Grocery / sklep (e.g. Delikatesy): always one-tap add to cart.
 */

const normalize = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')

export function isSimpleStoreRestaurant(restaurant) {
  if (!restaurant) return false
  if (String(restaurant.shopType || '').toLowerCase() === 'grocery') return true
  const haystack = [
    restaurant.shopType,
    restaurant.name,
    ...(restaurant.cuisines || []),
    ...(restaurant.tags || [])
  ]
    .map(normalize)
    .join(' ')
  return /zakupy|sklep|delikatesy|grocery|spozywcze/.test(haystack)
}

export function foodNeedsCustomization(food, restaurant) {
  if (!food) return false
  if (isSimpleStoreRestaurant(restaurant) || String(food.shopType || '').toLowerCase() === 'grocery') {
    return false
  }

  const variations = Array.isArray(food.variations) ? food.variations : []
  if (variations.length > 1) return true

  const ingredients = Array.isArray(food.ingredients)
    ? food.ingredients.filter(Boolean)
    : []
  if (ingredients.length > 0) return true

  const addonIds = variations[0]?.addons
  if (Array.isArray(addonIds) && addonIds.length > 0) return true

  return false
}

export function getDefaultVariationId(food) {
  return food?.variations?.[0]?._id || null
}
