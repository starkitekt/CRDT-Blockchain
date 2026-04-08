import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { AuditLog } from '@/lib/models/AuditLog';
import { Batch } from '@/lib/models/Batch';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['admin']);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const format    = searchParams.get('format') ?? 'csv';   // csv | json
    const from      = searchParams.get('from');               // ISO date
    const to        = searchParams.get('to');
    const entity    = searchParams.get('entity');             // batch | lab | kyc | all

    // ── Build query ───────────────────────────────────────────────────────
    const query: Record<string, unknown> = {};
    if (from || to) {
      query.at = {};
      if (from) (query.at as any).$gte = new Date(from);
      if (to)   (query.at as any).$lte = new Date(to);
    }
    if (entity && entity !== 'all') query.entityType = entity;

    const [logs, batches] = await Promise.all([
      AuditLog.find(query).sort({ at: -1 }).limit(10000).lean(),
      Batch.find({}).select('batchId status onChainTxHash onChainDataHash createdAt').lean(),
    ]);

    // ── JSON export ───────────────────────────────────────────────────────
    if (format === 'json') {
      return NextResponse.json(
        { exportedAt: new Date().toISOString(), logs, batches },
        { headers: { 'Content-Disposition': 'attachment; filename="honeytrace-ledger.json"' } }
      );
    }

    // ── CSV export ────────────────────────────────────────────────────────
    const csvRows = [
      // Header
      ['timestamp', 'entityType', 'entityId', 'action', 'actorRole', 'actorUserId', 'metadata'].join(','),
      // Rows
      ...logs.map(l => [
        new Date((l as any).at).toISOString(),
        l.entityType,
        l.entityId,
        l.action,
        l.actorRole,
        l.actorUserId ?? '',
        JSON.stringify(l.metadata ?? {}).replace(/,/g, ';'),
      ].join(','))
    ];

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="honeytrace-ledger-${Date.now()}.csv"`,
      },
    });

  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}