import { model, models, Schema, type Model, type Types } from 'mongoose';
import { localizedTextSchema, localizedTextValidator, type LocalizedText } from '../common';

export type SectionDoc = {
  course: Types.ObjectId;
  title: LocalizedText;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

const sectionSchema = new Schema<SectionDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: localizedTextSchema, required: true, validate: localizedTextValidator },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// Two sections cannot claim the same position in a course.
sectionSchema.index({ course: 1, order: 1 }, { unique: true });

export const Section = (models.Section as Model<SectionDoc> | undefined) ?? model<SectionDoc>('Section', sectionSchema);
