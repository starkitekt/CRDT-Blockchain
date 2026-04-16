import { z } from 'zod';

export const CreateBatchSchema = z.object({
  farmerId: z.string().min(1, 'farmerId is required'),
  farmerName: z.string().min(1, 'farmerName is required'),
  floraType: z.string().min(1, 'floraType is required'),
  weightKg: z.number({ error: 'weightKg must be a number' })
    .positive('weightKg must be positive'),
  moisturePct: z.number({ error: 'moisturePct must be a number' })
    .min(0).max(100),
  latitude: z.string().min(1, 'latitude is required'),   // ← String
  longitude: z.string().min(1, 'longitude is required'),  // ← String
  grade: z.enum(['A', 'B'], { error: 'grade must be A or B' }), // ← A|B only
  harvestDate: z.string().min(1, 'harvestDate is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  images: z.array(
    z.object({
      url: z.string().min(1),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
    })
  ).optional(),
  onChainTxHash: z.string().optional(),
});

// Only these fields are patchable — immutable fields are excluded
export const PatchBatchSchema = z.object({
  status: z.enum([
    'created', 'stored', 'certified', 'approved', 'dispatched', 'delivered', 'recalled',
    // Legacy aliases kept for backward compatibility
    'pending', 'in_warehouse', 'in_testing',
  ]).optional(),
  onChainTxHash: z.string().optional(),
  weightKg: z.number().positive().optional(),
  moisturePct: z.number().min(0).max(100).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  grade: z.enum(['A', 'B']).optional(),
  warehouseReceivedAt: z.string().optional(),
  dispatchedAt: z.string().optional(),
  destinationEnterprise: z.string().optional(),
  invoiceNo: z.string().optional(),
}).strict();

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
export type PatchBatchInput = z.infer<typeof PatchBatchSchema>;

