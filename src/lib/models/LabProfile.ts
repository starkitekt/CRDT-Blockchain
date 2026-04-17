import mongoose, { Schema } from 'mongoose';

const LabProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    labName: { type: String, required: true, trim: true },
    fssaiLabNumber: { type: String, required: true, trim: true },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    certifications: [{ type: String, trim: true }],
    testingCapabilities: {
      purityTest: { type: Boolean, default: false },
      adulterationTest: { type: Boolean, default: false },
      moistureTest: { type: Boolean, default: false },
    },
    location: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const LabProfile =
  mongoose.models.LabProfile || mongoose.model('LabProfile', LabProfileSchema);

