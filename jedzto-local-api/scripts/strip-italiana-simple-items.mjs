/**
 * Clear ingredients (personalization) for Napoje / Sosy / Przystawki / Pieczywo
 * and keep a single Standard variation (no size picker).
 */
import mongoose from 'mongoose'
import { Category, Food, Restaurant } from '../src/models/index.js'
import { publishRestaurantMenu } from '../src/services/menu.js'

const RESTAURANT_NAME = 'Pizzeria Italiana'
const CATEGORIES = ['Napoje', 'Sosy', 'Przystawki', 'Pieczywo']

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/jedzto', {
    serverSelectionTimeoutMS: 8000
  })

  const restaurant = await Restaurant.findOne({ name: RESTAURANT_NAME })
  if (!restaurant) throw new Error('Restaurant not found')

  const cats = await Category.find({
    restaurantId: restaurant._id,
    title: { $in: CATEGORIES }
  })

  let updated = 0
  for (const cat of cats) {
    const foods = await Food.find({ restaurantId: restaurant._id, categoryId: cat._id })
    for (const food of foods) {
      const price =
        Number(food.variations?.[0]?.price) || Number(food.price) || 0
      food.ingredients = []
      food.variations = [
        {
          title: 'Standard',
          price,
          discounted: 0,
          addons: [],
          isOutOfStock: Boolean(food.variations?.[0]?.isOutOfStock)
        }
      ]
      food.price = price
      await food.save()
      updated += 1
      console.log(`[ok] ${cat.title} / ${food.title}`)
    }
  }

  await publishRestaurantMenu(restaurant._id)
  console.log(`done — updated ${updated} foods in ${cats.map((c) => c.title).join(', ')}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
