import mongoose, { type Model, type Types } from 'mongoose';
import { COURSE_LEVELS, type CourseLevel } from './course';

const { model, models, Schema } = mongoose;

export type SavedSearchDoc = {
  user: Types.ObjectId;
  label: string;
  query: string;
  level: CourseLevel | '';
  language: 'bn' | 'en' | '';
  maxPricePaisa: number | null;
  lastCheckedAt: Date;
  lastMatchCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const savedSearchSchema = new Schema<SavedSearchDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    query: { type: String, trim: true, maxlength: 80, default: '' },
    level: { type: String, enum: ['', ...COURSE_LEVELS], default: '' },
    language: { type: String, enum: ['', 'bn', 'en'], default: '' },
    maxPricePaisa: { type: Number, default: null, min: 0 },
    lastCheckedAt: { type: Date, default: Date.now },
    lastMatchCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

savedSearchSchema.index({ user: 1, createdAt: -1 });

export const SavedSearch =
  (models.SavedSearch as Model<SavedSearchDoc> | undefined) ?? model<SavedSearchDoc>('SavedSearch', savedSearchSchema);
