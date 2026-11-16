import { model, models, Schema, type Model, type Types } from 'mongoose';

export type AuditEventDoc = {
  actor: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
};

const auditEventSchema = new Schema<AuditEventDoc>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entityType: { type: String, required: true, trim: true, maxlength: 40 },
    entityId: { type: Schema.Types.ObjectId },
    // Free-form context (old value, new value, reason). Never secrets.
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 400 },
  },
  // Audit rows are append-only by design: no updatedAt, and no update routes later.
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditEventSchema.index({ createdAt: -1 });

export const AuditEvent =
  (models.AuditEvent as Model<AuditEventDoc> | undefined) ?? model<AuditEventDoc>('AuditEvent', auditEventSchema);
