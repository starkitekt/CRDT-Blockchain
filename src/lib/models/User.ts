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

  // Shared across roles
  fssaiLicense?: string;       // lab, warehouse, enterprise — matches src/types/index.ts

  // Farmer
  aadhaarNumber?: string;      // 12-digit Aadhaar
  pmKisanId?: string;          // PM-KISAN beneficiary ID

  // Warehouse
  gstNumber?: string;          // 15-char GST
  wdraLicenseNo?: string;      // WDRA warehouse license

  // Lab
  nablAccreditationNo?: string; // NABL accreditation e.g. T-1234
  labRegistrationNo?: string;   // State lab registration number

  // Officer / Secretary
  employeeId?: string;          // Govt employee ID
  fssaiOfficerId?: string;      // FSSAI officer ID
  department?: string;          // e.g. FSSAI / AGMARK
  jurisdiction?: string;        // e.g. "Uttar Pradesh - Meerut District"

  // Enterprise
  cinNumber?: string;           // Company Identification Number
  iecCode?: string;             // Import Export Code (optional)

  // Consumer
  mobileNumber?: string;        // 10-digit Indian mobile
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, required: true, enum: VALID_ROLES },
    name:         { type: String, required: true },
    kycCompleted: { type: Boolean, default: false },

    // Shared
    fssaiLicense:        { type: String, trim: true },

    // Farmer
    aadhaarNumber:       { type: String, trim: true },
    pmKisanId:           { type: String, trim: true },

    // Warehouse
    gstNumber:           { type: String, trim: true, uppercase: true },
    wdraLicenseNo:       { type: String, trim: true },

    // Lab
    nablAccreditationNo: { type: String, trim: true },
    labRegistrationNo:   { type: String, trim: true },

    // Officer / Secretary
    employeeId:          { type: String, trim: true },
    fssaiOfficerId:      { type: String, trim: true },
    department:          { type: String, trim: true },
    jurisdiction:        { type: String, trim: true },

    // Enterprise
    cinNumber:           { type: String, trim: true, uppercase: true },
    iecCode:             { type: String, trim: true, uppercase: true },

    // Consumer
    mobileNumber:        { type: String, trim: true },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
