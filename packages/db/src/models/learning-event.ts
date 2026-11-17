import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const LEARNING_EVENT_TYPES = ['lesson_completed', 'quiz_passed', 'course_completed'] as const;
export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export type LearningEventDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId | null;
  type: LearningEventType;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const learningEventSchema = new Schema<LearningEventDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },
    type: { type: String, enum: LEARNING_EVENT_TYPES, required: true },
    // Stored explicitly rather than read from createdAt, so a backfill keeps its real day.
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Streaks and badges read one learner's recent days; lesson events are unique per lesson.
learningEventSchema.index({ student: 1, occurredAt: -1 });
learningEventSchema.index({ student: 1, lesson: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'lesson_completed' } });

export const LearningEvent =
  (models.LearningEvent as Model<LearningEventDoc> | undefined) ??
  model<LearningEventDoc>('LearningEvent', learningEventSchema);
