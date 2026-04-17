import mongoose, { Schema } from 'mongoose';

const EnterpriseProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true },
    gstNumber: { type: String, required: true, trim: true, uppercase: true },
    fssaiLicense: { type: String, required: true, trim: true },
    companyPan: { type: String, required: true, trim: true, uppercase: true },
    businessType: {
      type: String,
      enum: ['buyer', 'processor', 'exporter'],
      required: true,
    },
    contactPerson: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, required: true, trim: true },
    },
    facilityLocation: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
    },
    processingCapacity: { type: Number, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const EnterpriseProfile =
  mongoose.models.EnterpriseProfile || mongoose.model('EnterpriseProfile', EnterpriseProfileSchema);
