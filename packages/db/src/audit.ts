import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { AuditEvent } from './models/audit-event';

export type AuditInput = {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

/** Append one audit row. Callers pass ids and safe context only, never secrets. */
export async function recordAuditEvent(input: AuditInput): Promise<void> {
  await connectToDatabase();
  const event: {
    actor: Types.ObjectId | null;
    action: string;
    entityType: string;
    metadata: Record<string, unknown>;
    entityId?: Types.ObjectId;
    ip?: string;
    userAgent?: string;
  } = {
    actor: Types.ObjectId.isValid(input.actor) ? new Types.ObjectId(input.actor) : null,
    action: input.action.slice(0, 80),
    entityType: input.entityType.slice(0, 40),
    metadata: input.metadata ?? {},
  };
  if (input.entityId && Types.ObjectId.isValid(input.entityId)) event.entityId = new Types.ObjectId(input.entityId);
  if (input.ip) event.ip = input.ip.slice(0, 80);
  if (input.userAgent) event.userAgent = input.userAgent.slice(0, 400);
  await AuditEvent.create(event);
}
