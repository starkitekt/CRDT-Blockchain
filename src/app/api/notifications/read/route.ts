import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models/Notification';

const MarkReadSchema = z.object({
  notificationId: z.string().min(1).optional(),
  all: z.boolean().optional(),
}).refine(
  (value) => Boolean(value.all) || Boolean(value.notificationId),
  { message: 'notificationId or all=true is required' }
);

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const body = await req.json();
    const parsed = MarkReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'notificationId or all=true is required' }, { status: 400 });
    }

    await connectDB();
    if (parsed.data.all) {
      const result = await Notification.updateMany(
        { userId: actor.userId, isRead: false },
        { $set: { isRead: true } }
      );
      return NextResponse.json({ all: true, modifiedCount: result.modifiedCount });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: parsed.data.notificationId, userId: actor.userId },
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: String(updated._id),
      isRead: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
