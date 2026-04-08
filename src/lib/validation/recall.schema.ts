import { z } from 'zod';

export const CreateRecallSchema = z.object({
  batchId:      z.string().min(1, 'batchId is required'),
  tier:         z.union([
                  z.literal(1),
                  z.literal(2),
                  z.literal(3)
                ], { error: 'tier must be 1, 2, or 3' }),
  reason:       z.string().min(1, 'reason is required'),
  affectedKg:   z.number({ error: 'affectedKg must be a number' })
                 .positive('affectedKg must be positive'),
  initiatedBy: z.string().optional(),
  onChainTxHash:z.string().optional(),
});

export type CreateRecallInput = z.infer<typeof CreateRecallSchema>;
