import mongoose, { Schema } from 'mongoose';

export type BatchStatus =
  | 'pending' | 'in_warehouse' | 'in_testing'
  | 'certified' | 'dispatched' | 'recalled';

const BatchSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    floraType: { type: String, required: true },
    weightKg: { type: Number, required: true },
    moisturePct: { type: Number, required: true },
    latitude: { type: String, required: true },   // ← String, not Number
    longitude: { type: String, required: true },   // ← String, not Number
    grade: { type: String, enum: ['A', 'B'], required: true }, // ← A|B only
    harvestDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_warehouse', 'in_testing', 'certified', 'dispatched', 'recalled'],
      default: 'pending',
      index: true,
    },
    onChainTxHash: { type: String },
    createdAt: { type: String, required: true },
    _payloadHash: { type: String, index: true, sparse: true },
  },
  { id: false, versionKey: false }
);

BatchSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret._id = undefined;
    ret._payloadHash = undefined;
    return ret;
  },
});



export const Batch =
  mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
