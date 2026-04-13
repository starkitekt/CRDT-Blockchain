import mongoose, { Schema } from 'mongoose';

export type BatchStatus =
  | 'pending' | 'in_warehouse' | 'in_testing'
  | 'certified' | 'dispatched' | 'recalled';

const BatchSchema = new Schema(
  {
    // ── Core ────────────────────────────────────────────────────────────────
    batchId: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    floraType: { type: String, required: true },
    weightKg: { type: Number, required: true },
    moisturePct: { type: Number, required: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    grade: { type: String, enum: ['A', 'B'], required: true },
    harvestDate: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'in_warehouse', 'in_testing', 'certified', 'dispatched', 'recalled'],
      default: 'pending',
      index: true,
    },

    // ── Warehouse ────────────────────────────────────────────────────────────
    warehouseId: { type: String, index: true },
    warehouseReceivedAt: { type: Date },
    warehouseNotes: { type: String },

    // ── Lab ──────────────────────────────────────────────────────────────────
    labId: { type: String, index: true },
    labSubmittedAt: { type: Date },
    labReportId: { type: String },
    labCertifiedAt: { type: Date },
    labResults: {
      moisture: { type: Number },
      hmf: { type: Number },
      antibiotics: { type: Boolean },
      pesticides: { type: Boolean },
      passed: { type: Boolean },
    },

    // ── Dispatch ──────────────────────────────────────────────────────────────
    dispatchedAt: { type: Date },
    destinationEnterprise: { type: String },
    invoiceNo: { type: String },

    // ── Blockchain ───────────────────────────────────────────────────────────
    onChainTxHash: { type: String },
    onChainDataHash: { type: String },
    blockchainAnchoredAt: { type: Date },
    blockchainNetwork: { type: String },
    _payloadHash: { type: String, index: true, sparse: true },

    // ── Recall ───────────────────────────────────────────────────────────────
    recallReason: { type: String },
    recallTier: { type: Number, enum: [1, 2, 3] },
    recallInitiatedAt: { type: Date },
    recallTxHash: { type: String },
    recallInitiatedBy: { type: String },
  },
  {
    id: false,
    versionKey: false,
    timestamps: true,  // createdAt + updatedAt as Date
  }
);

BatchSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret._payloadHash;
    return ret;
  },
});

export const Batch =
  mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
