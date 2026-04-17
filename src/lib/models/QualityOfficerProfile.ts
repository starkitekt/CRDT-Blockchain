import mongoose, { Schema } from 'mongoose';

const QualityOfficerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    authorityLevel: {
      type: String,
      enum: ['regional', 'state', 'national'],
      required: true,
    },
    labAffiliation: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const QualityOfficerProfile =
  mongoose.models.QualityOfficerProfile || mongoose.model('QualityOfficerProfile', QualityOfficerProfileSchema);

