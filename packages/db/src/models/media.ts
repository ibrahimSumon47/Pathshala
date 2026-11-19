import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const MEDIA_KINDS = ['course-cover', 'course-preview'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Accepted image formats; the real format is read from the bytes, never from a claim. */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

export type MediaDoc = {
  owner: Types.ObjectId;
  kind: MediaKind;
  mimeType: ImageMime;
  sizeBytes: number;
  /** The uploaded bytes. Excluded from normal reads so no query leaks an image by accident. */
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
};

const mediaSchema = new Schema<MediaDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: MEDIA_KINDS, required: true },
    mimeType: { type: String, enum: IMAGE_MIME_TYPES, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

// Course images are listed by their uploader in the studio; nothing queries across owners.
mediaSchema.index({ owner: 1, createdAt: -1 });

export const Media = (models.Media as Model<MediaDoc> | undefined) ?? model<MediaDoc>('Media', mediaSchema);
