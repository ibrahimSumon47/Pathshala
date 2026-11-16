import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type NotificationDoc = {
  user: Types.ObjectId;
  session: Types.ObjectId | null;
  kind: 'reminder' | 'system';
  title: { bn?: string; en?: string };
  body: { bn?: string; en?: string };
  href: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', default: null },
    kind: { type: String, enum: ['reminder', 'system'], default: 'system' },
    title: {
      bn: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    body: {
      bn: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    href: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, kind: 1, session: 1 }, { unique: true, partialFilterExpression: { kind: 'reminder' } });
notificationSchema.index({ user: 1, createdAt: -1 });
export const Notification =
  (models.Notification as Model<NotificationDoc> | undefined) ?? model<NotificationDoc>('Notification', notificationSchema);
