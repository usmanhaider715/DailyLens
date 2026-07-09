import multer from 'multer';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export const heroUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const mime = file.mimetype?.toLowerCase();
    if (mime && ALLOWED.has(mime)) cb(null, true);
    else if (mime === 'image/heic' || mime === 'image/heif') {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only JPEG, PNG, WebP, GIF, AVIF, or HEIC images are allowed'), { status: 400 }));
    }
  },
}).single('image');
