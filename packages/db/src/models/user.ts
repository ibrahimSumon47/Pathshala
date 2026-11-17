import mongoose, { type Model } from 'mongoose';
const { model, models, Schema } = mongoose;
import type { Locale } from '@pathshala/shared';

export const USER_ROLES = ['student', 'instructor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserDoc = {
  name: string;
  email: string;
  passwordHash?: string;
  image?: string;
  roles: UserRole[];
  locale: Locale;
  bio?: string;
  /** English profile text; `bio` holds the Bangla version. */
  bioEn?: string;
  /** True for seeded demo people so an operator can tell them from real accounts. */
  isDemo: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // Never selected by default; only the sign-in path asks for it explicitly.
    passwordHash: { type: String, select: false },
    image: { type: String, trim: true },
    roles: {
      type: [String],
      enum: USER_ROLES,
      default: ['student'],
    },
    locale: { type: String, enum: ['bn', 'en'], default: 'bn' },
    bio: { type: String, maxlength: 600 },
    bioEn: { type: String, maxlength: 600 },
    isDemo: { type: Boolean, default: false },
    emailVerified: { type: Date, default: null },
  },
  { timestamps: true },
);

/** A user can be a student and an instructor at once, but never a duplicate role. */
userSchema.pre('validate', function dedupeRoles() {
  if (Array.isArray(this.roles)) {
    this.roles = [...new Set(this.roles)];
  }
});

export const User = (models.User as Model<UserDoc> | undefined) ?? model<UserDoc>('User', userSchema);
