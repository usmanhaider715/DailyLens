import { deleteHeroUploadFile, extractUploadFilename } from './heroFileUpload.js';

/** Remove uploaded hero file when article is deleted or hero is replaced. */
export async function cleanupHeroUpload(heroImage) {
  if (!heroImage) return;
  const filename =
    heroImage.uploadFilename ||
    (heroImage.source === 'upload' ? extractUploadFilename(heroImage.url) : null);
  if (filename) await deleteHeroUploadFile(filename);
}

export async function cleanupReplacedHeroUpload(previousHero, nextHero) {
  if (!previousHero) return;
  const prevFile =
    previousHero.uploadFilename ||
    (previousHero.source === 'upload' ? extractUploadFilename(previousHero.url) : null);
  if (!prevFile) return;

  const nextFile =
    nextHero?.uploadFilename ||
    (nextHero?.source === 'upload' ? extractUploadFilename(nextHero?.url) : null);

  if (prevFile !== nextFile) {
    await deleteHeroUploadFile(prevFile);
  }
}
