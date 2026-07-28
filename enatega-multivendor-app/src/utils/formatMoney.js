/**
 * Polish-style money: 32,00zł (amount first, comma decimals, symbol after).
 */
export function formatMoney(value, currencySymbol = 'zł', { decimals = 2 } = {}) {
  const amount = Number(value)
  const safe = Number.isFinite(amount) ? amount : 0
  const formatted = safe.toFixed(decimals).replace('.', ',')
  const symbol = currencySymbol || 'zł'
  return `${formatted}${symbol}`
}

export default formatMoney
