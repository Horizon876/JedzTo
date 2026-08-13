/**
 * Google Business profile ↔ JedzTo restaurant mapping.
 *
 * Full live sync needs Places API (GOOGLE_PLACES_API_KEY). Until then we
 * keep a curated snapshot of rating + featured reviews from the public
 * Google profile so the customer app can show real social proof.
 *
 * Source: https://share.google/xrwMtdOyP0tQuLmjV
 * Knowledge Graph: /g/11p0x740g9 — Pizza Italiana, Południowa 60, Jawornik
 */

export const GOOGLE_PLACE_PROFILES = {
  // Production / seeded Pizzeria Italiana
  '6a7c8fff9dae5d65f04aeaf6': {
    name: 'Pizza Italiana',
    googleShareUrl: 'https://share.google/xrwMtdOyP0tQuLmjV',
    googleKgmid: '/g/11p0x740g9',
    googleMapsQuery: 'Pizza Italiana Południowa 60 Jawornik',
    rating: 4.7,
    total: 509,
    reviews: [
      {
        author: 'Lukas Liszka',
        rating: 5,
        text:
          'Rewelacyjna pizza, wyróżniająca się jakością i smakiem. Świetne ciasto (fantastyczne brzegi) i smaczne, dobrej jakości składniki. Bardzo dobra kawa.',
        relativeTime: 'niedawno'
      },
      {
        author: 'Maciej Kiszka',
        rating: 5,
        text:
          'Pizza smakuje wyśmienicie jak za każdym razem gdy odwiedzamy to miejsce, pierwszy raz próbowałem tutaj bułę z szarpaną wieprzowiną i również jest bardzo dobra.',
        relativeTime: 'niedawno'
      },
      {
        author: 'Wojciech Ochendóżka',
        rating: 5,
        text:
          'Pizzę jadłem już kilka razy, a teraz przyszła pora na test innych pozycji. Buła, sałatka i drinki na wysokim poziomie. Obsługa bardzo miła i otwarta na swoich klientów.',
        relativeTime: 'niedawno'
      }
    ]
  }
}

/** Match by exact name when ObjectId is unknown (local seeds). */
export const GOOGLE_PLACE_BY_NAME = {
  'Pizzeria Italiana': '6a7c8fff9dae5d65f04aeaf6',
  'Pizza Italiana': '6a7c8fff9dae5d65f04aeaf6'
}
