import { NextRequest, NextResponse } from 'next/server';
import { recalls, batches, RecallEvent } from '@/lib/store';

/** GET /api/recalls — list all recall events */
export async function GET() {
  return NextResponse.json({ data: Array.from(recalls.values()) });
}

/** POST /api/recalls — initiate a batch recall */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { batchId: string; tier: 1 | 2 | 3; reason: string; affectedKg: number; initiatedBy: string };

    if (!body.batchId || !body.tier || !body.reason || !body.initiatedBy) {
      return NextResponse.json({ error: 'batchId, tier, reason, initiatedBy are required' }, { status: 400 });
    }
    if (typeof body.affectedKg !== 'number' || body.affectedKg < 0) {
      return NextResponse.json({ error: 'affectedKg must be a non-negative number' }, { status: 400 });
    }

    const batch = batches.get(body.batchId);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    if (batch.status === 'recalled') {
      return NextResponse.json({ error: 'Batch already recalled' }, { status: 409 });
    }

    const id = `RECALL-${Date.now()}`;
    const event: RecallEvent = {
      id,
      batchId: body.batchId,
      tier: body.tier,
      reason: body.reason,
      affectedKg: body.affectedKg,
      initiatedBy: body.initiatedBy,
      initiatedAt: new Date().toISOString(),
    };

    recalls.set(id, event);
    batches.set(body.batchId, { ...batch, status: 'recalled' });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
