import { z } from 'zod';

export const CreateListingSchema = z.object({
  batchId: z.string().min(1, 'batchId is required'),
  reservePricePaise: z.number().int().positive(),
  bidIncrementPaise: z.number().int().positive().default(10000),
  durationMinutes: z.number().int().min(1).max(60 * 24 * 7), // up to 7 days
  notes: z.string().max(500).optional(),
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const PlaceBidSchema = z.object({
  amountPaise: z.number().int().positive(),
});
export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
