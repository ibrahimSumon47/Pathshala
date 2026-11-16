import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const REMINDER_STATUSES = ['pending', 'sent', 'failed'] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export type ReminderDoc = {
  session: Types.ObjectId;
  student: Types.ObjectId;
  dueAt: Date;
  channel: 'in_app' | 'email';
  status: ReminderStatus;
  sentAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const reminderSchema = new Schema<ReminderDoc>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueAt: { type: Date, required: true },
    channel: { type: String, enum: ['in_app', 'email'], default: 'in_app' },
    status: { type: String, enum: REMINDER_STATUSES, default: 'pending' },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

// A student gets one in-app reminder per session, even if they enrol twice.
reminderSchema.index({ session: 1, student: 1, channel: 1 }, { unique: true });
reminderSchema.index({ status: 1, dueAt: 1 });
export const Reminder = (models.Reminder as Model<ReminderDoc> | undefined) ?? model<ReminderDoc>('Reminder', reminderSchema);
