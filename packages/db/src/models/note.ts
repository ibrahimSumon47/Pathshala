import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export type NoteDoc = {
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  student: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

const noteSchema = new Schema<NoteDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true, maxlength: 4000, default: '' },
  },
  { timestamps: true },
);

noteSchema.index({ student: 1, lesson: 1 }, { unique: true });

export const Note = (models.Note as Model<NoteDoc> | undefined) ?? model<NoteDoc>('Note', noteSchema);