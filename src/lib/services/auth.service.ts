import bcrypt from 'bcryptjs';
import { connectDB } from '../mongodb';
import { User, VALID_ROLES } from '../models/User';
import { signToken } from '../auth';
import { auditLog } from '../audit';

export interface LoginResult {
  role: string;
  token: string;
}

export async function loginUser(
  email: string,
  password: string,
  role: string
): Promise<LoginResult> {
  await connectDB();

  if (!VALID_ROLES.includes(role as any)) {
    throw new Error('INVALID_ROLE');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new Error('INVALID_CREDENTIALS');

  if (user.role !== role) throw new Error('ROLE_MISMATCH');

  const token = signToken({
    userId: String(user._id),
    email: user.email,
    role: user.role,
  });

  await auditLog({
    entityType: 'auth',
    entityId: String(user._id),
    action: 'login',
    actorUserId: String(user._id),
    actorRole: user.role,
    metadata: { email },
  });

  return { role: user.role, token };
}
