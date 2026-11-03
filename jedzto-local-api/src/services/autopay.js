/**
 * services/autopay.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Autopay (Blue Media) Online Payments — SHA-256 hash, start form, ITN.
 * Docs: https://developers.autopay.pl
 */

import crypto from 'crypto'
import {
  AUTOPAY_SERVICE_ID,
  AUTOPAY_SHARED_KEY,
  AUTOPAY_GATEWAY_URL,
  AUTOPAY_ENABLED
} from '../config.js'

const HASH_SEP = '|'

/** Join values in Autopay hash order and SHA-256 hex digest. */
export const autopayHash = (parts) => {
  const payload = [...parts.map((p) => String(p ?? '')), AUTOPAY_SHARED_KEY].join(HASH_SEP)
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

export const verifyAutopayHash = (parts, digest) => {
  const expected = Buffer.from(autopayHash(parts), 'utf8')
  const actual = Buffer.from(String(digest || '').trim().toLowerCase(), 'utf8')
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

/** Amount as Autopay expects: "12.50" */
export const formatAutopayAmount = (major) => {
  const n = Number(major || 0)
  if (!Number.isFinite(n) || n < 0) return '0.00'
  return n.toFixed(2)
}

/**
 * Build signed start-transaction fields (paywall redirect).
 * Hash order: ServiceID, OrderID, Amount, [Description], [Currency], [CustomerEmail]
 */
export const buildStartTransactionFields = ({
  orderId,
  amount,
  description,
  currency = 'PLN',
  customerEmail
}) => {
  if (!AUTOPAY_ENABLED) {
    throw new Error('Autopay is not configured (AUTOPAY_SERVICE_ID / AUTOPAY_SHARED_KEY)')
  }

  const fields = {
    ServiceID: String(AUTOPAY_SERVICE_ID),
    OrderID: String(orderId).slice(0, 32),
    Amount: formatAutopayAmount(amount)
  }

  const hashParts = [fields.ServiceID, fields.OrderID, fields.Amount]

  const desc = String(description || '')
    .replace(/[^\w .:\,\-]/g, ' ')
    .trim()
    .slice(0, 79)
  if (desc) {
    fields.Description = desc
    hashParts.push(desc)
  }

  const cur = String(currency || 'PLN').toUpperCase().slice(0, 3)
  fields.Currency = cur
  hashParts.push(cur)

  const email = String(customerEmail || '').trim()
  if (email && email.includes('@')) {
    fields.CustomerEmail = email.slice(0, 255)
    hashParts.push(fields.CustomerEmail)
  }

  fields.Hash = autopayHash(hashParts)
  return fields
}

export const autopayPaymentUrl = () =>
  `${String(AUTOPAY_GATEWAY_URL || 'https://testpay.autopay.eu').replace(/\/$/, '')}/payment`

/** Auto-submit HTML form that posts the customer into Autopay paywall. */
export const buildAutopayRedirectHtml = (fields) => {
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(value)}" />`
    )
    .join('\n')
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Przekierowanie do Autopay…</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#121212;color:#fff;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style>
</head><body>
<p>Przekierowanie do płatności Autopay…</p>
<form id="autopay" method="POST" action="${escapeAttr(autopayPaymentUrl())}">
${inputs}
</form>
<script>document.getElementById('autopay').submit()</script>
</body></html>`
}

const escapeAttr = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Return-URL hash: ServiceID|OrderID|key */
export const verifyReturnHash = ({ serviceID, orderID, hash }) =>
  verifyAutopayHash([serviceID, orderID], hash) &&
  String(serviceID) === String(AUTOPAY_SERVICE_ID)

const xmlTag = (xml, tag) => {
  const match = String(xml || '').match(
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  )
  return match ? match[1].trim() : ''
}

/** Decode Base64 ITN payload → transaction fields. */
export const parseItnPayload = (base64Transactions) => {
  const xml = Buffer.from(String(base64Transactions || ''), 'base64').toString('utf8')
  const serviceID = xmlTag(xml, 'serviceID')
  const orderID = xmlTag(xml, 'orderID')
  const remoteID = xmlTag(xml, 'remoteID')
  const amount = xmlTag(xml, 'amount')
  const currency = xmlTag(xml, 'currency')
  const gatewayID = xmlTag(xml, 'gatewayID')
  const paymentDate = xmlTag(xml, 'paymentDate')
  const paymentStatus = xmlTag(xml, 'paymentStatus')
  const paymentStatusDetails = xmlTag(xml, 'paymentStatusDetails')
  const hash = xmlTag(xml, 'hash')

  const hashParts = [serviceID, orderID, remoteID, amount, currency]
  if (gatewayID) hashParts.push(gatewayID)
  hashParts.push(paymentDate, paymentStatus)
  if (paymentStatusDetails) hashParts.push(paymentStatusDetails)

  const hashOk = verifyAutopayHash(hashParts, hash)

  return {
    xml,
    serviceID,
    orderID,
    remoteID,
    amount,
    currency,
    gatewayID,
    paymentDate,
    paymentStatus: String(paymentStatus || '').toUpperCase(),
    paymentStatusDetails,
    hash,
    hashOk
  }
}

/** XML confirmation response Autopay expects for ITN. */
export const buildItnResponseXml = ({ serviceID, orderID, confirmed }) => {
  const confirmation = confirmed ? 'CONFIRMED' : 'NOTCONFIRMED'
  const hash = autopayHash([serviceID, orderID, confirmation])
  return `<?xml version="1.0" encoding="UTF-8"?>
<confirmationList>
  <serviceID>${escapeXml(serviceID)}</serviceID>
  <transactionsConfirmations>
    <transactionConfirmed>
      <orderID>${escapeXml(orderID)}</orderID>
      <confirmation>${confirmation}</confirmation>
    </transactionConfirmed>
  </transactionsConfirmations>
  <hash>${hash}</hash>
</confirmationList>`
}

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
