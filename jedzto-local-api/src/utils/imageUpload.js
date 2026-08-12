import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { GraphQLError } from 'graphql'
import { getPublicApiBase } from './publicUrl.js'
import { CLOUDINARY_ENABLED, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config.js'

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

let cloudinaryClient = null
const getCloudinary = async () => {
  if (cloudinaryClient) return cloudinaryClient
  const { v2 } = await import('cloudinary')
  v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  })
  cloudinaryClient = v2
  return cloudinaryClient
}

const uploadToCloudinary = async (dataUrl) => {
  const cloudinary = await getCloudinary()
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: 'jedzto',
    resource_type: 'image'
  })
  return result.secure_url
}

const saveToLocalDisk = async (mime, base64Data) => {
  const ext = EXT_BY_MIME[mime.toLowerCase()] || 'jpg'
  const filename = `${uuidv4()}.${ext}`
  const filePath = path.join(UPLOADS_DIR, filename)

  await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))

  // Always advertise a phone-reachable base URL. The admin panel may call us
  // via localhost, but the mobile app cannot load http://localhost/... images.
  const base = getPublicApiBase()
  return `${base}/uploads/${filename}`
}

// Accepts a `data:<mime>;base64,<data>` string (what the admin/vendor panel's
// upload widget sends via `uploadImageToS3`). When Cloudinary is configured
// (recommended for production — most free hosts have ephemeral disks) the
// image is stored there permanently; otherwise it falls back to the local
// ./uploads folder, served via express.static (see server.js). This is a
// dev-only stand-in and images WILL be lost on redeploy on most free hosts.
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

  if (CLOUDINARY_ENABLED) {
    try {
      return await uploadToCloudinary(dataUrl)
    } catch (err) {
      console.error('[uploads] Cloudinary upload failed, falling back to local disk', err)
    }
  }

  return saveToLocalDisk(mime, base64Data)
}
