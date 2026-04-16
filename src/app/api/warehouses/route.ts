import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ['farmer', 'admin']);
    await connectDB();

    const warehouses = await User.find({ role: 'warehouse' })
      .select('_id name jurisdiction aadhaarKycAddress')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      warehouses.map((w) => ({
        id: String(w._id),
        name: w.name ?? 'Unnamed Warehouse',
        location: w.jurisdiction ?? w.aadhaarKycAddress ?? null,
      }))
    );
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
