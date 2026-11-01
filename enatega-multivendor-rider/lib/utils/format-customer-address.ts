/**
 * Polish delivery address for kitchen UI / printer.
 * Order: miejscowość, kod pocztowy, ulica + numer.
 * Drops country / voivodeship noise ("Lesser Poland", "Polska", …).
 */

const JUNK =
  /^(polska|poland|republic of poland)$|lesser\s*poland|voivodeship|wojew[oó]dztwo|^woj\.?\b|ma[lł]opolsk|śląsk|mazowieck|pomorsk|wielkopolsk|podkarpac|świętokrzysk|lubelsk|podlask|warmińsk|zachodniopomorsk|kujawsk|łódzk|opolsk/i

const POSTCODE = /^\d{2}-\d{3}$/
const POSTCODE_IN = /^(\d{2}-\d{3})\s+(.+)$/

export function formatCustomerAddress(raw: unknown): string {
  const parts = String(raw ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((part) => !JUNK.test(part.trim()))

  if (!parts.length) return ''

  let postcode: string | null = null
  let city: string | null = null
  const rest: string[] = []

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

  return [city, postcode, rest.join(', ')].filter(Boolean).join(', ')
}
