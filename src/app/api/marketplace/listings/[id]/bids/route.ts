import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { PlaceBidSchema } from '@/lib/validation/marketplace.schema';
import { listBidsForListing, placeBid } from '@/lib/services/marketplace.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

const READ_ROLES = ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer', 'admin', 'secretary'];
const BID_ROLES = ['enterprise', 'consumer', 'admin'];

/** GET /api/marketplace/listings/[id]/bids */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, READ_ROLES);
    const { id } = await ctx.params;
    const data = await listBidsForListing(id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/marketplace/listings/[id]/bids */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuth(req, BID_ROLES);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const parsed = PlaceBidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bid payload', issues: parsed.error.issues }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(actor.userId).select('name email').lean<{ name?: string; email?: string }>();
    const displayName = user?.name ?? user?.email ?? actor.email ?? 'Bidder';

    const data = await placeBid(id, parsed.data, actor.userId, actor.role, displayName);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    const detail = (err as { detail?: Record<string, unknown> }).detail ?? null;
    const status =
      msg === 'LISTING_NOT_FOUND' ? 404
      : msg === 'LISTING_NOT_LIVE' || msg === 'LISTING_ENDED' ? 409
      : msg === 'BID_TOO_LOW' || msg === 'CANNOT_BID_OWN_LISTING' || msg === 'FORBIDDEN_BIDDER_ROLE' || msg === 'CONSUMER_BID_CAP_EXCEEDED' ? 400
      : 500;
    return NextResponse.json({ error: msg, detail }, { status });
  }
}
