import { NextRequest, NextResponse } from 'next/server';
import { batches } from '@/lib/store';
import type { Batch } from '@/lib/store';

/** GET /api/batches/:id — fetch single batch */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const batch = batches.get(id);
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  return NextResponse.json({ data: batch });
}

/** PATCH /api/batches/:id — update batch status or add tx hash */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const batch = batches.get(id);
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

  const body = await req.json() as Partial<Batch>;
  const updated: Batch = { ...batch, ...body };
  batches.set(id, updated);
  return NextResponse.json({ data: updated });
}
