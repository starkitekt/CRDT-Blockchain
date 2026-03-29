import { NextRequest, NextResponse } from 'next/server';
import { CreateBatchSchema } from '@/lib/validation/batch.schema';
import { createBatch, listBatches } from '@/lib/services/batch.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

/** GET /api/batches — list batches; supports ?farmerId=X and/or ?status=X filters */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    // Preserve original req.nextUrl.searchParams pattern
    const farmerId = req.nextUrl.searchParams.get('farmerId') ?? undefined;
    const status   = req.nextUrl.searchParams.get('status')   ?? undefined;
    const data = await listBatches(farmerId, status);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/batches — record a new harvest batch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Auth check — farmer or admin only
    let actor;
    try {
      actor = requireAuth(req, ['farmer', 'admin']);
    } catch (err) {
      if (err instanceof AuthError) return handleAuthError(err);
    }

    const parsed = CreateBatchSchema.safeParse(body);
    if (!parsed.success) {
      // Preserve original error message
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await createBatch(parsed.data, actor?.userId, actor?.role);
    return NextResponse.json({ data }, { status: 201 });

  } catch (err: any) {
    if (err.message === 'MOISTURE_VIOLATION') {
      // Preserve exact original error string
      return NextResponse.json(
        { error: 'Moisture content exceeds Codex limit of 20%' },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
