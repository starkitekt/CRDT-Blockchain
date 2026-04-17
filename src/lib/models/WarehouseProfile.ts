import mongoose, { Schema } from 'mongoose';

const WarehouseProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    warehouseName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    location: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      geo: {
        type: [Number],
        default: undefined,
        validate: {
          validator: (arr: number[] | undefined) => !arr || arr.length === 0 || arr.length === 2,
          message: 'geo must be [lat, lng]',
        },
      },
    },
    storageCapacity: { type: Number, required: true, min: 0 },
    currentUtilization: { type: Number, min: 0 },
    temperatureControlled: { type: Boolean, default: false },
    humidityControl: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const WarehouseProfile =
  mongoose.models.WarehouseProfile || mongoose.model('WarehouseProfile', WarehouseProfileSchema);
