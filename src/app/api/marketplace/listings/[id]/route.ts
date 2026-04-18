import { NextRequest, NextResponse } from 'next/server';
import { getListing, cancelListing } from '@/lib/services/marketplace.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

const READ_ROLES = ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer', 'admin', 'secretary'];

/** GET /api/marketplace/listings/[id] */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, READ_ROLES);
    const { id } = await ctx.params;
    const listing = await getListing(id);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    return NextResponse.json(listing);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/marketplace/listings/[id] — cancel */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuth(req, ['farmer', 'admin']);
    const { id } = await ctx.params;
    const data = await cancelListing(id, actor.userId, actor.role);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    const status =
      msg === 'LISTING_NOT_FOUND' ? 404
      : msg === 'FORBIDDEN' ? 403
      : msg === 'LISTING_NOT_LIVE' || msg === 'CANNOT_CANCEL_WITH_BIDS' ? 409
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
