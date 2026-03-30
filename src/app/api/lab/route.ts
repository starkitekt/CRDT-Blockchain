import { NextRequest, NextResponse } from 'next/server';
import { CreateLabResultSchema } from '@/lib/validation/lab.schema';
import { publishLabResult, listLabResults } from '@/lib/services/lab.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

/** GET /api/lab — list all lab results */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['lab', 'officer', 'admin', 'secretary']);
    const data = await listLabResults();
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/lab — publish lab results for a batch */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = requireAuth(req, ['lab', 'admin']);
    } catch (err) {
      if (err instanceof AuthError) return handleAuthError(err);
    }

    const body = await req.json();

    const parsed = CreateLabResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'batchId and fssaiLicense are required' },
        { status: 400 }
      );
    }

    const data = await publishLabResult(parsed.data, actor?.userId, actor?.role);
    return NextResponse.json({ data, violations: [] }, { status: 201 });

  } catch (err: any) {
    if (err.message === 'BATCH_NOT_FOUND') {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    if (err.message === 'CODEX_VIOLATION') {
      return NextResponse.json({
        error: 'Codex Stan 12-1981 violations detected',
        violations: err.violations,
        conformanceStatus: 'NON_CONFORMANT',
      }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
