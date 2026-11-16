import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const ENROLMENT_STATUSES = ['active', 'completed', 'refunded'] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

export type EnrolmentDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrolmentStatus;
  progressPercent: number;
  completedLessonIds: Types.ObjectId[];
  enrolledAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const enrolmentSchema = new Schema<EnrolmentDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, enum: ENROLMENT_STATUSES, default: 'active' },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: 'Progress must be a whole percentage',
      },
    },
    completedLessonIds: { type: [Schema.Types.ObjectId], default: [] },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One enrolment per student per course; this is also the check that grants access.
enrolmentSchema.index({ student: 1, course: 1 }, { unique: true });

export const Enrolment = (models.Enrolment as Model<EnrolmentDoc> | undefined) ?? model<EnrolmentDoc>('Enrolment', enrolmentSchema);
