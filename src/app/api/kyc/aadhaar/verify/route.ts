import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { requireAuth, handleAuthError, AuthError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { verifyAadhaarOtp } from "@/lib/services/aadhaar.service";

const Schema = z.object({
  txnId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "txnId and 6-digit OTP are required" }, { status: 400 });
    }
    const result = await verifyAadhaarOtp(parsed.data.txnId, parsed.data.otp);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    await connectDB();
    const user = await User.findById(actor.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const kyc = result.kycData!;
    user.aadhaarVerified   = true;
    user.aadhaarSuffix     = kyc.aadhaarSuffix;
    user.aadhaarKycName    = kyc.name;
    user.aadhaarKycDob     = kyc.dob;
    user.aadhaarKycGender  = kyc.gender;
    user.aadhaarKycAddress = kyc.address;
    await user.save();
    auditLog({ entityType: "user", entityId: actor.userId, action: "aadhaar_otp_verified",
      actorUserId: actor.userId, actorRole: actor.role, metadata: { aadhaarSuffix: kyc.aadhaarSuffix }
    }).catch(console.error);
    return NextResponse.json({ success: true, message: "Aadhaar KYC verified successfully", aadhaarSuffix: kyc.aadhaarSuffix });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
