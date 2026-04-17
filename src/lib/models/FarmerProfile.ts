import mongoose, { Schema } from 'mongoose';

const FarmerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    kisanCard: { type: String, trim: true },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    farmLocation: {
      village: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      geo: {
        type: [Number],
        default: undefined,
        validate: {
          validator: (arr: number[] | undefined) => !arr || arr.length === 0 || arr.length === 2,
          message: 'geo must be [lat, lng]',
        },
      },
    },
    honeyProductionCapacity: { type: Number, min: 0 },
    organicCertified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const FarmerProfile =
  mongoose.models.FarmerProfile || mongoose.model('FarmerProfile', FarmerProfileSchema);
