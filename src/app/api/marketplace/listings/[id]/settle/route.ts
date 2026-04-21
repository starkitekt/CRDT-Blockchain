import { NextRequest, NextResponse } from 'next/server';
import { settleListing } from '@/lib/services/marketplace.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

/**
 * POST /api/marketplace/listings/[id]/settle
 *
 * Anyone authenticated can poke the settlement endpoint, but only
 * `admin` may force-close a still-running auction.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuth(req, ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer', 'secretary', 'admin']);
    const { id } = await ctx.params;
    const force = req.nextUrl.searchParams.get('force') === '1' && actor.role === 'admin';
    const data = await settleListing(id, { force, actorId: actor.userId, actorRole: actor.role });
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    const status =
      msg === 'LISTING_NOT_FOUND' ? 404
      : msg === 'AUCTION_NOT_ENDED' ? 409
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
