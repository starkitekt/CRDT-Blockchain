import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { CreateBatchSchema } from '@/lib/validation/batch.schema';
import { createBatch, listBatches } from '@/lib/services/batch.service';
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

const READ_ROLES = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'admin'];
const WRITE_ROLES = ['farmer', 'admin'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseNumberValue(value: FormDataEntryValue | null): number {
  return Number(value ?? 0);
}

async function saveUploadedImages(
  files: File[],
  latitude: number | null,
  longitude: number | null
): Promise<Array<{ url: string; latitude: number | null; longitude: number | null }>> {
  if (files.length === 0) return [];
  if (files.length > MAX_IMAGE_COUNT) throw new Error('TOO_MANY_IMAGES');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const images: Array<{ url: string; latitude: number | null; longitude: number | null }> = [];
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error('INVALID_IMAGE_TYPE');
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('IMAGE_TOO_LARGE');
    }

    const ext = file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : 'webp';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${safeName}`;
    const filename = uniqueName.endsWith(`.${ext}`) ? uniqueName : `${uniqueName}.${ext}`;
    const fullPath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);
    images.push({ url: `/uploads/${filename}`, latitude, longitude });
  }

  return images;
}

/** GET /api/batches */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, READ_ROLES);

    const farmerId = req.nextUrl.searchParams.get('farmerId') ?? undefined;
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const data = await listBatches(farmerId, status);
    return NextResponse.json(data);
  } catch (err: unknown) {
    if (err instanceof AuthError) return handleAuthError(err);
    if (err instanceof Error && err.message === 'MOISTURE_VIOLATION') {
      return NextResponse.json(
        { error: 'Moisture content exceeds Codex limit of 20%' },
        { status: 422 }
      );
    }
    const msg = process.env.NODE_ENV === 'development'
      ? (err instanceof Error ? err.message : String(err))
      : 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** POST /api/batches */
export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth(req, WRITE_ROLES);

    const contentType = req.headers.get('content-type') ?? '';
    let body: Record<string, unknown>;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const files = form.getAll('images').filter((v): v is File => v instanceof File && v.size > 0);
      const imageLatitudeRaw = String(form.get('imageLatitude') ?? '');
      const imageLongitudeRaw = String(form.get('imageLongitude') ?? '');
      const imageLatitude = imageLatitudeRaw ? Number(imageLatitudeRaw) : null;
      const imageLongitude = imageLongitudeRaw ? Number(imageLongitudeRaw) : null;
      const imageCoords = Number.isFinite(imageLatitude) && Number.isFinite(imageLongitude)
        ? { latitude: imageLatitude as number, longitude: imageLongitude as number }
        : { latitude: null, longitude: null };
      const images = await saveUploadedImages(files, imageCoords.latitude, imageCoords.longitude);

      body = {
        farmerId: String(form.get('farmerId') ?? ''),
        farmerName: String(form.get('farmerName') ?? ''),
        floraType: String(form.get('floraType') ?? ''),
        weightKg: parseNumberValue(form.get('weightKg')),
        moisturePct: parseNumberValue(form.get('moisturePct')),
        latitude: String(form.get('latitude') ?? ''),
        longitude: String(form.get('longitude') ?? ''),
        grade: String(form.get('grade') ?? ''),
        harvestDate: String(form.get('harvestDate') ?? ''),
        warehouseId: form.get('warehouseId') ? String(form.get('warehouseId')) : undefined,
        images,
      };
    } else {
      body = await req.json();
    }

    const parsed = CreateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const warehouse = await User.findOne({ _id: parsed.data.warehouseId, role: 'warehouse' }).select('_id').lean();
    if (!warehouse) {
      return NextResponse.json({ error: 'Invalid warehouseId' }, { status: 400 });
    }

    const data = await createBatch(parsed.data, actor.userId, actor.role);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) return handleAuthError(err);
    if (err instanceof Error && err.message === 'INVALID_IMAGE_TYPE') {
      return NextResponse.json({ error: 'Only jpeg, png, and webp images are allowed' }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'IMAGE_TOO_LARGE') {
      return NextResponse.json({ error: 'Image size must be 5MB or smaller' }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'TOO_MANY_IMAGES') {
      return NextResponse.json({ error: 'You can upload at most 5 images' }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'MOISTURE_VIOLATION') {
      return NextResponse.json(
        { error: 'Moisture content exceeds Codex limit of 20%' },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === 'MISSING_WAREHOUSE_ID') {
      return NextResponse.json({ error: 'warehouseId is required' }, { status: 400 });
    }
    const msg = process.env.NODE_ENV === 'development'
      ? (err instanceof Error ? err.message : String(err))
      : 'Invalid request body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
