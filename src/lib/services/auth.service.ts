import bcrypt from "bcryptjs";
import { connectDB } from "../mongodb";
import { User, VALID_ROLES } from "../models/User";
import { signToken } from "../auth";
import { auditLog } from "../audit";

// Pre-generated valid bcrypt hash — used when user doesn't exist so
// bcrypt.compare always runs, making response time constant (prevents
// timing-based user enumeration attacks).
const DUMMY_HASH =
  "$2b$12$LCAwS7N6L3H5sIZXNuXLFu0TmKnfSUq7LN6GtXn8FGpRKHTXVWKr";

export interface LoginResult {
  role: string;
  token: string;
}

export async function loginUser(
  email: string,
  password: string,
  role: string,
): Promise<LoginResult> {
  await connectDB();

  if (!VALID_ROLES.includes(role as any)) {
    throw new Error("INVALID_ROLE");
  }

  // .select('+passwordHash') in case the field is excluded by default in schema
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash",
  );

  // ── Timing-safe check ─────────────────────────────────────────────────────
  // Always run bcrypt.compare — even when user doesn't exist — so response
  // time is identical for "wrong email" vs "wrong password".
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const match = await bcrypt.compare(password, hashToCompare);

  if (!user || !match) throw new Error("INVALID_CREDENTIALS");
  // ─────────────────────────────────────────────────────────────────────────

  if (user.role !== role) throw new Error("ROLE_MISMATCH");

  const token = signToken({
    userId: String(user._id),
    email: user.email,
    role: user.role,
    kycCompleted: user.kycCompleted ?? false, // ← add this
  });

  // ── Fire-and-forget audit log ─────────────────────────────────────────────
  // A log failure must never block a successful login.
  auditLog({
    entityType: "auth",
    entityId: String(user._id),
    action: "login",
    actorUserId: String(user._id),
    actorRole: user.role,
    metadata: { email },
  }).catch((err) => console.error("[auditLog] failed to record login:", err));
  // ─────────────────────────────────────────────────────────────────────────

  return { role: user.role, token };
}
