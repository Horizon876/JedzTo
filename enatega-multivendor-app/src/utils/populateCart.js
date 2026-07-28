export function sameCartAddons(left = [], right = []) {
  if ((left?.length || 0) !== (right?.length || 0)) return false

  return (left || []).every((addon) => {
    const other = (right || []).find((item) => item._id === addon._id)
    if (!other) return false

    const leftOptions = addon.options || []
    const rightOptions = other.options || []
    if (leftOptions.length !== rightOptions.length) return false

    return leftOptions.every((option) => rightOptions.some((item) => item._id === option._id))
  })
}

export function findMatchingCartIndex(cart = [], { _id, variationId, addons = [] }) {
  return cart.findIndex(
    (item) =>
      item._id === _id &&
      item.variation?._id === variationId &&
      sameCartAddons(item.addons, addons)
  )
}

/** Merge duplicate lines and drop invalid quantities. */
export function mergeCartLines(cart = []) {
  const merged = []

  for (const item of cart) {
    const quantity = Number(item?.quantity) || 0
    if (!item?._id || !item?.variation?._id || quantity <= 0) continue

    const existingIndex = findMatchingCartIndex(merged, {
      _id: item._id,
      variationId: item.variation._id,
      addons: item.addons || []
    })

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: Number(merged[existingIndex].quantity || 0) + quantity
      }
    } else {
      merged.push({
        key: item.key,
        _id: item._id,
        quantity,
        variation: { _id: item.variation._id },
        addons: item.addons || [],
        specialInstructions: item.specialInstructions || ''
      })
    }
  }

  return merged
}

/** Keep only cart lines that still resolve against the restaurant menu. */
export function pruneCartToRestaurant(restaurant, cart = []) {
  const merged = mergeCartLines(cart)
  if (!restaurant) return merged

  const foods = restaurant.categories?.flatMap((category) => category.foods) ?? []
  const foodById = new Map(foods.map((food) => [food._id, food]))

  return merged.filter((item) => {
    const food = foodById.get(item._id)
    return !!food?.variations?.some((variation) => variation._id === item.variation?._id)
  })
}

export function getPopulatedCartQuantityTotal(restaurant, cart = []) {
  return populateCart(restaurant, cart).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

export function populateCart(restaurant, cart = []) {
  if (!restaurant) return []

  const foods = restaurant.categories?.flatMap((category) => category.foods) ?? []
  const addons = restaurant.addons ?? []
  const options = restaurant.options ?? []
  const foodById = new Map(foods.map((food) => [food._id, food]))
  const addonById = new Map(addons.map((addon) => [addon._id, addon]))
  const optionById = new Map(options.map((option) => [option._id, option]))

  return mergeCartLines(cart)
    .map((cartItem) => {
      const food = foodById.get(cartItem._id)
      const variation = food?.variations?.find((v) => v._id === cartItem.variation?._id)
      if (!food || !variation) return null

      let unitPrice = Number(variation.price) || 0
      const optionsTitle = []
      for (const addon of cartItem.addons ?? []) {
        if (!addonById.has(addon._id)) continue
        for (const option of addon.options ?? []) {
          const cartOption = optionById.get(option._id)
          if (!cartOption) continue
          unitPrice += Number(cartOption.price) || 0
          optionsTitle.push(cartOption.title)
        }
      }

      const quantity = Number(cartItem.quantity) || 0
      if (quantity <= 0) return null

      const unitPriceFixed = Number(unitPrice.toFixed(2))

      const updatedCartItem = {
        ...cartItem,
        quantity,
        optionsTitle,
        title: `${food.title}${variation.title ? ` (${variation.title})` : ''}`,
        price: unitPriceFixed
      }

      return {
        ...updatedCartItem,
        cartItem: updatedCartItem,
        food,
        image: food.image,
        lineTotal: Number((unitPriceFixed * quantity).toFixed(2)),
        addons: addons.filter((addon) => variation.addons?.includes(addon._id))
      }
    })
    .filter(Boolean)
}
