import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export type Answer = { author: Types.ObjectId; body: string; createdAt: Date };

export type QuestionDoc = {
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  answers: Answer[];
  createdAt: Date;
  updatedAt: Date;
};

const answerSchema = new Schema<Answer>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const questionSchema = new Schema<QuestionDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true },
);

questionSchema.index({ lesson: 1, createdAt: -1 });

export const Question = (models.Question as Model<QuestionDoc> | undefined) ?? model<QuestionDoc>('Question', questionSchema);