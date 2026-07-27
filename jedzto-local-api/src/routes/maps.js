import express from 'express'
import { searchMockPlaces, findMockPlaceById, findNearestMockPlace } from '../data/mockPlaces.js'

export const mapsRouter = express.Router()

// Local, offline replacement for the Google Places Autocomplete/Details and
// Geocoding APIs consumed by the mobile app's address search
// (enatega-multivendor-app/src/api/googleMapsProxy.js). Response shape is
// intentionally Google-like (`status`, `predictions`, `result`,
// `formattedAddress`) so the client needs no changes.

mapsRouter.get('/autocomplete', (req, res) => {
  const { input } = req.query
  if (!input || String(input).trim().length < 2) {
    return res.json({ data: { status: 'ZERO_RESULTS', predictions: [] } })
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

mapsRouter.get('/reverse-geocode', (req, res) => {
  const latitude = Number(req.query.latitude)
  const longitude = Number(req.query.longitude)

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.json({ data: { status: 'ZERO_RESULTS', errorMessage: 'Invalid coordinates' } })
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
