/**
 * Add pizza/salad numbers + salad bread choice addon for Pizzeria Italiana.
 * Run: node scripts/update-italiana-numbers-bread.mjs
 */
import mongoose from 'mongoose'
import { Category, Food, Restaurant } from '../src/models/index.js'
import { publishRestaurantMenu } from '../src/services/menu.js'

const RESTAURANT_NAME = 'Pizzeria Italiana'
const oid = () => new mongoose.Types.ObjectId()

/** Exact current titles → numbered titles */
const PIZZA_TITLES = {
  'Pizza Gourmet': [
    ['Magyar', '1. Magyar'],
    ['Peperonata', '2. Peperonata'],
    ['Pizza Pera', '3. Pizza Pera'],
    ['Burrata', '4. Burrata'],
    ['Pulled Pork', '5. Pulled Pork']
  ],
  'Pizza Klasyczna': [
    ['Margherita TOP', 'Pizza Miesiąca — Margherita TOP'],
    ['Margherita', '1. Margherita'],
    ['Capricciosa', '2. Capricciosa'],
    ['Salame', '3. Salame'],
    ['Picante', '4. Picante'],
    ['Quattro Formaggi', '5. Quattro Formaggi'],
    ['Quattro Stagioni', '6. Quattro Stagioni'],
    ['Prosciutto e Salame', '7. Prosciutto e Salame'],
    ['Pancetta e Picante', '8. Pancetta e Picante'],
    ['Parma', '9. Parma'],
    ['Rukola', '10. Rukola'],
    ['House', '11. House'],
    ['Diavola', '12. Diavola'],
    ['Polacco', '13. Polacco'],
    ['Vegetariana', '14. Vegetariana'],
    ["N'Duja", "15. N'Duja"],
    ['Forno', '16. Forno'],
    ['Prosciutto e Pollo', '17. Prosciutto e Pollo'],
    ['Pizza Italiana', '18. Pizza Italiana']
  ],
  'Pizza Bianca': [
    ['Pesto', '19. Pesto'],
    ['Fungie', '20. Fungie'],
    ['Porcino', '21. Porcino'],
    ['Spinaci e Pollo', '22. Spinaci e Pollo']
  ]
}

const SALAD_TITLES = [
  ['Sałatka Pollo', '1. Sałatka Pollo'],
  ['Sałatka Parma', '2. Sałatka Parma'],
  ['Sałatka Feta', '3. Sałatka Feta'],
  ['Sałatka Bekon', '4. Sałatka Bekon'],
  ['Sałatka na ostro', '5. Sałatka na ostro'],
  ['Sałatka Fitness', '6. Sałatka Fitness'],
  ['Sałatka z chrupiącym kurczakiem', '7. Sałatka z chrupiącym kurczakiem']
]

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/jedzto', {
    serverSelectionTimeoutMS: 8000
  })

  const restaurant = await Restaurant.findOne({ name: RESTAURANT_NAME })
  if (!restaurant) throw new Error(`Restaurant "${RESTAURANT_NAME}" not found`)
  const restaurantId = restaurant._id

  // --- Bread options + addon on restaurant ---
  const optIds = {
    czarnuszka: oid(),
    oliwa: oid(),
    bezCzarnuszki: oid(),
    bez: oid()
  }

  const options = [
    {
      _id: optIds.czarnuszka,
      title: 'Pieczywko na sosie pomidorowym z czarnuszką',
      description: '',
      price: 0
    },
    {
      _id: optIds.oliwa,
      title: 'Pieczywko z oliwą czosnkową',
      description: '',
      price: 0
    },
    {
      _id: optIds.bezCzarnuszki,
      title: 'Pieczywko na sosie pomidorowym bez czarnuszki',
      description: '',
      price: 0
    },
    {
      _id: optIds.bez,
      title: 'Bez pieczywka',
      description: '',
      price: 0
    }
  ]

  const breadAddonId = oid()
  const addons = [
    {
      _id: breadAddonId,
      title: 'Wybór pieczywa',
      description:
        'Do sałatki: pieczywko na sosie pomidorowym z czarnuszką, z oliwą czosnkową albo bez pieczywka',
      quantityMinimum: 1,
      quantityMaximum: 1,
      options: [
        String(optIds.czarnuszka),
        String(optIds.oliwa),
        String(optIds.bezCzarnuszki),
        String(optIds.bez)
      ]
    }
  ]

  // Keep any existing non-bread options/addons (none expected)
  restaurant.options = options
  restaurant.addons = addons
  await restaurant.save()
  console.log('[italiana] bread options + addon saved')

  // --- Rename pizzas ---
  let renamed = 0
  for (const [catTitle, pairs] of Object.entries(PIZZA_TITLES)) {
    const category = await Category.findOne({ restaurantId, title: catTitle })
    if (!category) {
      console.warn(`[italiana] missing category ${catTitle}`)
      continue
    }
    for (const [from, to] of pairs) {
      const res = await Food.updateOne(
        { restaurantId, categoryId: category._id, title: from },
        { $set: { title: to } }
      )
      if (res.modifiedCount) renamed += 1
      else {
        // already numbered?
        const exists = await Food.exists({
          restaurantId,
          categoryId: category._id,
          title: to
        })
        if (!exists) console.warn(`[italiana] pizza not found: ${from}`)
      }
    }
  }
  console.log(`[italiana] pizza titles updated: ${renamed}`)

  // --- Rename salads + attach bread addon to all size variations ---
  const saladCat = await Category.findOne({ restaurantId, title: 'Sałatka' })
  if (!saladCat) throw new Error('Sałatka category missing')

  let salads = 0
  for (const [from, to] of SALAD_TITLES) {
    const food =
      (await Food.findOne({ restaurantId, categoryId: saladCat._id, title: from })) ||
      (await Food.findOne({ restaurantId, categoryId: saladCat._id, title: to }))
    if (!food) {
      console.warn(`[italiana] salad not found: ${from}`)
      continue
    }
    food.title = to
    food.variations = (food.variations || []).map((v) => ({
      ...(v.toObject?.() || v),
      addons: [String(breadAddonId)]
    }))
    await food.save()
    salads += 1
  }
  console.log(`[italiana] salads updated: ${salads}`)

  await publishRestaurantMenu(restaurantId)
  console.log('[italiana] menu republished')

  // sanity
  const sample = await Food.findOne({
    restaurantId,
    title: '1. Sałatka Pollo'
  }).lean()
  console.log(
    JSON.stringify(
      {
        sampleTitle: sample?.title,
        variationAddons: sample?.variations?.map((v) => ({
          title: v.title,
          addons: v.addons
        })),
        restaurantAddons: restaurant.addons?.map((a) => a.title),
        optionCount: restaurant.options?.length
      },
      null,
      2
    )
  )

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
