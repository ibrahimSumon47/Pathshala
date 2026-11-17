import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type NotificationDoc = {
  user: Types.ObjectId;
  session: Types.ObjectId | null;
  kind: 'reminder' | 'seat_open' | 'system';
  title: { bn?: string; en?: string };
  body: { bn?: string; en?: string };
  href: string;
  /** Stable identifier for a non-session event, e.g. a coupon code. */
  ref?: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', default: null },
    kind: { type: String, enum: ['reminder', 'seat_open', 'system'], default: 'system' },
    title: {
      bn: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    body: {
      bn: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    href: { type: String, required: true },
    ref: { type: String, trim: true, maxlength: 64, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, kind: 1, session: 1 }, { unique: true, partialFilterExpression: { kind: 'reminder' } });
// One "seat opened" note per learner per session, even if seats open more than once.
// The different key order keeps this a distinct index from the reminder guard above.
notificationSchema.index({ kind: 1, session: 1, user: 1 }, { unique: true, partialFilterExpression: { kind: 'seat_open' } });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ kind: 1, ref: 1, createdAt: -1 });
export const Notification =
  (models.Notification as Model<NotificationDoc> | undefined) ?? model<NotificationDoc>('Notification', notificationSchema);
