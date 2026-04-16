import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models/Notification';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    await connectDB();

    const data = await Notification.find({ userId: actor.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId: actor.userId, isRead: false });

    const serialized = data.map((item) => ({
      id: String(item._id),
      userId: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      batchId: item.batchId ?? null,
      isRead: Boolean(item.isRead),
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
    }));

    return NextResponse.json({ notifications: serialized, unreadCount });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
