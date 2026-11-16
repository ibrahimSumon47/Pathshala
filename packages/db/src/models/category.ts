import { model, models, Schema, type Model } from 'mongoose';
import { localizedTextSchema, localizedTextValidator, SLUG_PATTERN, type LocalizedText } from '../common';

export type CategoryDoc = {
  name: LocalizedText;
  slug: string;
  description?: LocalizedText;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const categorySchema = new Schema<CategoryDoc>(
  {
    name: {
      type: localizedTextSchema,
      required: true,
      validate: localizedTextValidator,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [SLUG_PATTERN, 'Use lowercase words separated by hyphens'],
    },
    description: { type: localizedTextSchema },
    order: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Category = (models.Category as Model<CategoryDoc> | undefined) ?? model<CategoryDoc>('Category', categorySchema);
