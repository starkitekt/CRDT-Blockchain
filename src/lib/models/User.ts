import mongoose, { Schema, Document } from 'mongoose';

export const VALID_ROLES = [
  'farmer', 'warehouse', 'lab', 'officer',
  'enterprise', 'consumer', 'secretary', 'admin'
] as const;

export type UserRole = typeof VALID_ROLES[number];

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  kycCompleted: boolean;
  kycVerifiedAt?: Date;           // ← ADD: set when kycCompleted = true
  kycRejected?: boolean;          // ← ADD
  kycRejectReason?: string;       // ← ADD
  isActive?: boolean;             // ← ADD

  // ── Shared across roles ───────────────────────────────────────────────────
  fssaiLicense?: string;

  // ── Farmer ────────────────────────────────────────────────────────────────
  aadhaarNumber?: string;
  pmKisanId?: string;

  // ── Aadhaar e-KYC ─────────────────────────────────────────────────────────
  aadhaarVerified?: boolean;
  aadhaarSuffix?: string;
  aadhaarKycName?: string;
  aadhaarKycDob?: string;
  aadhaarKycGender?: 'M' | 'F' | 'T';
  aadhaarKycAddress?: string;

  // ── Warehouse ─────────────────────────────────────────────────────────────
  gstNumber?: string;
  wdraLicenseNo?: string;
  /** Warehouse storage tariff used by the marketplace, in paise per kg per day. */
  storageRatePerKgPerDayPaise?: number;

  // ── Lab ───────────────────────────────────────────────────────────────────
  nablAccreditationNo?: string;
  labRegistrationNo?: string;

  // ── Officer / Secretary ───────────────────────────────────────────────────
  employeeId?: string;
  fssaiOfficerId?: string;
  department?: string;
  jurisdiction?: string;

  // ── Enterprise ────────────────────────────────────────────────────────────
  cinNumber?: string;
  iecCode?: string;

  // ── Consumer ──────────────────────────────────────────────────────────────
  mobileNumber?: string;

  // ── Blockchain Identity (auto-generated) ────────────────────────────────
  blockchainId?: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: VALID_ROLES },
    name: { type: String, required: true },
    kycCompleted: { type: Boolean, default: false },

    // ── KYC status fields ────────────────────────────────────────────────────
    kycVerifiedAt: { type: Date },                        // ← ADD
    kycRejected: { type: Boolean, default: false },     // ← ADD
    kycRejectReason: { type: String, trim: true },          // ← ADD
    isActive: { type: Boolean, default: true },      // ← ADD

    // ── Shared ───────────────────────────────────────────────────────────────
    fssaiLicense: { type: String, trim: true },

    // ── Farmer ───────────────────────────────────────────────────────────────
    aadhaarNumber: { type: String, trim: true },
    pmKisanId: { type: String, trim: true },

    // ── Aadhaar e-KYC ────────────────────────────────────────────────────────
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarSuffix: { type: String, trim: true },
    aadhaarKycName: { type: String, trim: true },
    aadhaarKycDob: { type: String, trim: true },
    aadhaarKycGender: { type: String, enum: ['M', 'F', 'T'] },
    aadhaarKycAddress: { type: String, trim: true },

    // ── Warehouse ─────────────────────────────────────────────────────────────
    gstNumber: { type: String, trim: true, uppercase: true },
    wdraLicenseNo: { type: String, trim: true },
    storageRatePerKgPerDayPaise: { type: Number, min: 0 },

    // ── Lab ───────────────────────────────────────────────────────────────────
    nablAccreditationNo: { type: String, trim: true },
    labRegistrationNo: { type: String, trim: true },

    // ── Officer / Secretary ───────────────────────────────────────────────────
    employeeId: { type: String, trim: true },
    fssaiOfficerId: { type: String, trim: true },
    department: { type: String, trim: true },
    jurisdiction: { type: String, trim: true },

    // ── Enterprise ────────────────────────────────────────────────────────────
    cinNumber: { type: String, trim: true, uppercase: true },
    iecCode: { type: String, trim: true, uppercase: true },

    // ── Consumer ──────────────────────────────────────────────────────────────
    mobileNumber: { type: String, trim: true },

    // ── Blockchain Identity ─────────────────────────────────────────────────
    blockchainId: { type: String, trim: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);