import mongoose, { Schema } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'BATCH_CREATED',
  'BATCH_TESTED',
  'BATCH_CERTIFIED',
  'BATCH_RECALLED',
  'BATCH_DISPATCHED',
] as const;

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    batchId: { type: String, index: true },
    isRead: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, batchId: 1 }, { unique: true, sparse: true });

const ExistingNotificationModel = mongoose.models.Notification as mongoose.Model<{
  userId: string;
  type: string;
  title: string;
  message: string;
  batchId?: string;
  isRead: boolean;
  createdAt: Date;
}> | undefined;

if (ExistingNotificationModel) {
  // Hot-reload safety: ensure stale compiled schemas include current fields.
  if (!ExistingNotificationModel.schema.path('batchId')) {
    ExistingNotificationModel.schema.add({ batchId: { type: String, index: true } });
  }
  if (!ExistingNotificationModel.schema.path('title')) {
    ExistingNotificationModel.schema.add({ title: { type: String, required: true, trim: true } });
  }
}

export const Notification =
  ExistingNotificationModel || mongoose.model('Notification', NotificationSchema);
