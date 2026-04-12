import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleAuthError, AuthError } from "@/lib/rbac";
import { initiateAadhaarOtp } from "@/lib/services/aadhaar.service";

const Schema = z.object({
  aadhaarNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().length(12).regex(/^\d{12}$/, "Must be 12 digits")),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Aadhaar number must be exactly 12 digits" }, { status: 400 });
    }
    const result = await initiateAadhaarOtp(actor.userId, parsed.data.aadhaarNumber);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ success: true, txnId: result.txnId, message: result.message });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
