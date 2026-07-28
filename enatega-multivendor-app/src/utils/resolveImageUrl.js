function firstNonEmpty(values = []) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

/**
 * Phones cannot load images from http://localhost:... — that points at the
 * phone itself. Rewrite local-API upload URLs to the configured SERVER_URL.
 */
export function rewriteLocalUploadUrl(url, serverUrl = '') {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('/uploads/')) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return url
    }

    const base = (serverUrl || '').replace(/\/$/, '')
    if (!base) return url
    return `${base}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export function resolveRestaurantImage(entity, serverUrl = '') {
  if (!entity) return ''

  return rewriteLocalUploadUrl(
    firstNonEmpty([
      entity.imageWebp,
      entity.image,
      entity.restaurantImage,
      entity.logoWebp,
      entity.logo,
      entity.restaurantLogo,
      entity.imageAvif,
      entity.logoAvif
    ]),
    serverUrl
  )
}

export function resolveLogoImage(entity, serverUrl = '') {
  if (!entity) return ''

  return rewriteLocalUploadUrl(
    firstNonEmpty([
      entity.logoWebp,
      entity.logo,
      entity.restaurantLogo,
      entity.imageWebp,
      entity.image,
      entity.restaurantImage,
      entity.logoAvif,
      entity.imageAvif
    ]),
    serverUrl
  )
}

export function resolveGenericImage(...values) {
  return rewriteLocalUploadUrl(firstNonEmpty(values), '')
}
