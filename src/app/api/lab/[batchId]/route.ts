import { NextRequest, NextResponse } from 'next/server';
import { labResults } from '@/lib/store';

/** GET /api/lab/:batchId — fetch lab result for a specific batch */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const result = labResults.get(batchId);
  if (!result) {
    return NextResponse.json({ error: 'Lab result not found for this batch' }, { status: 404 });
  }
  return NextResponse.json({ data: result });
}
