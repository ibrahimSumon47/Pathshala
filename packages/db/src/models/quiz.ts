import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export const QUIZ_TYPES = ['single', 'multiple', 'true-false'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export type QuizQuestionDoc = {
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  prompt: string;
  type: QuizType;
  options: string[];
  correctIndexes: number[];
  points: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type QuizAttemptDoc = {
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  student: Types.ObjectId;
  answers: number[][];
  score: number;
  maxScore: number;
  passed: boolean;
  createdAt: Date;
};

const quizQuestionSchema = new Schema<QuizQuestionDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
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
    points: { type: Number, default: 1, min: 1, max: 10 },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

quizQuestionSchema.index({ lesson: 1, order: 1 }, { unique: true });

const quizAttemptSchema = new Schema<QuizAttemptDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [[Number]], default: [] },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    passed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

quizAttemptSchema.index({ student: 1, lesson: 1, createdAt: -1 });

export const QuizQuestion =
  (models.QuizQuestion as Model<QuizQuestionDoc> | undefined) ??
  model<QuizQuestionDoc>('QuizQuestion', quizQuestionSchema);
export const QuizAttempt =
  (models.QuizAttempt as Model<QuizAttemptDoc> | undefined) ?? model<QuizAttemptDoc>('QuizAttempt', quizAttemptSchema);

type Scorable = { correctIndexes: number[]; points: number };

/** Score selected indexes per question; unanswered or extra selections earn nothing. */
export function scoreQuiz(questions: Scorable[], answers: number[][]): { score: number; maxScore: number; passed: boolean } {
  const maxScore = questions.reduce((total, question) => total + question.points, 0);
  const score = questions.reduce((total, question, index) => {
    const selected = [...new Set(answers[index] ?? [])].sort((a, b) => a - b);
    const correct = [...question.correctIndexes].sort((a, b) => a - b);
    const exact = selected.length === correct.length && selected.every((value, position) => value === correct[position]);
    return total + (exact ? question.points : 0);
  }, 0);
  return { score, maxScore, passed: maxScore > 0 && score / maxScore >= 0.6 };
}