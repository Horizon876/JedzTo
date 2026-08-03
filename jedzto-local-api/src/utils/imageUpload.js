import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { GraphQLError } from 'graphql'
import { getPublicApiBase } from './publicUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

// Max upload size: 5 MB (base64 encoded). A base64 string is ~1.37× the
// original binary size, so 6.85 MB of base64 ≈ 5 MB of image data.
const MAX_IMAGE_BYTES_BASE64 = Math.ceil(5 * 1024 * 1024 * 1.37)

// Accepts a `data:<mime>;base64,<data>` string (what the admin/vendor panel's
// upload widget sends via `uploadImageToS3`) and stores it under
// jedzto-local-api/uploads/, serving it back via express.static (see
// server.js). No real S3 involved — this is a local-dev stand-in.
export const saveBase64Image = async (dataUrl, req) => {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) {
    throw new GraphQLError('Invalid image payload — expected a base64 data URL')
  }

  const [, mime, base64Data] = match

  // Reject oversized payloads before allocating any buffer — prevents DoS.
  if (base64Data.length > MAX_IMAGE_BYTES_BASE64) {
    throw new GraphQLError('Image too large — maximum size is 5 MB')
  }

  const ext = EXT_BY_MIME[mime.toLowerCase()] || 'jpg'
  const filename = `${uuidv4()}.${ext}`
  const filePath = path.join(UPLOADS_DIR, filename)

  await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))

  // Always advertise a phone-reachable base URL. The admin panel may call us
  // via localhost, but the mobile app cannot load http://localhost/... images.
  const base = getPublicApiBase()
  return `${base}/uploads/${filename}`
}
