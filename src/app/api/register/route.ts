import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AnyUserSchema } from '@/lib/validation/user.schema';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { auditLog } from '@/lib/audit';


// ── Public endpoint — no auth required ────────────────────────────────────────
// admin and secretary are excluded from self-registration (provisioned manually)
const SELF_REGISTER_ROLES = new Set([
  'farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer',
]);


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Validate shape + role-specific required fields ────────────────────
    const parsed = AnyUserSchema.safeParse(body);
    if (!parsed.success) {
      const violations = parsed.error.issues.map(
        (e) => `${e.path.join('.') || 'field'}: ${e.message}`
      );
      return NextResponse.json(
        { error: 'Validation failed', violations },
        { status: 400 }
      );
    }

    const { email, password, name, role, ...docs } = parsed.data;

    // ── 2. Block admin/secretary self-registration ───────────────────────────
    if (!SELF_REGISTER_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'This role cannot self-register. Contact an administrator.' },
        { status: 403 }
      );
    }

    await connectDB();

    // ── 3. Duplicate email check ──────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ── 4. Hash password (12 rounds — production safe) ────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── 5. Create user — kycCompleted defaults to false ───────────────────────
    const user = await User.create({
      email:        email.toLowerCase(),
      passwordHash,
      role,
      name,
      kycCompleted: false,
      ...docs,
    });

    // ── 6. Fire-and-forget audit log ──────────────────────────────────────────
    auditLog({
      entityType:  'auth',
      entityId:    String(user._id),
      action:      'register',
      actorUserId: String(user._id),
      actorRole:   role,
      metadata:    { email },
    }).catch((err) => console.error('[auditLog] register failed:', err));

    return NextResponse.json(
      {
        success: true,
        message: 'Account created. Await KYC approval before accessing the platform.',
        userId:  String(user._id),
      },
      { status: 201 }
    );

  } catch (err: any) {
    // MongoDB duplicate key race condition (two simultaneous registrations)
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }
    console.error('[register]', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}