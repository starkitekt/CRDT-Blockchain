import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRES = '8h';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in .env.local');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!JWT_SECRET) return null;
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
