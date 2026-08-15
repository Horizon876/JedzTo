/**
 * Polish delivery-address formatting.
 * Preferred order: miejscowość, kod pocztowy, ulica + numer.
 * Strips country / voivodeship noise (e.g. "Lesser Poland", "Polska").
 */

const JUNK =
  /^(polska|poland|republic of poland)$|lesser\s*poland|voivodeship|wojew[oó]dztwo|^woj\.?\b|ma[lł]opolsk|śląsk|mazowieck|pomorsk|wielkopolsk|podkarpac|świętokrzysk|lubelsk|podlask|warmińsk|zachodniopomorsk|kujawsk|łódzk|opolsk/i

const POSTCODE = /^\d{2}-\d{3}$/
const POSTCODE_IN = /^(\d{2}-\d{3})\s+(.+)$/

const byPrefix = (context = [], prefix) =>
  context.find((c) => String(c.id || '').startsWith(prefix))?.text || null

/** Build a clean address from a Mapbox Geocoding feature. */
export function formatMapboxFeature(feature) {
  if (!feature) return ''
  const context = feature.context || []
  const postcode = byPrefix(context, 'postcode.')
  const city =
    byPrefix(context, 'place.') ||
    byPrefix(context, 'locality.') ||
    byPrefix(context, 'district.') ||
    null

  const types = feature.place_type || []
  let streetLine = ''

  if (types.includes('address')) {
    const street = feature.text || ''
    const number = feature.address || ''
    streetLine = [street, number].filter(Boolean).join(' ')
  } else if (types.includes('poi')) {
    // Prefer structured address on the POI when present.
    const poiAddress = feature.properties?.address
    streetLine = poiAddress
      ? `${feature.text}, ${poiAddress}`
      : feature.text || ''
  } else if (types.includes('place') || types.includes('locality')) {
    streetLine = ''
  } else {
    streetLine = feature.text || ''
  }

  const parts = [city, postcode, streetLine].filter(Boolean)
  if (parts.length) return parts.join(', ')

  return cleanPolishAddress(feature.place_name || feature.text || '')
}

/** Strip region/country junk and tidy comma-separated address strings. */
export function cleanPolishAddress(raw) {
  const parts = String(raw || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((part) => !JUNK.test(part.trim()))

  if (!parts.length) return ''

  let postcode = null
  let city = null
  const rest = []

  for (const part of parts) {
    if (POSTCODE.test(part)) {
      postcode = part
      continue
    }
    const withCity = part.match(POSTCODE_IN)
    if (withCity) {
      postcode = withCity[1]
      city = city || withCity[2].trim()
      continue
    }
    if (
      !city &&
      !/\d/.test(part) &&
      !/^(ul\.|ulica|al\.|aleja|os\.|plac|pl\.)/i.test(part) &&
      part.length > 2
    ) {
      city = part
      continue
    }
    rest.push(part)
  }

  if (city && rest.length === 0 && !postcode) {
    return parts.join(', ')
  }

  const streetLine = rest.join(', ')
  return [city, postcode, streetLine].filter(Boolean).join(', ')
}
