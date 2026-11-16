import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type CertificateDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  number: string;
  code: string;
  issuedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const certificateSchema = new Schema<CertificateDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Human-facing number on the printed certificate.
    number: { type: String, required: true, unique: true, trim: true },
    // Public lookup code; the only identifier in a verification URL.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    issuedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One certificate per learner per course, even if the completion is toggled later.
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

export const Certificate =
  (models.Certificate as Model<CertificateDoc> | undefined) ?? model<CertificateDoc>('Certificate', certificateSchema);
