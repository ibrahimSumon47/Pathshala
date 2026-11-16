import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;
import { attachmentSchema, localizedTextSchema, localizedTextValidator, type Attachment, type LocalizedText } from '../common';

export const LESSON_TYPES = ['reading', 'video', 'quiz'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export type LessonContent = {
  bodyHtml?: string;
  attachments: Attachment[];
};

export type LessonVideo = {
  url?: string;
  durationSeconds?: number;
};

export type LessonDoc = {
  course: Types.ObjectId;
  section: Types.ObjectId;
  title: LocalizedText;
  order: number;
  type: LessonType;
  content: LessonContent;
  video: LessonVideo | null;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const lessonSchema = new Schema<LessonDoc>(
  {
    // Course is duplicated on the lesson so progress queries do not need a join per lesson.
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    section: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    title: { type: localizedTextSchema, required: true, validate: localizedTextValidator },
    order: { type: Number, required: true, min: 0 },
    type: { type: String, enum: LESSON_TYPES, default: 'reading' },
    content: {
      bodyHtml: { type: String, default: '' },
      attachments: { type: [attachmentSchema], default: [] },
    },
    // Reserved for P2's video lessons: the slot exists, no upload pipeline does yet.
    video: {
      type: new Schema<LessonVideo>(
        {
          url: { type: String, trim: true },
          durationSeconds: { type: Number, min: 0 },
        },
        { _id: false },
      ),
      default: null,
    },
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// A course's table of contents is read in section then lesson order.
lessonSchema.index({ course: 1, section: 1, order: 1 }, { unique: true });

export const Lesson = (models.Lesson as Model<LessonDoc> | undefined) ?? model<LessonDoc>('Lesson', lessonSchema);
