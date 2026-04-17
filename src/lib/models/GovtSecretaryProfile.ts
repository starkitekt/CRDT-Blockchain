import mongoose, { Schema } from 'mongoose';

const GovtSecretaryProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    jurisdiction: {
      level: { type: String, enum: ['district', 'state', 'national'], required: true },
      region: { type: String, required: true, trim: true },
    },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    permissions: {
      approveStakeholders: { type: Boolean, default: false },
      auditAccess: { type: Boolean, default: false },
      complianceControl: { type: Boolean, default: false },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const GovtSecretaryProfile =
  mongoose.models.GovtSecretaryProfile || mongoose.model('GovtSecretaryProfile', GovtSecretaryProfileSchema);

