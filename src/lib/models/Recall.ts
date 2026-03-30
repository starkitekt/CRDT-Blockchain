import mongoose, { Schema } from 'mongoose';

const RecallSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    batchId: { type: String, required: true, index: true },
    tier: { type: Number, required: true, enum: [1, 2, 3] },
    reason: { type: String, required: true },
    affectedKg: { type: Number, required: true },
    initiatedBy: { type: String, required: true },
    initiatedAt: { type: String, required: true },
    onChainTxHash: { type: String },
  },
  { id: false, versionKey: false }
);

RecallSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret._id = undefined;
    return ret;
  },
});




export const Recall =
  mongoose.models.Recall || mongoose.model('Recall', RecallSchema);
