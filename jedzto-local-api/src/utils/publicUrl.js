import os from 'os'
import { PORT } from '../config.js'

const guessLanIp = () => {
  const nets = os.networkInterfaces()
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      const family = String(net.family)
      if ((family === 'IPv4' || family === '4') && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

// Phones cannot reach "localhost" on the developer's PC. Prefer an explicit
 // PUBLIC_API_URL, otherwise advertise the machine's LAN IP.
export const getPublicApiBase = () => {
  const fromEnv = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return `http://${guessLanIp()}:${PORT}`
}

export const rewriteUploadUrl = (url) => {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('/uploads/')) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const base = getPublicApiBase()
      return `${base}${parsed.pathname}${parsed.search}`
    }
  } catch {
    // leave as-is
  }
  return url
}

export const rewriteUploadUrlsDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(rewriteUploadUrlsDeep)
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, child] of Object.entries(value)) {
      if (key === 'image' || key === 'logo' || key === 'imageUrl') {
        out[key] = rewriteUploadUrl(child)
      } else {
        out[key] = rewriteUploadUrlsDeep(child)
      }
    }
    return out
  }
  return value
}
