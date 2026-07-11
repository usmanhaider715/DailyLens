import mongoose from 'mongoose';

const redirectSchema = new mongoose.Schema(
  {
    fromPath: { type: String, required: true, unique: true, index: true },
    toPath: { type: String, required: true },
    statusCode: { type: Number, default: 301 },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
);

export const ArticleRedirect = mongoose.model('ArticleRedirect', redirectSchema);
