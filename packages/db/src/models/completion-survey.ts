import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type CompletionSurveyDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  /** 1 = very easy, 5 = very hard. */
  difficulty: number;
  /** 1 = too slow, 5 = too fast. */
  pace: number;
  /** 1 = not confident, 5 = very confident. */
  confidence: number;
  comment: string;
  /** Hidden comments are excluded from teacher averages, like a hidden review. */
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** One five-point answer; every scale is deliberately the same width. */
const scaleField = {
  type: Number,
  required: true,
  min: 1,
  max: 5,
  validate: {
    validator: (value: number) => Number.isInteger(value),
    message: 'Survey answers are whole numbers from 1 to 5',
  },
};

const completionSurveySchema = new Schema<CompletionSurveyDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    difficulty: scaleField,
    pace: scaleField,
    confidence: scaleField,
    comment: { type: String, trim: true, maxlength: 500, default: '' },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// A learner answers once per completed course; submitting again is an edit, not a new row.
completionSurveySchema.index({ student: 1, course: 1 }, { unique: true });

export const CompletionSurvey =
  (models.CompletionSurvey as Model<CompletionSurveyDoc> | undefined) ??
  model<CompletionSurveyDoc>('CompletionSurvey', completionSurveySchema);
