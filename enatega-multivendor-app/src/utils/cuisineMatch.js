/**
 * Loose cuisine matching for Discovery taste chips / Menu filters.
 * "Burger" should hit restaurants tagged "Burgery", and vice versa.
 */

const normalizeCuisine = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')

/** Groups of interchangeable labels for the taste-category chips. */
const CUISINE_GROUPS = [
  ['pizza', 'pizzeria', 'wloska'],
  ['burger', 'burgery', 'burgers', 'amerykanska'],
  ['sushi', 'japonska', 'japonski'],
  ['kebab', 'kebabowa', 'turcja', 'turecka'],
  ['kurczak', 'chicken', 'poultry', 'stripsy'],
  ['zakupy', 'sklep', 'delikatesy', 'grocery', 'spożywcze']
]

const groupFor = (normalized) =>
  CUISINE_GROUPS.find((group) =>
    group.some((alias) => alias === normalized || alias.includes(normalized) || normalized.includes(alias))
  ) || [normalized]

const tokensOf = (restaurant) => {
  const raw = [
    ...(restaurant?.cuisines || []),
    ...(restaurant?.tags || []),
    restaurant?.name || ''
  ]
  return raw.map(normalizeCuisine).filter(Boolean)
}

export const restaurantMatchesCuisine = (restaurant, cuisineQuery) => {
  const query = normalizeCuisine(cuisineQuery)
  if (!query) return true

  const needles = groupFor(query)
  const haystack = tokensOf(restaurant)

  return needles.some((needle) =>
    haystack.some(
      (token) =>
        token === needle ||
        token.includes(needle) ||
        needle.includes(token)
    )
  )
}

export { normalizeCuisine }
