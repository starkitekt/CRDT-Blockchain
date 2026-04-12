import { NextRequest, NextResponse } from 'next/server';
import { CreateBatchSchema } from '@/lib/validation/batch.schema';
import { createBatch, listBatches } from '@/lib/services/batch.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';


const READ_ROLES = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'admin'];
const WRITE_ROLES = ['farmer', 'admin'];


/** GET /api/batches — list batches; supports ?farmerId=X and/or ?status=X filters */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, READ_ROLES);

    const farmerId = req.nextUrl.searchParams.get('farmerId') ?? undefined;
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const data = await listBatches(farmerId, status);
    return NextResponse.json(data);

  } catch (err: any) {
    if (err instanceof AuthError) return handleAuthError(err);
    if (err.message === 'MOISTURE_VIOLATION') {
      return NextResponse.json(
        { error: 'Moisture content exceeds Codex limit of 20%' },
        { status: 422 }
      );
    }
    // Show real error in dev so you can diagnose
    const msg = process.env.NODE_ENV === 'development'
      ? err.message ?? String(err)
      : 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}


/** POST /api/batches — record a new harvest batch */
export async function POST(req: NextRequest) {
  try {
    // ── Auth first — before body parse ───────────────────────────────────
    const actor = await requireAuth(req, WRITE_ROLES);

    const body = await req.json();
    const parsed = CreateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await createBatch(parsed.data, actor.userId, actor.role);
    return NextResponse.json({ data }, { status: 201 });

  } catch (err: any) {
    if (err instanceof AuthError) return handleAuthError(err);
    if (err.message === 'MOISTURE_VIOLATION') {
      return NextResponse.json(
        { error: 'Moisture content exceeds Codex limit of 20%' },
        { status: 422 }
      );
    }
    console.error('[POST /api/batches]', err); // ← ADD this line
    const msg = process.env.NODE_ENV === 'development'
      ? err.message ?? String(err)
      : 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
