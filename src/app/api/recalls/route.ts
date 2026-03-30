import { NextRequest, NextResponse } from 'next/server';
import { CreateRecallSchema } from '@/lib/validation/recall.schema';
import { createRecall, listRecalls } from '@/lib/services/recall.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

/** GET /api/recalls — list all recall events */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['officer', 'admin', 'secretary', 'enterprise']);
    const data = await listRecalls();
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/recalls — initiate a batch recall */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = requireAuth(req, ['officer', 'admin']);
    } catch (err) {
      if (err instanceof AuthError) return handleAuthError(err);
    }

    const body = await req.json();

    const parsed = CreateRecallSchema.safeParse(body);
    if (!parsed.success) {
      // Preserve original error messages
      return NextResponse.json(
        { error: 'batchId, tier, reason, initiatedBy are required' },
        { status: 400 }
      );
    }

    const data = await createRecall(parsed.data, actor?.userId, actor?.role);
    return NextResponse.json({ data }, { status: 201 });

  } catch (err: any) {
    if (err.message === 'BATCH_NOT_FOUND') {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    if (err.message === 'ALREADY_RECALLED') {
      return NextResponse.json({ error: 'Batch already recalled' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
