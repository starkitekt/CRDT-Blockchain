/**
 * HoneyTRACE — Shared domain type definitions
 *
 * These are the canonical types used across API routes, components, and hooks.
 * Keep in sync with `src/lib/store.ts` interfaces.
 */

// ── GS1 / EPCIS ──────────────────────────────────────────────────────────────

/** GS1 EPCIS 2.0 BizStep URN vocabulary */
export type BizStep =
  | 'urn:epcglobal:cbv:bizstep:harvesting'
  | 'urn:epcglobal:cbv:bizstep:receiving'
  | 'urn:epcglobal:cbv:bizstep:storing'
  | 'urn:epcglobal:cbv:bizstep:shipping'
  | 'urn:epcglobal:cbv:bizstep:quality_control'
  | 'urn:epcglobal:cbv:bizstep:retail_selling';

/** GS1 EPCIS 2.0 Disposition vocabulary */
export type Disposition =
  | 'urn:epcglobal:cbv:disp:active'
  | 'urn:epcglobal:cbv:disp:in_transit'
  | 'urn:epcglobal:cbv:disp:conformant'
  | 'urn:epcglobal:cbv:disp:non_conformant'
  | 'urn:epcglobal:cbv:disp:recalled';

/** Human-readable labels for EPCIS dispositions */
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  'urn:epcglobal:cbv:disp:active':          'Active',
  'urn:epcglobal:cbv:disp:in_transit':      'In Transit',
  'urn:epcglobal:cbv:disp:conformant':      'Conformant',
  'urn:epcglobal:cbv:disp:non_conformant':  'Non-Conformant',
  'urn:epcglobal:cbv:disp:recalled':        'Recalled',
};

// ── Batch ─────────────────────────────────────────────────────────────────────

/** Batch lifecycle states */
export type BatchStatus =
  | 'pending'
  | 'in_warehouse'
  | 'in_testing'
  | 'certified'
  | 'dispatched'
  | 'recalled';

/** GS1-format batch ID pattern: HT-YYYYMMDD-NNN */
export type BatchId = `HT-${string}-${string}`;

export interface Batch {
  id: string;
  farmerId: string;
  farmerName: string;
  floraType: string;
  weightKg: number;
  /** Field moisture reading (%) — Codex limit ≤20% */
  moisturePct: number;
  /** GPS latitude string */
  latitude: string;
  /** GPS longitude string */
  longitude: string;
  grade: 'A' | 'B';
  harvestDate: string;       // ISO date string
  status: BatchStatus;
  /** On-chain transaction hash after blockchain write */
  onChainTxHash?: string;
  createdAt: string;         // ISO 8601
}

// ── Lab Results ───────────────────────────────────────────────────────────────

/** Codex Stan 12-1981 + FSSAI lab test results */
export interface LabResult {
  batchId: string;
  sampleId: string;
  labId: string;
  /** FSSAI license number (14 digits) */
  fssaiLicense: string;
  /** NABL accreditation certificate number */
  nablCert: string;
  // ── Codex Stan 12-1981 Mandatory Parameters ──
  /** Moisture content (%) — Codex limit: ≤20% */
  moisture: number;
  /** Hydroxymethylfurfural mg/kg — Codex limit: ≤40 */
  hmf: number;
  /** Pollen count per 10g */
  pollenCount: number;
  /** Free acidity meq/kg — Codex limit: ≤50 */
  acidity: number;
  /** Diastase activity (Schade units) — Codex minimum: ≥8 DN */
  diastase: number;
  /** Sucrose g/100g — Codex limit: ≤5 */
  sucrose: number;
  /** Reducing sugars g/100g — Codex minimum: ≥60 */
  reducingSugars: number;
  /** Electrical conductivity mS/cm */
  conductivity: number;
  // ── Advanced / FSSAI Export Parameters ──
  /** NMR authentication score (0–100) */
  nmrScore?: number;
  /** Antibiotic residue ppb — FSSAI limit: <0.1 ppb */
  antibioticPpb?: number;
  /** Heavy metals mg/kg — Codex limit: ≤0.1 mg/kg */
  heavyMetalsMgKg?: number;
  /** Pesticide residue mg/kg — EU MRL: <0.01 mg/kg */
  pesticideMgKg?: number;
  publishedAt?: string;      // ISO 8601
  onChainTxHash?: string;
}

/** Codex Stan 12-1981 compliance limits (reference constants) */
export const CODEX_LIMITS = {
  moisture:       { max: 20,  unit: '%',       label: 'Moisture' },
  hmf:            { max: 40,  unit: 'mg/kg',   label: 'HMF' },
  diastase:       { min: 8,   unit: 'DN',      label: 'Diastase' },
  sucrose:        { max: 5,   unit: 'g/100g',  label: 'Sucrose' },
  reducingSugars: { min: 60,  unit: 'g/100g',  label: 'Reducing Sugars' },
  acidity:        { max: 50,  unit: 'meq/kg',  label: 'Free Acidity' },
} as const;

// ── Recall ────────────────────────────────────────────────────────────────────

/** FSSAI/FDA recall classification tiers */
export type RecallTier = 1 | 2 | 3;

export const RECALL_TIER_LABELS: Record<RecallTier, { label: string; description: string; severity: 'error' | 'warning' | 'info' }> = {
  1: { label: 'Class I',   description: 'Immediate health hazard — life threatening',    severity: 'error' },
  2: { label: 'Class II',  description: 'Remote health hazard — temporary adverse effects', severity: 'warning' },
  3: { label: 'Class III', description: 'No health hazard — label or packaging violation', severity: 'info' },
};

export interface RecallEvent {
  id: string;
  batchId: string;
  tier: RecallTier;
  reason: string;
  affectedKg: number;
  initiatedBy: string;
  initiatedAt: string;       // ISO 8601
  onChainTxHash?: string;
}

// ── CTE / EPCIS Timeline ──────────────────────────────────────────────────────

export type CTEStatus = 'completed' | 'active' | 'pending';

/** Critical Tracking Event (FDA FSMA Rule 204 / GS1 EPCIS 2.0) */
export interface CTEEvent {
  id: string;
  bizStep: BizStep;
  label: string;
  /** GLN or human-readable location */
  location: string;
  /** ISO 8601 timestamp */
  eventTime: string;
  status: CTEStatus;
  disposition: Disposition;
  actor: string;
  /** On-chain transaction hash (if anchored) */
  txHash?: string;
}

// ── User / Auth ───────────────────────────────────────────────────────────────

export type UserRole =
  | 'farmer'
  | 'warehouse'
  | 'lab'
  | 'officer'
  | 'enterprise'
  | 'consumer'
  | 'secretary'
  | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Whether the user has completed KYC identity verification */
  kycCompleted: boolean;
  /** FSSAI license (applies to lab, warehouse, enterprise roles) */
  fssaiLicense?: string;
  createdAt?: string;        // ISO 8601 — optional; not required by in-memory store
}

// ── Wallet / Blockchain ───────────────────────────────────────────────────────

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  balance: string | null;
}

// ── GIS / Map ─────────────────────────────────────────────────────────────────

export interface ProductionCluster {
  id: string;
  name: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Number of active farmers */
  farmerCount: number;
  /** Total production in kg */
  productionKg: number;
  /** Year-over-year growth percent */
  growthPercent: number;
  /** Dominant flora type */
  floraType: string;
}
