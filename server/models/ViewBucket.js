import mongoose from 'mongoose';

const viewBucketSchema = new mongoose.Schema(
  {
    /** Hour: YYYY-MM-DD-HH · Day: YYYY-MM-DD · suffixed: YYYY-MM-DD:news | :evergreen */
    bucketKey: { type: String, required: true, index: true },
    granularity: { type: String, enum: ['hour', 'day'], required: true, index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

viewBucketSchema.index({ granularity: 1, bucketKey: 1 }, { unique: true });

export const ViewBucket = mongoose.model('ViewBucket', viewBucketSchema);
