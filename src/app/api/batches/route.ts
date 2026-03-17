import { NextRequest, NextResponse } from 'next/server';
import { batches, getNextBatchSeq, Batch } from '@/lib/store';

/** GET /api/batches — list batches; supports ?farmerId=X and/or ?status=X filters */
export async function GET(req: NextRequest) {
  const farmerId = req.nextUrl.searchParams.get('farmerId');
  const status   = req.nextUrl.searchParams.get('status');
  let result = Array.from(batches.values());
  if (farmerId) result = result.filter(b => b.farmerId === farmerId);
  if (status)   result = result.filter(b => b.status   === status);
  return NextResponse.json({ data: result });
}

/** POST /api/batches — record a new harvest batch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<Batch, 'id' | 'status' | 'createdAt'>;

    // Validate required fields
    if (!body.farmerId || !body.floraType || !body.weightKg || !body.latitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Codex Stan 12-1981 moisture check
    if (body.moisturePct > 20) {
      return NextResponse.json({ error: 'Moisture content exceeds Codex limit of 20%' }, { status: 422 });
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = getNextBatchSeq();
    const id = `HT-${datePart}-${seq}`;

    const batch: Batch = {
      ...body,
      id,
      status: 'pending',
      createdAt: now.toISOString(),
    };

    batches.set(id, batch);
    return NextResponse.json({ data: batch }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
