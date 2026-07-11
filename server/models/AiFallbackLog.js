import mongoose from 'mongoose';

const aiFallbackLogSchema = new mongoose.Schema(
  {
    primaryProvider: { type: String, required: true },
    fallbackProvider: { type: String, required: true },
    reason: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    articleTitle: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

aiFallbackLogSchema.index({ createdAt: -1 });

export const AiFallbackLog = mongoose.model('AiFallbackLog', aiFallbackLogSchema);

export async function logAiFallback({
  primaryProvider,
  fallbackProvider,
  reason,
  errorMessage,
  articleTitle,
  sourceUrl,
}) {
  try {
    await AiFallbackLog.create({
      primaryProvider,
      fallbackProvider,
      reason,
      errorMessage: String(errorMessage || '').slice(0, 500),
      articleTitle: String(articleTitle || '').slice(0, 200),
      sourceUrl: String(sourceUrl || '').slice(0, 500),
    });
  } catch {
    /* non-blocking */
  }
}
