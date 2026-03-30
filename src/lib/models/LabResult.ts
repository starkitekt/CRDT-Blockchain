import mongoose, { Schema } from 'mongoose';

const LabResultSchema = new Schema(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    sampleId: { type: String, required: true },
    labId: { type: String, required: true },
    fssaiLicense: { type: String, required: true },
    nablCert: { type: String, required: true },
    moisture: { type: Number, required: true },
    hmf: { type: Number, required: true },
    pollenCount: { type: Number, required: true },
    acidity: { type: Number, required: true },
    diastase: { type: Number, required: true },
    sucrose: { type: Number, required: true },
    reducingSugars: { type: Number, required: true },
    conductivity: { type: Number, required: true },
    nmrScore: { type: Number },
    antibioticPpb: { type: Number },
    heavyMetalsMgKg: { type: Number },
    pesticideMgKg: { type: Number },
    publishedAt: { type: String },
    onChainTxHash: { type: String },
  },
  { id: false, versionKey: false }
);

LabResultSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret._id = undefined;
    return ret;
  },
});



export const LabResult =
  mongoose.models.LabResult || mongoose.model('LabResult', LabResultSchema);
