import { connectDB } from './mongodb';
import { AuditLog } from './models/AuditLog';

interface AuditPayload {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  actorRole: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit writer.
 * Never throws — audit failure must not break the main request.
 */
export async function auditLog(payload: AuditPayload): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({ ...payload, at: new Date() });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}
