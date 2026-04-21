import mongoose, { Schema } from 'mongoose';

export type ListingStatus = 'live' | 'settled' | 'cancelled' | 'unsold';

export interface IListing {
  listingId: string;            // MK-YYYYMMDD-NNN
  batchId: string;              // links to Batch.batchId
  farmerId: string;
  farmerName: string;
  warehouseId: string;
  warehouseName: string;

  weightKg: number;
  floraType: string;
  grade: 'A' | 'B';

  // Pricing — all monetary values stored in paise (1 INR = 100 paise) to avoid float drift
  reservePricePaise: number;
  currentPricePaise: number;
  bidIncrementPaise: number;
  storageRatePerKgPerDayPaise: number;
  storageStartAt: Date;             // typically batch.warehouseReceivedAt
  storageCostPaise: number;         // accrued at settlement; recomputed live for display

  bidCount: number;
  highestBidderId?: string;
  highestBidderName?: string;
  highestBidderRole?: string;

  startsAt: Date;
  endsAt: Date;
  antiSnipeWindowSec: number;       // extend endsAt if a bid arrives within this window
  antiSnipeExtendSec: number;       // amount to extend by

  status: ListingStatus;
  settledAt?: Date;
  settlementTxHash?: string;        // on-chain anchor of settlement
  settlementDataHash?: string;
  netToFarmerPaise?: number;        // currentPrice - storageCost
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    listingId: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, index: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    warehouseId: { type: String, required: true, index: true },
    warehouseName: { type: String, required: true },

    weightKg: { type: Number, required: true, min: 0 },
    floraType: { type: String, required: true },
    grade: { type: String, enum: ['A', 'B'], required: true },

    reservePricePaise: { type: Number, required: true, min: 0 },
    currentPricePaise: { type: Number, required: true, min: 0 },
    bidIncrementPaise: { type: Number, required: true, min: 1 },
    storageRatePerKgPerDayPaise: { type: Number, required: true, min: 0 },
    storageStartAt: { type: Date, required: true },
    storageCostPaise: { type: Number, required: true, min: 0, default: 0 },

    bidCount: { type: Number, default: 0, min: 0 },
    highestBidderId: { type: String },
    highestBidderName: { type: String },
    highestBidderRole: { type: String },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    antiSnipeWindowSec: { type: Number, default: 60, min: 0 },
    antiSnipeExtendSec: { type: Number, default: 60, min: 0 },

    status: {
      type: String,
      enum: ['live', 'settled', 'cancelled', 'unsold'],
      default: 'live',
      required: true,
      index: true,
    },
    settledAt: { type: Date },
    settlementTxHash: { type: String },
    settlementDataHash: { type: String },
    netToFarmerPaise: { type: Number },
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

ListingSchema.index({ status: 1, endsAt: 1 });
ListingSchema.index({ farmerId: 1, status: 1 });
ListingSchema.index({ warehouseId: 1, status: 1 });

ListingSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    if (ret._id) ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Listing =
  (mongoose.models.Listing as mongoose.Model<IListing>) ||
  mongoose.model<IListing>('Listing', ListingSchema);
