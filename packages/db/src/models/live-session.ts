import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const LIVE_SESSION_STATUSES = ['scheduled', 'cancelled', 'completed'] as const;
export type LiveSessionStatus = (typeof LIVE_SESSION_STATUSES)[number];

export type LiveSessionDoc = {
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  title: { bn?: string; en?: string };
  description: { bn?: string; en?: string };
  startsAt: Date;
  durationMinutes: number;
  /** 0 means no seat cap; a positive number is the attendance limit before the waitlist. */
  capacity: number;
  roomName: string;
  status: LiveSessionStatus;
  createdAt: Date;
  updatedAt: Date;
};

const liveSessionSchema = new Schema<LiveSessionDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: {
      bn: { type: String, trim: true, maxlength: 160 },
      en: { type: String, trim: true, maxlength: 160 },
    },
    description: {
      bn: { type: String, trim: true, maxlength: 800 },
      en: { type: String, trim: true, maxlength: 800 },
    },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    capacity: { type: Number, default: 0, min: 0, max: 1000 },
    roomName: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: LIVE_SESSION_STATUSES, default: 'scheduled' },
  },
  { timestamps: true },
);

liveSessionSchema.index({ course: 1, startsAt: 1 });
liveSessionSchema.index({ startsAt: 1, status: 1 });
export const LiveSession =
  (models.LiveSession as Model<LiveSessionDoc> | undefined) ?? model<LiveSessionDoc>('LiveSession', liveSessionSchema);
