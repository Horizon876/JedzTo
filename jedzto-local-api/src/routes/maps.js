import express from 'express'
import { searchMockPlaces, findMockPlaceById, findNearestMockPlace } from '../data/mockPlaces.js'
import { MAPBOX_ACCESS_TOKEN } from '../config.js'
import {
  cleanPolishAddress,
  formatMapboxFeature
} from '../utils/polishAddress.js'

export const mapsRouter = express.Router()

// Address search / reverse geocoding consumed by the mobile app's address
// search (enatega-multivendor-app/src/api/googleMapsProxy.js). Response
// shape is intentionally Google-like (`status`, `predictions`, `result`,
// `formattedAddress`) so the client needs no changes.
//
// Primary source: Mapbox Geocoding API (real, worldwide addresses + exact
// coordinates for any point). Falls back to the small local mock list
// (Myślenice area) when Mapbox is unreachable/unconfigured, so the app still
// works fully offline.
//
// Addresses are always formatted in Polish as:
//   miejscowość, kod pocztowy, ulica + numer
// without voivodeship / country ("Lesser Poland", "Polska", …).

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

const encodePlaceId = ({ lat, lng, name }) =>
  `mb:${Buffer.from(JSON.stringify({ lat, lng, name })).toString('base64url')}`

/**
 * Decodes a place id we issued. The payload round-trips through the client, so
 * the coordinates are validated before they reach any caller.
 */
const decodePlaceId = (placeId) => {
  if (typeof placeId !== 'string' || !placeId.startsWith('mb:')) return null
  try {
    const decoded = JSON.parse(Buffer.from(placeId.slice(3), 'base64url').toString('utf8'))
    const lat = Number(decoded?.lat)
    const lng = Number(decoded?.lng)
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) return null
    if (!Number.isFinite(lng) || Math.abs(lng) > 180) return null
    return {
      lat,
      lng,
      name: cleanPolishAddress(String(decoded.name || '')).slice(0, 300)
    }
  } catch {
    return null
  }
}

/** Always Polish for JedzTo — English Mapbox labels produce "Lesser Poland". */
const mapLanguage = () => 'pl'

const pickCity = (context = []) => {
  const byPrefix = (prefix) => context.find((c) => c.id?.startsWith(prefix))?.text
  return byPrefix('place.') || byPrefix('locality.') || byPrefix('district.') || null
}

mapsRouter.get('/autocomplete', async (req, res) => {
  // `req.query.input` can be an array (?input=a&input=b) — force a scalar and
  // bound its length before it becomes part of an outbound URL.
  const input = String(req.query.input ?? '').trim().slice(0, 120)
  if (input.length < 2) {
    return res.json({ data: { status: 'ZERO_RESULTS', predictions: [] } })
  }

  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(input)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=8&language=${mapLanguage()}&country=pl`
      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        const features = json.features || []
        return res.json({
          data: {
            status: features.length ? 'OK' : 'ZERO_RESULTS',
            predictions: features.map((feature) => {
              const name = formatMapboxFeature(feature)
              return {
                id: feature.id,
                placeId: encodePlaceId({
                  lat: feature.center[1],
                  lng: feature.center[0],
                  name
                }),
                description: name
              }
            })
          }
        })
      }
    } catch (err) {
      console.warn('[maps] Mapbox autocomplete failed, falling back to local list:', err.message)
    }
  }

  const matches = searchMockPlaces(input).slice(0, 8)
  return res.json({
    data: {
      status: matches.length ? 'OK' : 'ZERO_RESULTS',
      predictions: matches.map((place) => ({
        id: place.placeId,
        placeId: place.placeId,
        description: place.description
      }))
    }
  })
})

mapsRouter.get('/place-details', (req, res) => {
  const { placeId } = req.query

  const decoded = decodePlaceId(placeId)
  if (decoded) {
    const name = cleanPolishAddress(decoded.name)
    return res.json({
      data: {
        status: 'OK',
        result: {
          geometry: { location: { lat: decoded.lat, lng: decoded.lng } },
          formatted_address: name,
          name
        }
      }
    })
  }

  const place = findMockPlaceById(placeId)
  if (!place) {
    return res.json({ data: { status: 'ZERO_RESULTS', errorMessage: 'Place not found' } })
  }

  return res.json({
    data: {
      status: 'OK',
      result: {
        geometry: { location: { lat: place.lat, lng: place.lng } },
        formatted_address: place.description,
        name: place.description
      }
    }
  })
})

mapsRouter.get('/reverse-geocode', async (req, res) => {
  const latitude = Number(req.query.latitude)
  const longitude = Number(req.query.longitude)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return res.json({ data: { status: 'ZERO_RESULTS', errorMessage: 'Invalid coordinates' } })
  }

  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const url = `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&language=${mapLanguage()}&country=pl&types=address,poi,place`
      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        const feature = (json.features || [])[0]
        if (feature) {
          return res.json({
            data: {
              status: 'OK',
              formattedAddress: formatMapboxFeature(feature),
              city: pickCity(feature.context) || feature.text
            }
          })
        }
        return res.json({ data: { status: 'ZERO_RESULTS', errorMessage: 'No address found nearby' } })
      }
    } catch (err) {
      console.warn('[maps] Mapbox reverse geocode failed, falling back to local list:', err.message)
    }
  }

  const nearest = findNearestMockPlace(latitude, longitude)
  if (!nearest) {
    return res.json({ data: { status: 'ZERO_RESULTS', errorMessage: 'No address found nearby' } })
  }

  return res.json({
    data: {
      status: 'OK',
      formattedAddress: nearest.description,
      city: 'Myślenice'
    }
  })
})
