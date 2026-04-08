// src/lib/env.ts
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'MONGODB_URI',
  'NODE_ENV',
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  JWT_SECRET:   process.env.JWT_SECRET!,
  MONGODB_URI:  process.env.MONGODB_URI!,
  NODE_ENV:     process.env.NODE_ENV!,
} as const;