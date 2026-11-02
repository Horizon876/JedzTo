/**
 * services/smsapi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin client for SMSAPI.pl single-SMS send (https://api.smsapi.pl/sms.do).
 * Credentials come from env — never hard-code tokens here.
 */

import {
  SMSAPI_TOKEN,
  SMSAPI_FROM,
  SMSAPI_ENABLED,
  SMSAPI_TEST
} from '../config.js'
import { normalizePhone } from '../utils/phone.js'

const SMSAPI_URL = 'https://api.smsapi.pl/sms.do'

/** SMSAPI expects 48xxxxxxxxx (no + / spaces). */
export const toSmsApiNumber = (phone) => {
  const normalized = normalizePhone(phone)
  const digits = String(normalized || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 9) return `48${digits}`
  return digits
}

/**
 * Sends one SMS. Returns { ok, id?, error?, message? }.
 * When SMSAPI is not configured, returns { ok: false, skipped: true }.
 */
export const sendSms = async ({ to, message }) => {
  if (!SMSAPI_ENABLED) {
    return { ok: false, skipped: true, message: 'SMSAPI not configured' }
  }

  const number = toSmsApiNumber(to)
  if (!number) {
    return { ok: false, error: 'invalid_to', message: 'Invalid phone number' }
  }

  const body = new URLSearchParams()
  body.set('to', number)
  body.set('from', SMSAPI_FROM)
  body.set('message', String(message || ''))
  body.set('format', 'json')
  body.set('encoding', 'utf-8')
  body.set('normalize', '1')
  if (SMSAPI_TEST) body.set('test', '1')

  let response
  try {
    response = await fetch(SMSAPI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMSAPI_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })
  } catch (err) {
    return {
      ok: false,
      error: 'network',
      message: err?.message || 'SMSAPI network error'
    }
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    return {
      ok: false,
      error: 'invalid_response',
      message: `SMSAPI HTTP ${response.status}`
    }
  }

  if (data?.error != null) {
    return {
      ok: false,
      error: String(data.error),
      message: data.message || 'SMSAPI error',
      invalidNumbers: data.invalid_numbers
    }
  }

  const first = Array.isArray(data?.list) ? data.list[0] : null
  return {
    ok: true,
    id: first?.id || null,
    points: first?.points,
    status: first?.status,
    number: first?.number || number
  }
}

/** OTP SMS body — kept short; normalize=1 strips diacritics for GSM-7. */
export const buildOtpSmsMessage = (code) =>
  `JedzTo: Twoj kod weryfikacyjny to ${code}. Nie podawaj go nikomu.`
