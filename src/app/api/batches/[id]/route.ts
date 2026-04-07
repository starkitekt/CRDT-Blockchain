import { NextRequest, NextResponse } from 'next/server';
import { PatchBatchSchema } from '@/lib/validation/batch.schema';
import { getBatchById, patchBatch } from '@/lib/services/batch.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';


const READ_ROLES  = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'admin'];
const PATCH_ROLES = ['warehouse', 'officer', 'lab', 'admin'];


/** GET /api/batches/:id — fetch single batch */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireAuth(req, READ_ROLES);

    const { id } = await params;
    const data = await getBatchById(id);
    if (!data) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


/** PATCH /api/batches/:id — update batch status or add tx hash */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Auth first ────────────────────────────────────────────────────────
    const actor = requireAuth(req, PATCH_ROLES);

    const { id } = await params;
    const body = await req.json();

    const parsed = PatchBatchSchema.safeParse(body);
    if (!parsed.success) {
      const violations = parsed.error.issues.map((e) =>
        `${String(e.path.join('.')) || 'field'}: ${e.message}`
      );
      return NextResponse.json({ error: 'Invalid patch fields', violations }, { status: 422 });
    }

    const data = await patchBatch(id, parsed.data, actor.userId, actor.role);
    if (!data) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
