import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, handleAuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FarmerProfile } from '@/lib/models/FarmerProfile';
import { WarehouseProfile } from '@/lib/models/WarehouseProfile';
import { LabProfile } from '@/lib/models/LabProfile';
import { QualityOfficerProfile } from '@/lib/models/QualityOfficerProfile';
import { EnterpriseProfile } from '@/lib/models/EnterpriseProfile';
import { GovtSecretaryProfile } from '@/lib/models/GovtSecretaryProfile';
import { ConsumerProfile } from '@/lib/models/ConsumerProfile';

function maskAadhaar(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `XXXX XXXX ${last4}` : null;
}

function sanitizeRoleProfile(profile: Record<string, unknown> | null) {
  if (!profile) return null;
  const out = { ...profile } as Record<string, unknown>;

  if (typeof out.aadhaarNumber === 'string') {
    out.aadhaarMasked = maskAadhaar(out.aadhaarNumber);
    delete out.aadhaarNumber;
  }

  delete out.__v;
  return out;
}

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
    const aadhaarMasked = maskAadhaar(user.aadhaarNumber ?? user.aadhaarSuffix ?? null);

    let roleProfile: Record<string, unknown> | null = null;
    const profileQuery = { userId: actor.userId };

    if (user.role === 'farmer') {
      roleProfile = await FarmerProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'warehouse') {
      roleProfile = await WarehouseProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'lab') {
      roleProfile = await LabProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'officer') {
      roleProfile = await QualityOfficerProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'enterprise') {
      roleProfile = await EnterpriseProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'secretary') {
      roleProfile = await GovtSecretaryProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    } else if (user.role === 'consumer') {
      roleProfile = await ConsumerProfile.findOne(profileQuery).lean() as Record<string, unknown> | null;
    }

    const { aadhaarNumber: _a, ...safeUser } = user as typeof user & { aadhaarNumber?: string };

    return NextResponse.json({
      ...safeUser,
      aadhaarMasked,
      roleProfile: sanitizeRoleProfile(roleProfile),
    });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
