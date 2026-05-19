import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  articleCount: { type: Number, default: 0 },
});

export const Category = mongoose.model('Category', categorySchema);
