import OpenAI from 'openai';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { configureCloudinary } from '../config/cloudinary.js';
import { retry } from '../utils/retry.js';

const openai = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

function unsplashFallback(category) {
  const c = encodeURIComponent(category || 'news');
  return `https://source.unsplash.com/1200x630/?${c}`;
}

export async function generateAndUploadImage(imagePrompt, articleSlug, opts = {}) {
  const { originalImageUrl, category } = opts;
  const suffix =
    ' Photorealistic, professional news photography style, no text overlays, high resolution';
  const fullPrompt = `${imagePrompt || 'News editorial hero image'}${suffix}`;

  configureCloudinary();
  const hasCloud =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (process.env.OPENAI_API_KEY) {
    try {
      const img = await retry(
        () =>
          openai().images.generate({
            model: 'dall-e-3',
            prompt: fullPrompt.slice(0, 3900),
            size: '1792x1024',
            quality: 'standard',
            n: 1,
          }),
        3
      );
      const url = img.data[0]?.url;
      if (url && hasCloud) {
        const resp = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(resp.data);
        const uploaded = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'newssite/heroes',
                public_id: articleSlug,
                overwrite: true,
                transformation: [{ width: 1200, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
              },
              (err, result) => (err ? reject(err) : resolve(result))
            )
            .end(buffer);
        });
        return {
          url: uploaded.secure_url,
          cloudinaryId: uploaded.public_id,
          alt: (imagePrompt || 'News hero').slice(0, 160),
          source: 'generated',
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (originalImageUrl) {
    return {
      url: originalImageUrl,
      cloudinaryId: undefined,
      alt: (imagePrompt || 'News hero').slice(0, 160),
      source: 'original',
    };
  }

  return {
    url: unsplashFallback(category),
    cloudinaryId: undefined,
    alt: (imagePrompt || 'News hero').slice(0, 160),
    source: 'placeholder',
  };
}

/** Upload hero from base64 data URL (e.g. Puter.js client generation). */
export async function uploadHeroFromDataUrl(dataUrl, articleSlug, alt = 'News hero') {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    throw new Error('Invalid image data URL');
  }

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  configureCloudinary();
  const hasCloud =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloud) {
    return {
      url: dataUrl,
      cloudinaryId: undefined,
      alt: alt.slice(0, 160),
      source: 'generated',
    };
  }

  const slug = (articleSlug || 'hero').replace(/[^a-z0-9-]/gi, '-').slice(0, 80);
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'newssite/heroes',
          public_id: slug,
          overwrite: true,
          transformation: [{ width: 1200, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });

  return {
    url: uploaded.secure_url,
    cloudinaryId: uploaded.public_id,
    alt: alt.slice(0, 160),
    source: 'generated',
  };
}
