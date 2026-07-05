import axios from 'axios';
import { isUsableImageUrl } from '../utils/heroImageUtils.js';
import { assertPublicHttpUrl } from '../utils/ssrfGuard.js';
import { saveCompressedHeroFile, heroUploadPublicUrl } from '../utils/heroFileUpload.js';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export async function proxyHeroImage(req, res, next) {
  try {
    let raw = req.query.url;
    if (Array.isArray(raw)) raw = raw[0];
    if (typeof raw !== 'string' || !raw.trim()) {
      return res.status(400).json({ message: 'Invalid image URL' });
    }
    try {
      raw = decodeURIComponent(raw.trim());
    } catch {
      raw = raw.trim();
    }

    if (!isUsableImageUrl(raw)) {
      return res.status(400).json({ message: 'Invalid image URL' });
    }

    await assertPublicHttpUrl(raw);

    const target = new URL(raw);
    const response = await axios.get(target.href, {
      responseType: 'stream',
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DailyLens/1.0; +https://thedailylens.space) AppleWebKit/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: `${target.protocol}//${target.host}/`,
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const type = response.headers['content-type']?.split(';')[0]?.trim() || 'image/jpeg';
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(415).json({ message: 'Unsupported image type' });
    }

    res.set('Content-Type', type);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.set('X-Content-Type-Options', 'nosniff');
    response.data.pipe(res);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: 'Invalid image URL' });
    if (e.response?.status === 404) return res.status(404).end();
    if (e.code === 'ERR_INVALID_URL') return res.status(400).json({ message: 'Invalid image URL' });
    next(e);
  }
}

export async function uploadHeroImage(req, res, next) {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const slugHint = req.body?.slug || req.body?.title || 'hero';
    const { filename, bytes } = await saveCompressedHeroFile(req.file.buffer, { slugHint });
    const url = heroUploadPublicUrl(filename);

    res.status(201).json({
      url,
      filename,
      bytes,
      alt: String(req.body?.alt || req.body?.title || 'Article hero image').slice(0, 160),
      credit: req.body?.credit || 'Uploaded image',
      creditUrl: '',
      source: 'upload',
    });
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
}
