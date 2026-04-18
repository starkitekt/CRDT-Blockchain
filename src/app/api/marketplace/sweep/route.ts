import { NextRequest, NextResponse } from 'next/server';
import { sweepExpiredListings } from '@/lib/services/marketplace.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

/** POST /api/marketplace/sweep — close any auctions whose endsAt has passed. */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, ['admin', 'officer', 'secretary']);
    const results = await sweepExpiredListings();
    return NextResponse.json({ swept: results.length, results });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
