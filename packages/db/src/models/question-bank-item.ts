import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;
import { QUIZ_TYPES, type QuizType } from './quiz';

export type QuestionBankItemDoc = {
  /** The teacher who owns this reusable question. */
  instructor: Types.ObjectId;
  /** The course it was first saved from, kept only for context in the bank list. */
  sourceCourse: Types.ObjectId | null;
  prompt: string;
  type: QuizType;
  options: string[];
  correctIndexes: number[];
  explanation: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
};

const questionBankItemSchema = new Schema<QuestionBankItemDoc>(
  {
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceCourse: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    prompt: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: QUIZ_TYPES, default: 'single' },
    options: {
      type: [String],
      required: true,
      validate: { validator: (value: string[]) => value.length >= 2 && value.length <= 6, message: 'Use 2-6 options' },
    },
    correctIndexes: {
      type: [Number],
      required: true,
      validate: { validator: (value: number[]) => value.length >= 1, message: 'Mark at least one answer' },
    },
    explanation: { type: String, trim: true, maxlength: 500, default: '' },
    points: { type: Number, default: 1, min: 1, max: 10 },
  },
  { timestamps: true },
);

// The bank is read per teacher, newest first.
questionBankItemSchema.index({ instructor: 1, createdAt: -1 });

export const QuestionBankItem =
  (models.QuestionBankItem as Model<QuestionBankItemDoc> | undefined) ??
  model<QuestionBankItemDoc>('QuestionBankItem', questionBankItemSchema);
