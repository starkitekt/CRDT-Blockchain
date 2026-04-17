import mongoose, { Schema } from 'mongoose';

const ConsumerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    aadhaarNumber: { type: String, trim: true },
    preferences: {
      organicOnly: { type: Boolean, default: false },
      preferredRegions: [{ type: String, trim: true }],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const ConsumerProfile =
  mongoose.models.ConsumerProfile || mongoose.model('ConsumerProfile', ConsumerProfileSchema);

