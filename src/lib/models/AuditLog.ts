import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    entityType:  { type: String, required: true },
    entityId:    { type: String, required: true, index: true },
    action:      { type: String, required: true },
    actorUserId: { type: String },
    actorRole:   { type: String, required: true },
    at:          { type: Date, default: Date.now, index: true },
    metadata:    { type: Schema.Types.Mixed },
  },
  { versionKey: false }
);

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
