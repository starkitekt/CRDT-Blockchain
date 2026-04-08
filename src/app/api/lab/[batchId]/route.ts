import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { LabResult } from '@/lib/models/LabResult';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const auth = await requireAuth(req, ['lab', 'officer', 'enterprise', 'admin', 'consumer']);
  if (auth instanceof NextResponse) return auth;

  const { batchId } = await params;

  if (!batchId?.trim()) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  // ── Fetch from MongoDB ────────────────────────────────────────────────────
  try {
    await connectDB();
    const result = await LabResult.findOne({ batchId }).lean();

    if (!result) {
      return NextResponse.json(
        { error: `No lab result found for batch: ${batchId}` },
        { status: 404 }
      );
    }

    // Strip internal fields
    const { _id, __v, ...clean } = result as Record<string, unknown>;
    return NextResponse.json(clean);

  } catch (err: unknown) {
    console.error('[LAB/:batchId] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}