import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, handleAuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { AuditLog } from '@/lib/models/AuditLog';
import { z } from 'zod';

const PatchUserSchema = z.object({
  kycCompleted: z.boolean().optional(),
  kycRejected: z.boolean().optional(),
  kycRejectReason: z.string().max(500).optional(),
  role: z.enum(['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'admin', 'secretary']).optional(),
  isActive: z.boolean().optional(),
  fssaiLicense: z.string().optional(),
  gstNumber: z.string().optional(),
  nablAccreditationNo: z.string().optional(),
}).strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, ['admin', 'secretary']);

    const { id } = await params;
    await connectDB();

    const user = await User.findById(id).select('-passwordHash -__v').lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor: Awaited<ReturnType<typeof requireAuth>>;
  try {
    actor = await requireAuth(req, ['admin', 'secretary']);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  await connectDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updates = parsed.data;

  if (updates.kycCompleted !== undefined) {
    user.kycCompleted = updates.kycCompleted;
    user.kycVerifiedAt = updates.kycCompleted ? new Date() : undefined;
    user.kycRejected = updates.kycCompleted ? false : user.kycRejected;
  }
  if (updates.kycRejected !== undefined) {
    user.kycRejected = updates.kycRejected;
    user.kycRejectReason = updates.kycRejectReason ?? '';
    user.kycCompleted = updates.kycRejected ? false : user.kycCompleted;
  }
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;
  if (updates.fssaiLicense !== undefined) user.fssaiLicense = updates.fssaiLicense;
  if (updates.gstNumber !== undefined) user.gstNumber = updates.gstNumber;
  if (updates.nablAccreditationNo !== undefined) user.nablAccreditationNo = updates.nablAccreditationNo;

  await user.save();

  AuditLog.create({
    entityType: 'user',
    entityId: id,
    action: 'user_updated',
    actorUserId: actor.userId,
    actorRole: actor.role,
    metadata: updates,
  }).catch(() => {});

  const { passwordHash: _, __v, ...clean } =
    user.toObject() as Record<string, unknown>;

  return NextResponse.json(clean);
}
