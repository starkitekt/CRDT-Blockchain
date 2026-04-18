import mongoose, { Schema } from 'mongoose';

export interface IBid {
  listingId: string;
  bidderId: string;
  bidderName: string;
  bidderRole: 'enterprise' | 'consumer' | 'admin';
  amountPaise: number;
  isWinning: boolean;
  isOutbid: boolean;
  createdAt: Date;
}

const BidSchema = new Schema<IBid>(
  {
    listingId: { type: String, required: true, index: true },
    bidderId: { type: String, required: true, index: true },
    bidderName: { type: String, required: true },
    bidderRole: {
      type: String,
      enum: ['enterprise', 'consumer', 'admin'],
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 0 },
    isWinning: { type: Boolean, default: false },
    isOutbid: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

BidSchema.index({ listingId: 1, createdAt: -1 });
BidSchema.index({ listingId: 1, amountPaise: -1 });
BidSchema.index({ bidderId: 1, createdAt: -1 });

BidSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    if (ret._id) ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Bid =
  (mongoose.models.Bid as mongoose.Model<IBid>) ||
  mongoose.model<IBid>('Bid', BidSchema);
