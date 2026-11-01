import { printSunmiText } from '../../modules/sunmi-inner-printer'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import { formatCustomerAddress } from '@/lib/utils/format-customer-address'

const WIDTH = 28
/** Full-width rules were 32 chars; drop 5 so they fit one line at font 28. */
const RULE_LEN = 27

const ascii = (value: unknown) =>
  String(value ?? '')
    .replace(/[ąćęłńóśźż]/g, (ch) => {
      const map: Record<string, string> = {
        ą: 'a',
        ć: 'c',
        ę: 'e',
        ł: 'l',
        ń: 'n',
        ó: 'o',
        ś: 's',
        ź: 'z',
        ż: 'z',
      }
      return map[ch] ?? ch
    })
    .replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (ch) => {
      const map: Record<string, string> = {
        Ą: 'A',
        Ć: 'C',
        Ę: 'E',
        Ł: 'L',
        Ń: 'N',
        Ó: 'O',
        Ś: 'S',
        Ź: 'Z',
        Ż: 'Z',
      }
      return map[ch] ?? ch
    })
    .replace(/zł/gi, 'zl')
    .trim()

const rule = (ch = '-') => ch.repeat(RULE_LEN)

const money = (value: unknown) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return `${n.toFixed(2).replace('.', ',')} zl`
}

/** Wrap text to printer width, breaking on spaces when possible. */
function wrapLines(text: string, width = WIDTH): string[] {
  const clean = ascii(text)
  if (!clean) return []
  const words = clean.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const word of words) {
    if (word.length > width) {
      if (line) {
        out.push(line)
        line = ''
      }
      for (let i = 0; i < word.length; i += width) {
        out.push(word.slice(i, i + width))
      }
      continue
    }
    const next = line ? `${line} ${word}` : word
    if (next.length <= width) {
      line = next
    } else {
      out.push(line)
      line = word
    }
  }
  if (line) out.push(line)
  return out
}

type OrderItem = IOrder['items'][number] & {
  specialInstructions?: string
  addons?: Array<{
    title?: string
    options?: Array<{ title?: string }>
  }>
}

function paymentBanner(order: IOrder): string {
  const method = String(order.paymentMethod || '').toUpperCase()
  if (method === 'COD') return 'GOTOWKA'
  return 'OPLACONE'
}

function formatKitchenTicket(
  order: IOrder,
  eta?: { preparationEtaMinutes?: number; deliveryEtaMinutes?: number }
): { banner: string; body: string } {
  const orderNo = ascii(order.orderId || order._id?.slice(-6) || '')
  const when = order.createdAt ? new Date(order.createdAt) : new Date()
  // Always Poland local time — Sunmi device TZ is often wrong (shows 1h behind).
  const clock = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        hour12: false,
      })
  const pickup = Boolean(order.isPickedUp)
  const etaMins = Math.round(
    Number(eta?.preparationEtaMinutes ?? order.preparationEtaMinutes ?? 0) +
      Number(eta?.deliveryEtaMinutes ?? 0)
  )

  const lines: string[] = [
    rule('='),
    `ZAMOWIENIE #${orderNo}`,
  ]
  if (clock) lines.push(clock)
  lines.push(pickup ? 'ODBIOR OSOBISTY' : 'DOSTAWA')
  if (etaMins > 0) {
    lines.push(`CZAS REALIZACJI: ${etaMins} min`)
  }

  // Separator between header and customer block.
  lines.push(rule('-'))

  if (order.user?.name) {
    lines.push(...wrapLines(`Klient: ${order.user.name}`))
  }
  if (order.user?.phone) {
    lines.push(...wrapLines(`Tel: ${order.user.phone}`))
  }
  if (!pickup) {
    const address = formatCustomerAddress(
      order.deliveryAddress?.deliveryAddress || ''
    )
    const details = order.deliveryAddress?.details || ''
    if (address) lines.push(...wrapLines(`Adres: ${address}`))
    if (details) lines.push(...wrapLines(details))
  }

  lines.push(rule('-'))

  for (const item of (order.items || []) as OrderItem[]) {
    const qty = Number(item.quantity) || 1
    const title = ascii(item.title || 'Pozycja')
    lines.push(...wrapLines(`${qty}x ${title}`))
    if (item.variation?.title) {
      lines.push(...wrapLines(`  ${item.variation.title}`))
    }
    for (const addon of item.addons || []) {
      for (const option of addon.options || []) {
        if (option?.title) lines.push(...wrapLines(`  + ${option.title}`))
      }
    }
    if (item.specialInstructions) {
      lines.push(...wrapLines(`  UWAGA: ${item.specialInstructions}`))
    }
  }

  lines.push(rule('-'))
  if (order.orderAmount != null) {
    // Compact — no left/right pad so SUMA stays on one line.
    lines.push(`SUMA: ${money(order.orderAmount)}`)
  }
  if (order.instructions) {
    lines.push(...wrapLines(`UWAGI: ${order.instructions}`))
  }
  lines.push(rule('='))
  // Extra advance after the closing === so the cut clears cleanly.
  lines.push('')
  lines.push('')
  lines.push('')

  return {
    banner: paymentBanner(order),
    body: lines.join('\n') + '\n',
  }
}

export async function printKitchenTicket(
  order: IOrder | undefined | null,
  eta?: { preparationEtaMinutes?: number; deliveryEtaMinutes?: number }
): Promise<void> {
  if (!order) return
  try {
    const ticket = formatKitchenTicket(order, eta)
    await printSunmiText(ticket.body, ticket.banner)
  } catch {
    // Accept must still succeed if the printer is busy or missing.
  }
}
