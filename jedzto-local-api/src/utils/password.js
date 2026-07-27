import crypto from 'crypto'

const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%*?'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

const randomChar = (charset) => charset[crypto.randomInt(0, charset.length)]

// Generates a random, human-typeable temporary password that always
// contains at least one lowercase, uppercase, digit and symbol character.
// Returned once in the createRestaurant response — never persisted or
// logged in plaintext anywhere else.
export const generateTemporaryPassword = (length = 12) => {
  const required = [randomChar(LOWER), randomChar(UPPER), randomChar(DIGITS), randomChar(SYMBOLS)]
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => randomChar(ALL))
  const chars = [...required, ...rest]

  // Fisher-Yates shuffle so the required characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
