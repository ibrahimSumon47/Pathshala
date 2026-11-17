import type { Locale } from '@pathshala/shared';
import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Text that can exist in either supported language. */
export type LocalizedText = Partial<Record<Locale, string>>;

/** True when at least one language has real (non-whitespace) text. */
export function hasAnyLanguage(value: LocalizedText | null | undefined): boolean {
  return Boolean(value?.bn?.trim() || value?.en?.trim());
}

/**
 * Courses and lessons may be authored in one language first, so the schema stores both
 * fields and a validator requires at least one. Categories are admin-managed and require
 * both, since they are the navigation.
 */
export const localizedTextSchema = new Schema<LocalizedText>(
  {
    bn: { type: String, trim: true, maxlength: 200 },
    en: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

export const localizedTextValidator = {
  validator: (value: LocalizedText) => hasAnyLanguage(value),
  message: 'Provide the text in Bangla or English',
};

/** Longer prose (answers, long descriptions) needs more room than a title. */
export const localizedProseSchema = new Schema<LocalizedText>(
  {
    bn: { type: String, trim: true, maxlength: 4000 },
    en: { type: String, trim: true, maxlength: 4000 },
  },
  { _id: false },
);

/**
 * Outcome and requirement lists are stored per language so a Bangla course does not show
 * English bullet points. Older rows stored plain strings; reads normalise both shapes.
 */
export const localizedListField = { type: [localizedTextSchema], default: [] };

/** One question and answer pair on a course page. */
export type CourseFaq = { question: LocalizedText; answer: LocalizedText };

export const courseFaqSchema = new Schema<CourseFaq>(
  {
    question: { type: localizedTextSchema, required: true, validate: localizedTextValidator },
    answer: { type: localizedProseSchema, required: true, validate: localizedTextValidator },
  },
  { _id: false },
);

/** Accept a stored string list or a localized list and return the localized shape. */
export function toLocalizedList(values: unknown): LocalizedText[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    if (typeof value === 'string') return value.trim() ? [{ en: value.trim() }] : [];
    if (value && typeof value === 'object') {
      const item = value as LocalizedText;
      return hasAnyLanguage(item) ? [item] : [];
    }
    return [];
  });
}

/** Mime types accepted for lesson attachments; enforced again at upload time. */
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/zip'] as const;

export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number];

export type Attachment = {
  name: string;
  url: string;
  mimeType: AttachmentMimeType;
  sizeBytes: number;
};

/** Attachment metadata only. The file itself lives in storage, never in MongoDB. */
export const attachmentSchema = new Schema<Attachment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, enum: ATTACHMENT_MIME_TYPES },
    sizeBytes: { type: Number, required: true, min: 1, max: 20 * 1024 * 1024 },
  },
  { _id: false },
);

/** Same rule as the course slug: lowercase words separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
