import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, handleAuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

/**
 * GET /api/profile
 * Returns the authenticated user's own profile.
 * Aadhaar number is always masked server-side — only last 4 digits exposed.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    await connectDB();

    const user = await User.findById(actor.userId)
      .select('-passwordHash -__v')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mask Aadhaar: never expose full number to client
    let aadhaarMasked: string | null = null;
    const raw = user.aadhaarNumber ?? user.aadhaarSuffix ?? null;
    if (raw) {
      const digits = raw.replace(/\D/g, '');
      const last4  = digits.slice(-4);
      aadhaarMasked = `XXXX XXXX ${last4}`;
    }

    const { aadhaarNumber: _a, ...safeUser } = user as typeof user & { aadhaarNumber?: string };

    return NextResponse.json({
      ...safeUser,
      aadhaarMasked,
    });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
