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

/**
 * PATCH /api/profile
 * Allows the authenticated user to update their own profile photo.
 * Expects `{ profilePhoto: <data-url string> | null }`.
 * Data URL must be image/jpeg|png|webp and ≤ 500KB decoded.
 */
const MAX_PHOTO_BYTES = 500 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { profilePhoto?: string | null };

    if (!('profilePhoto' in body)) {
      return NextResponse.json({ error: 'profilePhoto field required' }, { status: 400 });
    }

    const photo = body.profilePhoto;

    if (photo === null || photo === '') {
      await connectDB();
      await User.updateOne({ _id: actor.userId }, { $unset: { profilePhoto: 1 } });
      return NextResponse.json({ ok: true, profilePhoto: null });
    }

    if (typeof photo !== 'string' || !photo.startsWith('data:')) {
      return NextResponse.json({ error: 'profilePhoto must be a data URL' }, { status: 400 });
    }

    const match = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
    }
    const [, mime, b64] = match;
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WEBP allowed' }, { status: 400 });
    }
    const decodedBytes = Math.floor((b64.length * 3) / 4);
    if (decodedBytes > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 500KB)' }, { status: 413 });
    }

    await connectDB();
    await User.updateOne({ _id: actor.userId }, { $set: { profilePhoto: photo } });
    return NextResponse.json({ ok: true, profilePhoto: photo });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
