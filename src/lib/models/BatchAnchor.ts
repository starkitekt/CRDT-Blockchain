import mongoose, { Schema } from 'mongoose';

/**
 * Per-stage on-chain anchor snapshot.
 *
 * One row per `{batchId, stage}` — captures the exact payload hashed, the
 * staged id used on-chain, the actor bound into the hash, and the tx hash.
 * Enables verifyBatchTimeline() to walk every stage and pinpoint which stage
 * (and which actor) was tampered, rather than only checking the latest.
 */
const BatchAnchorSchema = new Schema(
  {
    batchId: { type: String, required: true, index: true },
    stage: { type: String, required: true }, // canonical status: created|stored|certified|approved|dispatched|delivered|recalled
    stagedId: { type: String, required: true }, // batchId for 'created', otherwise `${batchId}#${stage}`
    bizStep: { type: String, required: true },
    dataHash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true }, // canonical payload snapshot that was hashed
    actorUserId: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    txHash: { type: String },
    anchoredAt: { type: Date, default: Date.now },
    network: { type: String },
  },
  { versionKey: false, timestamps: true }
);

BatchAnchorSchema.index({ batchId: 1, stage: 1 }, { unique: true });

export const BatchAnchor =
  mongoose.models.BatchAnchor || mongoose.model('BatchAnchor', BatchAnchorSchema);
