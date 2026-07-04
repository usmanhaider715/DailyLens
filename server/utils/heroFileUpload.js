import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'heroes');
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

function safeSlug(input = '') {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function saveCompressedHeroFile(buffer, { slugHint = 'hero' } = {}) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const base = safeSlug(slugHint) || 'hero';
  const filename = `${base}-${Date.now().toString(36)}.webp`;
  const outPath = path.join(UPLOAD_DIR, filename);

  const compressed = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  await fs.writeFile(outPath, compressed);

  return {
    filename,
    bytes: compressed.length,
    path: outPath,
  };
}

export function heroUploadPublicUrl(filename) {
  return `/uploads/heroes/${filename}`;
}

export function extractUploadFilename(url) {
  const m = String(url || '').match(/\/uploads\/heroes\/([^/?#]+)/i);
  return m?.[1] || null;
}

export async function deleteHeroUploadFile(filenameOrUrl) {
  const name =
    filenameOrUrl && String(filenameOrUrl).includes('/')
      ? extractUploadFilename(filenameOrUrl)
      : filenameOrUrl;
  if (!name || !/^[\w.-]+\.webp$/i.test(name)) return false;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, name));
    return true;
  } catch {
    return false;
  }
}

export function getHeroUploadDir() {
  return UPLOAD_DIR;
}
