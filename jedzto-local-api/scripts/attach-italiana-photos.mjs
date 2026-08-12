/**
 * Attach local Italiana photos to menu items.
 * Source: C:\Users\szyme\Desktop\jedzto_zdjecia_italiana
 * Run: node scripts/attach-italiana-photos.mjs
 */
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { Food, Restaurant } from '../src/models/index.js'
import { publishRestaurantMenu } from '../src/services/menu.js'
import { getPublicApiBase } from '../src/utils/publicUrl.js'
import { UPLOADS_DIR } from '../src/utils/imageUpload.js'

const RESTAURANT_NAME = 'Pizzeria Italiana'
const SRC_DIR = 'C:\\Users\\szyme\\Desktop\\jedzto_zdjecia_italiana'

function stripDiacritics(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function norm(s) {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/^pizza miesiaca\s*[—\-–]?\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\(bez pieczywka\)/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Explicit file-stem → food title fragment matches (after norm). */
const ALIASES = {
  margerita: 'margherita',
  'margherita top': 'margherita top',
  'pizza pera': 'pizza pera',
  'n duja': "n'duja",
  'salatka fitness': 'salatka fitness',
  'bula z szarpana wieprzowina': 'bula z szarpana wieprzowina'
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    throw new Error(`Missing folder: ${SRC_DIR}`)
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  await mongoose.connect('mongodb://127.0.0.1:27017/jedzto', {
    serverSelectionTimeoutMS: 8000
  })

  const restaurant = await Restaurant.findOne({ name: RESTAURANT_NAME })
  if (!restaurant) throw new Error(`Restaurant not found: ${RESTAURANT_NAME}`)

  const foods = await Food.find({ restaurantId: restaurant._id })
  const byNorm = new Map()
  for (const food of foods) {
    const key = norm(food.title)
    if (!byNorm.has(key)) byNorm.set(key, [])
    byNorm.get(key).push(food)
  }

  const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
  const base = getPublicApiBase()
  let matched = 0
  const unmatchedFiles = []
  const unmatchedFoods = new Set(foods.map((f) => f.title))

  for (const file of files) {
    const stem = path.parse(file).name
    let key = norm(stem)
    if (ALIASES[key]) key = norm(ALIASES[key])

    // try direct, then without leading "pizza "
    let candidates = byNorm.get(key) || byNorm.get(key.replace(/^pizza\s+/, '')) || []

    // fuzzy: food key includes file key or vice versa
    if (!candidates.length) {
      for (const [foodKey, list] of byNorm.entries()) {
        if (foodKey === key || foodKey.includes(key) || key.includes(foodKey)) {
          candidates = list
          break
        }
      }
    }

    if (!candidates.length) {
      unmatchedFiles.push(file)
      continue
    }

    const ext = path.extname(file).toLowerCase() || '.webp'
    const filename = `${randomUUID()}${ext}`
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(UPLOADS_DIR, filename))
    const url = `${base}/uploads/${filename}`

    for (const food of candidates) {
      food.image = url
      await food.save()
      unmatchedFoods.delete(food.title)
      matched += 1
      console.log(`[ok] ${file} → ${food.title}`)
    }
  }

  await publishRestaurantMenu(restaurant._id)

  console.log(
    JSON.stringify(
      {
        matchedFoods: matched,
        unmatchedFiles,
        foodsStillWithoutPhoto: [...unmatchedFoods].filter(
          (t) =>
            !/pepsi|lipton|mirinda|7up|sok|woda|sos |ketchup|oliwa|pesto bazyliowe|czosnkowy|chilli|musztard|bbq|koperk|pieczywko|krem z|nachosy|pizza italiana/i.test(
              t
            )
        )
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
