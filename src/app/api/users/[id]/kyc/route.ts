import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';
import { auditLog } from '@/lib/audit';
import { verifyUserDocuments } from '@/lib/services/kyc.service';


const KycPatchSchema = z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(), // required on reject, optional on approve
});


/** PATCH /api/users/:id/kyc — admin approves or rejects a user's KYC */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ── Auth — admin only ─────────────────────────────────────────────────────
        const actor = requireAuth(req, ['admin']);

        const body = await req.json();
        const parsed = KycPatchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'action must be "approve" or "reject"' },
                { status: 400 }
            );
        }

        const { action, reason } = parsed.data;

        // Reject requires a reason
        if (action === 'reject' && !reason?.trim()) {
            return NextResponse.json(
                { error: 'reason is required when rejecting KYC' },
                { status: 400 }
            );
        }

        await connectDB();

        const { id } = await params;
        const user = await User.findById(id).select('email role kycCompleted name');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Idempotency — don't re-approve/reject if already in that state
        if (action === 'approve' && user.kycCompleted) {
            return NextResponse.json(
                { error: 'User KYC is already approved' },
                { status: 409 }
            );
        }

        // ── Verify documents before approving ─────────────────────────────────────
        if (action === 'approve') {
            const { passed, results } = await verifyUserDocuments(id);
            if (!passed) {
                return NextResponse.json({
                    error: 'Document verification failed. Cannot approve KYC.',
                    results,
                }, { status: 422 });
            }
        }

        // ── Apply the decision ────────────────────────────────────────────────────
        user.kycCompleted = action === 'approve';
        await user.save();

        // ── Audit log ─────────────────────────────────────────────────────────────
        auditLog({
            entityType: 'user',
            entityId: String(user._id),
            action: `kyc_${action}`,
            actorUserId: actor.userId,
            actorRole: actor.role,
            metadata: { targetEmail: user.email, targetRole: user.role, reason },
        }).catch((err) => console.error('[auditLog] kyc patch failed:', err));

        return NextResponse.json({
            success: true,
            userId: String(user._id),
            email: user.email,
            role: user.role,
            kycCompleted: user.kycCompleted,
            message: action === 'approve'
                ? `KYC approved for ${user.name}`
                : `KYC rejected for ${user.name}: ${reason}`,
        });

    } catch (err) {
        if (err instanceof AuthError) return handleAuthError(err);
        console.error('[kyc patch]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


/** GET /api/users/:id/kyc — admin views a user's KYC status + submitted docs */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        requireAuth(req, ['admin', 'secretary']);

        await connectDB();

        const { id } = await params;
        const user = await User.findById(id).select(
            'email name role kycCompleted ' +
            'fssaiLicense aadhaarNumber pmKisanId gstNumber wdraLicenseNo ' +
            'nablAccreditationNo labRegistrationNo employeeId fssaiOfficerId ' +
            'department jurisdiction cinNumber iecCode mobileNumber createdAt'
        ).lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ data: user });

    } catch (err) {
        if (err instanceof AuthError) return handleAuthError(err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}