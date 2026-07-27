// Local, offline stand-in for the Google Places Autocomplete / Details /
// Geocoding APIs. Coordinates are kept inside the `zones` delivery polygon
// defined in resolvers.js (lat 49.8-49.9, lng 19.8-20.0 — Myślenice and the
// closest surrounding villages) so `checkLocationInCities` on the client
// always accepts a selection made from this list.
export const MOCK_PLACES = [
  { placeId: 'jedzto-place-1', description: 'Rynek 1, 32-400 Myślenice, Polska', lat: 49.8339, lng: 19.9381 },
  { placeId: 'jedzto-place-2', description: 'Rynek 15, 32-400 Myślenice, Polska', lat: 49.8342, lng: 19.9375 },
  { placeId: 'jedzto-place-3', description: 'ul. Jagiellońska 6, 32-400 Myślenice, Polska', lat: 49.8351, lng: 19.9402 },
  { placeId: 'jedzto-place-4', description: 'ul. Słowackiego 3, 32-400 Myślenice, Polska', lat: 49.8318, lng: 19.9357 },
  { placeId: 'jedzto-place-5', description: 'ul. 3 Maja 12, 32-400 Myślenice, Polska', lat: 49.8362, lng: 19.9390 },
  { placeId: 'jedzto-place-6', description: 'ul. Kazimierza Wielkiego 8, 32-400 Myślenice, Polska', lat: 49.8305, lng: 19.9412 },
  { placeId: 'jedzto-place-7', description: 'ul. Sobieskiego 21, 32-400 Myślenice, Polska', lat: 49.8375, lng: 19.9340 },
  { placeId: 'jedzto-place-8', description: 'ul. Szpitalna 2, 32-400 Myślenice, Polska', lat: 49.8298, lng: 19.9365 },
  { placeId: 'jedzto-place-9', description: 'ul. Ogrodowa 5, 32-400 Myślenice, Polska', lat: 49.8331, lng: 19.9450 },
  { placeId: 'jedzto-place-10', description: 'ul. Kolejowa 10, 32-400 Myślenice, Polska', lat: 49.8280, lng: 19.9420 },
  { placeId: 'jedzto-place-11', description: 'ul. Zdrojowa 4, 32-400 Myślenice, Polska', lat: 49.8390, lng: 19.9280 },
  { placeId: 'jedzto-place-12', description: 'ul. Wysoka 7, 32-400 Myślenice, Polska', lat: 49.8410, lng: 19.9310 },
  { placeId: 'jedzto-place-13', description: 'ul. Zielona 9, 32-400 Myślenice, Polska', lat: 49.8260, lng: 19.9300 },
  { placeId: 'jedzto-place-14', description: 'ul. Niepodległości 18, 32-400 Myślenice, Polska', lat: 49.8355, lng: 19.9470 },
  { placeId: 'jedzto-place-15', description: 'Rynek 22, 32-420 Sułkowice, Polska', lat: 49.8408, lng: 19.8011 },
  { placeId: 'jedzto-place-16', description: 'ul. Krakowska 3, 32-420 Sułkowice, Polska', lat: 49.8395, lng: 19.8040 },
  { placeId: 'jedzto-place-17', description: 'ul. Klonowa 11, 32-405 Krzyszkowice, Polska', lat: 49.8180, lng: 19.9500 },
  { placeId: 'jedzto-place-18', description: 'ul. Zarabie 6, 32-400 Myślenice, Polska', lat: 49.8450, lng: 19.9550 },
  { placeId: 'jedzto-place-19', description: 'ul. Jana Pawła II 14, 32-400 Myślenice, Polska', lat: 49.8320, lng: 19.9250 },
  { placeId: 'jedzto-place-20', description: 'ul. Widokowa 2, 32-400 Myślenice, Polska', lat: 49.8470, lng: 19.9200 }
]

const norm = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const searchMockPlaces = (input) => {
  const needle = norm(input)
  if (!needle) return []
  return MOCK_PLACES.filter((place) => norm(place.description).includes(needle))
}

export const findMockPlaceById = (placeId) => MOCK_PLACES.find((place) => place.placeId === placeId) || null

const haversineDistance = (a, b) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const findNearestMockPlace = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  let nearest = null
  let nearestDistance = Infinity
  for (const place of MOCK_PLACES) {
    const distance = haversineDistance({ lat, lng }, place)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = place
    }
  }
  return nearest
}
