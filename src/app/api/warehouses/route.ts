import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { WarehouseProfile } from '@/lib/models/WarehouseProfile';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ['farmer', 'admin']);
    await connectDB();

    const warehouses = await User.find({ role: 'warehouse' })
      .select('_id name jurisdiction aadhaarKycAddress storageCapacity currentUtilization')
      .sort({ name: 1 })
      .lean();

    const warehouseIds = warehouses.map((w) => w._id);
    const profiles = await WarehouseProfile.find({ userId: { $in: warehouseIds } })
      .select('userId storageCapacity currentUtilization')
      .lean();

    const rawLegacyUsers = await User.collection
      .find(
        { _id: { $in: warehouseIds } },
        { projection: { _id: 1, storageCapacity: 1, currentUtilization: 1 } }
      )
      .toArray();

    const profileByUserId = new Map(
      profiles.map((p) => [
        String(p.userId),
        {
          storageCapacity: typeof p.storageCapacity === 'number' ? p.storageCapacity : null,
          currentUtilization: typeof p.currentUtilization === 'number' ? p.currentUtilization : 0,
        },
      ])
    );

    const rawFallbackByUserId = new Map(
      rawLegacyUsers.map((w) => {
        const legacyStorage = (w as { storageCapacity?: unknown }).storageCapacity;
        const legacyUtilization = (w as { currentUtilization?: unknown }).currentUtilization;
        return [
          String(w._id),
          {
            storageCapacity: typeof legacyStorage === 'number' ? legacyStorage : null,
            currentUtilization: typeof legacyUtilization === 'number' ? legacyUtilization : 0,
          },
        ];
      })
    );

    const fallbackByUserId = new Map(
      warehouses.map((w) => {
        const fromRaw = rawFallbackByUserId.get(String(w._id));
        if (fromRaw) return [String(w._id), fromRaw] as const;
        const legacyStorage = (w as unknown as { storageCapacity?: unknown }).storageCapacity;
        const legacyUtilization = (w as unknown as { currentUtilization?: unknown }).currentUtilization;
        return [
          String(w._id),
          {
            storageCapacity: typeof legacyStorage === 'number' ? legacyStorage : null,
            currentUtilization: typeof legacyUtilization === 'number' ? legacyUtilization : 0,
          },
        ] as const;
      })
    );

    return NextResponse.json(
      warehouses.map((w) => ({
        id: String(w._id),
        name: w.name ?? 'Unnamed Warehouse',
        location: w.jurisdiction ?? w.aadhaarKycAddress ?? null,
        totalCapacity:
          profileByUserId.get(String(w._id))?.storageCapacity
          ?? fallbackByUserId.get(String(w._id))?.storageCapacity
          ?? null,
        remainingCapacity: (() => {
          const profile = profileByUserId.get(String(w._id)) ?? fallbackByUserId.get(String(w._id));
          if (!profile || profile.storageCapacity == null) return null;
          return Math.max(0, profile.storageCapacity - (profile.currentUtilization ?? 0));
        })(),
      }))
    );
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
