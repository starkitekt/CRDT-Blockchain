/**
 * In-memory data store for development.
 * Replace each Map with a real DB (Prisma + PostgreSQL / MongoDB) for production.
 */
import type { User } from '@/types';

export interface Batch {
  id: string;               // GS1-compatible: HT-YYYYMMDD-NNN
  farmerId: string;
  farmerName: string;
  floraType: string;
  weightKg: number;
  moisturePct: number;
  latitude: string;
  longitude: string;
  grade: 'A' | 'B';
  harvestDate: string;      // ISO date string
  /** Batch lifecycle: harvested → in_warehouse → in_testing → certified → dispatched | recalled */
  status: 'pending' | 'in_warehouse' | 'in_testing' | 'certified' | 'dispatched' | 'recalled';
  onChainTxHash?: string;
  createdAt: string;
}

export interface LabResult {
  batchId: string;
  sampleId: string;
  labId: string;
  fssaiLicense: string;
  nablCert: string;
  moisture: number;
  hmf: number;
  pollenCount: number;
  acidity: number;
  diastase: number;
  sucrose: number;
  reducingSugars: number;
  conductivity: number;
  nmrScore?: number;
  antibioticPpb?: number;
  heavyMetalsMgKg?: number;
  pesticideMgKg?: number;
  publishedAt?: string;
  onChainTxHash?: string;
}

export interface RecallEvent {
  id: string;
  batchId: string;
  tier: 1 | 2 | 3;
  reason: string;
  affectedKg: number;
  initiatedBy: string;
  initiatedAt: string;
  onChainTxHash?: string;
}

// Re-export User so API routes can import from one place if needed
export type { User };

// --- In-memory stores (module-level singletons) ---

// Monotonic counter for batch ID sequencing — survives deletes (unlike Map.size)
let _batchSeq = 0;
export function getNextBatchSeq(): string {
  _batchSeq++;
  return String(_batchSeq).padStart(3, '0');
}

export const batches = new Map<string, Batch>([
  ['HT-20240310-001', {
    id: 'HT-20240310-001', farmerId: 'F-001', farmerName: 'Ramesh Kumar',
    floraType: 'Mustard', weightKg: 480, moisturePct: 17.2,
    latitude: '25.9067', longitude: '84.3600', grade: 'A',
    harvestDate: '2024-03-10', status: 'certified', createdAt: '2024-03-10T06:30:00Z',
  }],
  ['HT-20240312-002', {
    id: 'HT-20240312-002', farmerId: 'F-002', farmerName: 'Sunita Devi',
    floraType: 'Litchi', weightKg: 320, moisturePct: 18.5,
    latitude: '22.8465', longitude: '81.3340', grade: 'B',
    harvestDate: '2024-03-12', status: 'in_testing', createdAt: '2024-03-12T08:00:00Z',
  }],
]);

export const labResults = new Map<string, LabResult>();

export const recalls = new Map<string, RecallEvent>();

export const users = new Map<string, User>([
  ['F-001', { id: 'F-001', name: 'Ramesh Kumar', email: 'ramesh@example.com', role: 'farmer', kycCompleted: true }],
  ['W-001', { id: 'W-001', name: 'Siwan Warehouse', email: 'warehouse@example.com', role: 'warehouse', kycCompleted: true }],
  ['L-001', { id: 'L-001', name: 'Lab Technician', email: 'lab@example.com', role: 'lab', kycCompleted: true, fssaiLicense: '11224999000695' }],
]);
