import { z } from 'zod';

export const CreateLabResultSchema = z.object({
  batchId:         z.string().min(1, 'batchId is required'),
  sampleId:        z.string().min(1, 'sampleId is required'),
  labId:           z.string().min(1, 'labId is required'),
  fssaiLicense:    z.string().min(1, 'fssaiLicense is required'),
  nablCert:        z.string().min(1, 'nablCert is required'),
  moisture:        z.number({ error: 'moisture must be a number' }).min(0),
  hmf:             z.number({ error: 'hmf must be a number' }).min(0),
  pollenCount:     z.number({ error: 'pollenCount must be a number' }).min(0),
  acidity:         z.number({ error: 'acidity must be a number' }).min(0),
  diastase:        z.number({ error: 'diastase must be a number' }).min(0),
  sucrose:         z.number({ error: 'sucrose must be a number' }).min(0),
  reducingSugars:  z.number({ error: 'reducingSugars must be a number' }).min(0),
  conductivity:    z.number({ error: 'conductivity must be a number' }).min(0),
  nmrScore:        z.number().optional(),
  antibioticPpb:   z.number().optional(),
  heavyMetalsMgKg: z.number().optional(),
  pesticideMgKg:   z.number().optional(),
  onChainTxHash:   z.string().optional(),
});

export type CreateLabResultInput = z.infer<typeof CreateLabResultSchema>;
