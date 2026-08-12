/**
 * Product needs the ItemDetail screen when the customer must pick a size,
 * remove ingredients, or choose add-ons.
 */
export function foodNeedsCustomization(food) {
  if (!food) return false

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
