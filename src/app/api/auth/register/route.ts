import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { signToken } from '@/lib/auth';

function generateBlockchainId(email: string): string {
  const hash = crypto.createHash('sha256').update(`honeytrace:${email}:${Date.now()}`).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['farmer','warehouse','lab','officer','enterprise','consumer','admin','secretary']),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { name, email, password, role } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const blockchainId = generateBlockchainId(email);

  const user = await User.create({
    name,
    email:        email.toLowerCase(),
    passwordHash,
    role,
    kycCompleted: false,
    isActive:     true,
    blockchainId,
  });

  const token = signToken({
    userId:       String(user._id),
    email:        user.email,
    role:         user.role,
    kycCompleted: false,
  });

  return NextResponse.json({
    token,
    user: {
      id:           String(user._id),
      name:         user.name,
      email:        user.email,
      role:         user.role,
      kycCompleted: false,
    },
  }, { status: 201 });
}