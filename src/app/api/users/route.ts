import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';


/** GET /api/users?kycCompleted=false — admin KYC queue */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ['admin', 'secretary']);

    await connectDB();

    const kycParam = req.nextUrl.searchParams.get('kycCompleted');
    const filter: Record<string, unknown> = {};
    if (kycParam !== null) {
      filter.kycCompleted = kycParam === 'true';
      if (kycParam === 'false') {
        filter.kycRejected = { $ne: true };
      }
    }

    const users = await User.find(filter)
      .select('email name role kycCompleted kycRejected fssaiLicense gstNumber nablAccreditationNo createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);

  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
