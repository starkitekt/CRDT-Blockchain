import { NextRequest, NextResponse } from 'next/server';
import { labResults, batches, LabResult } from '@/lib/store';

/** GET /api/lab — list all lab results */
export async function GET() {
  return NextResponse.json({ data: Array.from(labResults.values()) });
}

/** POST /api/lab — publish lab results for a batch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<LabResult, 'publishedAt'>;

    if (!body.batchId || !body.fssaiLicense) {
      return NextResponse.json({ error: 'batchId and fssaiLicense are required' }, { status: 400 });
    }

    const batch = batches.get(body.batchId);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    // Codex Stan 12-1981 validation
    const violations: string[] = [];
    if (body.moisture > 20) violations.push('Moisture > 20% (Codex limit)');
    if (body.hmf > 40) violations.push('HMF > 40 mg/kg (Codex limit)');
    if (body.diastase < 8) violations.push('Diastase < 8 DN (Codex minimum)');
    if (body.sucrose > 5) violations.push('Sucrose > 5 g/100g (Codex limit)');
    if (body.reducingSugars < 60) violations.push('Reducing sugars < 60 g/100g (Codex minimum)');
    if (body.acidity > 50) violations.push('Free acidity > 50 meq/kg (Codex limit)');

    if (violations.length > 0) {
      return NextResponse.json({
        error: 'Codex Stan 12-1981 violations detected',
        violations,
        conformanceStatus: 'NON_CONFORMANT',
      }, { status: 422 });
    }

    const result: LabResult = { ...body, publishedAt: new Date().toISOString() };
    labResults.set(body.batchId, result);

    // Update batch status to in_testing → certified
    batches.set(body.batchId, { ...batch, status: 'certified' });

    return NextResponse.json({ data: result, violations: [] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
