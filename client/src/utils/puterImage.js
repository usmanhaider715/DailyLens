const PUTER_SCRIPT = 'https://js.puter.com/v2/';
const DEFAULT_MODEL = 'black-forest-labs/flux-1.1-pro';

let scriptPromise = null;

function loadPuter() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if (window.puter?.ai?.txt2img) return Promise.resolve(window.puter);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PUTER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.puter));
      existing.addEventListener('error', () => reject(new Error('Puter.js failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = PUTER_SCRIPT;
    s.async = true;
    s.onload = () => {
      if (window.puter?.ai?.txt2img) resolve(window.puter);
      else reject(new Error('Puter AI not available'));
    };
    s.onerror = () => reject(new Error('Could not load Puter.js'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/jpeg', 0.92);
}

function imgToDataUrl(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 1200;
  canvas.height = img.naturalHeight || img.height || 630;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Generate a hero image via Puter.js (user-pays model).
 * @returns {Promise<string>} data URL for upload
 */
export async function generateHeroWithPuter(prompt, onStatus) {
  onStatus?.('Loading image AI…');
  const puter = await loadPuter();
  const fullPrompt = `${prompt}. Photorealistic professional news photography, no text overlays, editorial hero image.`;

  onStatus?.('Generating image (this may take a minute)…');
  const result = await puter.ai.txt2img(fullPrompt, {
    model: DEFAULT_MODEL,
    quality: 'high',
  });

  if (result instanceof HTMLCanvasElement) {
    return canvasToDataUrl(result);
  }
  if (result instanceof HTMLImageElement) {
    if (!result.complete) {
      await new Promise((res, rej) => {
        result.onload = res;
        result.onerror = () => rej(new Error('Image load failed'));
      });
    }
    return imgToDataUrl(result);
  }
  if (typeof result === 'string' && result.startsWith('data:')) {
    return result;
  }
  if (typeof result === 'string' && (result.startsWith('http') || result.startsWith('blob:'))) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = result;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('Could not load generated image'));
    });
    return imgToDataUrl(img);
  }

  throw new Error('Unexpected Puter image response');
}
