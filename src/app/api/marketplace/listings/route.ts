import { NextRequest, NextResponse } from 'next/server';
import { CreateListingSchema } from '@/lib/validation/marketplace.schema';
import { createListing, listListings, sweepExpiredListings, type ListingFilter } from '@/lib/services/marketplace.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

const READ_ROLES = ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer', 'admin', 'secretary'];
const WRITE_ROLES = ['farmer', 'admin'];

/** GET /api/marketplace/listings */
export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuth(req, READ_ROLES);

    // Lazily settle anything past its endsAt — keeps the table truthful.
    await sweepExpiredListings();

    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const scope = req.nextUrl.searchParams.get('scope') ?? undefined;
    const filter: ListingFilter = {};
    if (status === 'live' || status === 'settled' || status === 'cancelled' || status === 'unsold') {
      filter.status = status;
    }

    if (scope === 'mine') {
      if (actor.role === 'farmer') filter.farmerId = actor.userId;
      else if (actor.role === 'warehouse') filter.warehouseId = actor.userId;
      else if (actor.role === 'enterprise' || actor.role === 'consumer') filter.bidderId = actor.userId;
    }

    const data = await listListings(filter);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/marketplace/listings */
export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth(req, WRITE_ROLES);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid listing payload', issues: parsed.error.issues }, { status: 400 });
    }
    const data = await createListing(parsed.data, actor.userId, actor.role);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    const status =
      msg === 'BATCH_NOT_FOUND' ? 404
      : msg === 'BATCH_NOT_ELIGIBLE' || msg === 'NOT_BATCH_OWNER' || msg === 'BATCH_HAS_NO_WAREHOUSE' ? 400
      : msg === 'LISTING_ALREADY_EXISTS' ? 409
      : msg === 'WAREHOUSE_NOT_FOUND' ? 404
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
