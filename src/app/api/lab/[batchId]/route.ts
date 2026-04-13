import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, handleAuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { LabResult } from '@/lib/models/LabResult';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAuth(req, ['lab', 'officer', 'enterprise', 'admin', 'consumer']);
    const { batchId } = await params;

    if (!batchId?.trim()) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    await connectDB();
    const result = await LabResult.findOne({ batchId }).lean();

    if (!result) {
      return NextResponse.json(
        { error: `No lab result found for batch: ${batchId}` },
        { status: 404 }
      );
    }

    const { _id, __v, ...clean } = result as Record<string, unknown>;
    return NextResponse.json(clean);
  } catch (err: unknown) {
    if (err instanceof AuthError) return handleAuthError(err);
    console.error('[LAB/:batchId] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
