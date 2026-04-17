import mongoose, { Schema } from 'mongoose';

export type BatchStatus =
  | 'created' | 'stored' | 'certified' | 'approved' | 'dispatched' | 'delivered' | 'recalled'
  | 'pending' | 'in_warehouse' | 'in_testing';

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
    images: [{
      url: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    }],

    status: {
      type: String,
      enum: [
        'created', 'stored', 'certified', 'approved', 'dispatched', 'delivered', 'recalled',
        // Legacy aliases kept for backward compatibility
        'pending', 'in_warehouse', 'in_testing',
      ],
      default: 'pending',
      index: true,
    },

    // ── Warehouse ────────────────────────────────────────────────────────────
    warehouseId: {
      type: String,
      index: true,
      required: function requiredWarehouseId(this: { isNew: boolean }) {
        return this.isNew;
      },
    },
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
    if (ret._id) ret.id = String(ret._id);
    delete ret._id;
    delete ret._payloadHash;
    return ret;
  },
});

export const Batch =
  mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
