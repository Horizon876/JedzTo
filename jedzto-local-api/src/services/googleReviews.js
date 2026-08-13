import {
  GOOGLE_PLACE_PROFILES,
  GOOGLE_PLACE_BY_NAME
} from '../data/googlePlaces.js'

const id = (doc) => (doc?._id ? String(doc._id) : null)

export function resolveGooglePlaceProfile(restaurant) {
  if (!restaurant) return null
  const rid = id(restaurant) || String(restaurant)
  if (GOOGLE_PLACE_PROFILES[rid]) return GOOGLE_PLACE_PROFILES[rid]

  const name = restaurant.name || ''
  const mapped = GOOGLE_PLACE_BY_NAME[name]
  if (mapped && GOOGLE_PLACE_PROFILES[mapped]) {
    return GOOGLE_PLACE_PROFILES[mapped]
  }
  return null
}

/**
 * Overlay Google rating/count onto a restaurant document/preview.
 * Does not mutate the DB — display-only until Places sync is wired.
 */
export function withGoogleRating(restaurant) {
  const profile = resolveGooglePlaceProfile(restaurant)
  if (!profile) return restaurant
  return {
    ...restaurant,
    reviewAverage: profile.rating,
    reviewCount: profile.total,
    rating: profile.rating,
    googleShareUrl: profile.googleShareUrl || null
  }
}

/**
 * Shape expected by the customer app Reviews screen
 * (reviewsByRestaurant → ReviewCard).
 */
export function googleReviewsPayload(restaurant) {
  const profile = resolveGooglePlaceProfile(restaurant)
  if (!profile) {
    return {
      total: restaurant?.reviewCount || 0,
      ratings: restaurant?.reviewAverage || 0,
      reviews: []
    }
  }

  const restaurantId = id(restaurant) || 'google'
  const restaurantName = restaurant?.name || profile.name

  const reviews = (profile.reviews || []).map((r, index) => {
    const reviewId = `google-${restaurantId}-${index}`
    return {
      _id: reviewId,
      rating: r.rating,
      description: r.text,
      isActive: true,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.createdAt || new Date().toISOString(),
      source: 'google',
      relativeTime: r.relativeTime || null,
      order: {
        _id: `google-order-${index}`,
        user: {
          _id: `google-user-${index}`,
          name: r.author || 'Użytkownik Google',
          email: null
        }
      },
      restaurant: {
        _id: restaurantId,
        name: restaurantName
      }
    }
  })

  return {
    total: profile.total,
    ratings: profile.rating,
    reviews,
    googleShareUrl: profile.googleShareUrl || null
  }
}
