import * as Yup from 'yup';

/** Accept Cloudinary URLs and local API uploads (localhost has no TLD, so Yup.url() rejects it). */
export const imageUrlSchema = (message = 'Invalid image URL') =>
  Yup.string()
    .required('Required')
    .test('image-url', message, (value) => {
      if (!value) return false;
      if (value.includes('/uploads/')) return true;
      if (value.startsWith('data:image/')) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
