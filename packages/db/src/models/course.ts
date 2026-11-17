import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;
import type { Locale } from '@pathshala/shared';
import {
  courseFaqSchema,
  localizedListField,
  localizedTextSchema,
  localizedTextValidator,
  SLUG_PATTERN,
  type CourseFaq,
  type LocalizedText,
} from '../common';

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const COURSE_STATUSES = ['draft', 'pending', 'published', 'archived'] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export type CourseDoc = {
  title: LocalizedText;
  slug: string;
  subtitle?: LocalizedText;
  /** One or two sentences shown under the title and on cards. */
  shortDescription?: LocalizedText;
  /** The long description on the course page. */
  description?: LocalizedText;
  category: Types.ObjectId;
  instructor: Types.ObjectId;
  language: Locale;
  level: CourseLevel;
  pricePaisa: number;
  salePricePaisa: number | null;
  status: CourseStatus;
  outcomes: LocalizedText[];
  requirements: LocalizedText[];
  /** Who the course is written for. */
  audience: LocalizedText[];
  faqs: CourseFaq[];
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  /** Seeded demo content, so an operator can tell it apart from real courses. */
  isDemo: boolean;
  ratingAverage: number;
  ratingCount: number;
  enrolmentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Prices are integer paisa; a fractional amount is a bug, not a rounding choice. */
const paisaField = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: (value: number) => Number.isInteger(value),
    message: 'Price must be a whole number of paisa',
  },
};

const courseSchema = new Schema<CourseDoc>(
  {
    title: { type: localizedTextSchema, required: true, validate: localizedTextValidator },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [SLUG_PATTERN, 'Use lowercase words separated by hyphens'],
    },
    subtitle: { type: localizedTextSchema },
    shortDescription: { type: localizedTextSchema },
    description: { type: localizedTextSchema },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    language: { type: String, enum: ['bn', 'en'], required: true },
    level: { type: String, enum: COURSE_LEVELS, default: 'beginner' },
    pricePaisa: paisaField,
    salePricePaisa: { type: Number, default: null, min: 0 },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft' },
    outcomes: localizedListField,
    requirements: localizedListField,
    audience: localizedListField,
    faqs: { type: [courseFaqSchema], default: [] },
    thumbnailUrl: { type: String, trim: true },
    promoVideoUrl: { type: String, trim: true },
    isDemo: { type: Boolean, default: false },
    // Denormalised counters, updated when reviews and enrolments change.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    enrolmentCount: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Catalogue queries filter on status, category, language and level, then sort by recency.
courseSchema.index({ status: 1, category: 1, language: 1, level: 1, publishedAt: -1 });
// One text index per collection; it covers both languages rather than duplicating storage.
// Course.language stores a UI locale, not a MongoDB stemming language, so the text index
// must not read it as an override (Mongo rejects "bn" as an unsupported language).
courseSchema.index(
  { 'title.bn': 'text', 'title.en': 'text', 'subtitle.bn': 'text', 'subtitle.en': 'text' },
  { default_language: 'none', language_override: 'textLanguage' },
);

export const Course = (models.Course as Model<CourseDoc> | undefined) ?? model<CourseDoc>('Course', courseSchema);
