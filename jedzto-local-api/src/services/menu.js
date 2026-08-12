import { Restaurant, Category, Food } from '../models/index.js'
import { rewriteUploadUrl, rewriteUploadUrlsDeep } from '../utils/publicUrl.js'

const id = (doc) => (doc?._id ? String(doc._id) : null)

export const mapFood = (f) => ({
  _id: id(f),
  title: f.title,
  description: f.description,
  image: rewriteUploadUrl(f.image),
  price: f.price,
  subCategory: f.subCategory,
  isOutOfStock: f.isOutOfStock,
  isActive: f.isActive,
  ingredients: Array.isArray(f.ingredients) ? f.ingredients.filter(Boolean) : [],
  restaurantId: id(f.restaurantId) || String(f.restaurantId),
  categoryId: id(f.categoryId) || String(f.categoryId),
  createdAt: f.createdAt?.toISOString?.() || f.createdAt,
  updatedAt: f.updatedAt?.toISOString?.() || f.updatedAt,
  variations: (f.variations || []).map((v) => ({
    _id: id(v) || id(v?._id),
    id: id(v) || id(v?._id),
    title: v.title,
    price: v.price,
    discounted: v.discounted || 0,
    // GraphQL declares addons as [ID!] — never return raw ObjectIds.
    addons: (v.addons || []).map((a) => id(a) || id(a?._id) || String(a)).filter(Boolean),
    isOutOfStock: Boolean(v.isOutOfStock)
  }))
})

export async function liveCategories(restaurantId) {
  const [categories, foods] = await Promise.all([
    Category.find({ restaurantId }).lean(),
    Food.find({ restaurantId }).lean()
  ])

  const foodsByCategory = new Map()
  for (const food of foods) {
    const key = String(food.categoryId)
    if (!foodsByCategory.has(key)) foodsByCategory.set(key, [])
    foodsByCategory.get(key).push(mapFood(food))
  }

  return categories.map((c) => ({
    _id: id(c),
    title: c.title,
    image: rewriteUploadUrl(c.image || ''),
    restaurantId: id(c.restaurantId),
    foods: foodsByCategory.get(String(c._id)) || [],
    createdAt: c.createdAt?.toISOString?.() || c.createdAt,
    updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt
  }))
}

export async function backfillUnpublishedMenus() {
  const candidates = await Restaurant.find({ menuPublishedAt: null }).select('_id').lean()
  let published = 0

  for (const { _id } of candidates) {
    const hasMenu = await Category.exists({ restaurantId: _id })
    if (!hasMenu) continue
    await publishRestaurantMenu(_id)
    published += 1
  }

  if (published) {
    console.log(`[menu] published existing menus for ${published} restaurant(s)`)
  }
  return published
}

export async function publishRestaurantMenu(restaurantId) {
  const categories = await liveCategories(restaurantId)
  await Restaurant.updateOne(
    { _id: restaurantId },
    {
      $set: {
        publishedMenu: { categories },
        menuPublishedAt: new Date(),
        hasUnpublishedMenuChanges: false
      }
    }
  )
  return categories
}

export { rewriteUploadUrlsDeep }
