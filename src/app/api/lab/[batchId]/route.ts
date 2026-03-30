import { NextRequest, NextResponse } from 'next/server';
import { labResults } from '@/lib/store';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';


const READ_ROLES = ['lab', 'officer', 'enterprise', 'admin'];


/** GET /api/lab/:batchId — fetch lab result for a specific batch */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    requireAuth(req, READ_ROLES);

    const { batchId } = await params;
    const result = labResults.get(batchId);
    if (!result) {
      return NextResponse.json(
        { error: 'Lab result not found for this batch' },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: result });

  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}