import { NextRequest, NextResponse } from 'next/server';
import { POST as authRegisterPost } from '@/app/api/auth/register/route';

type LegacyPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  aadhaarNumber?: string;
  pmKisanId?: string;
  fssaiLicense?: string;
  gstNumber?: string;
  wdraLicenseNo?: string;
  labRegistrationNo?: string;
  employeeId?: string;
  department?: string;
  jurisdiction?: string;
  [key: string]: unknown;
};

function toRoleAwarePayload(body: LegacyPayload) {
  if (body?.profile && typeof body.profile === 'object') return body;

  const role = String(body.role ?? '');
  const payload: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    password: body.password,
    role,
    profile: {},
  };

  const profile = payload.profile as Record<string, unknown>;

  if (role === 'farmer') {
    profile.aadhaarNumber = body.aadhaarNumber;
    profile.kisanCard = body.pmKisanId;
    profile.farmLocation = body.farmLocation ?? {
      village: body.village ?? '',
      district: body.district ?? '',
      state: body.state ?? '',
    };
  } else if (role === 'warehouse') {
    profile.aadhaarNumber = body.aadhaarNumber;
    profile.warehouseName = body.warehouseName ?? body.name ?? '';
    profile.registrationNumber = body.registrationNumber ?? body.wdraLicenseNo ?? '';
    profile.storageCapacity = body.storageCapacity;
    profile.location = body.location ?? {
      address: body.address ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
      pincode: body.pincode ?? '',
    };
  } else if (role === 'lab') {
    profile.aadhaarNumber = body.aadhaarNumber;
    profile.labName = body.labName ?? body.name ?? '';
    profile.fssaiLabNumber = body.fssaiLabNumber ?? body.labRegistrationNo ?? body.fssaiLicense ?? '';
    profile.location = body.location ?? {
      address: body.address ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
    };
  } else if (role === 'officer') {
    profile.aadhaarNumber = body.aadhaarNumber;
    profile.employeeId = body.employeeId;
    profile.department = body.department;
    profile.authorityLevel = body.authorityLevel;
  } else if (role === 'enterprise') {
    profile.companyName = body.companyName ?? body.name ?? '';
    profile.gstNumber = body.gstNumber;
    profile.fssaiLicense = body.fssaiLicense;
    profile.companyPan = body.companyPan;
    profile.businessType = body.businessType;
    profile.contactPerson = body.contactPerson ?? { name: body.name ?? '', designation: '' };
    profile.facilityLocation = body.facilityLocation ?? {
      address: body.address ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
    };
  } else if (role === 'secretary') {
    profile.aadhaarNumber = body.aadhaarNumber;
    profile.employeeId = body.employeeId;
    profile.department = body.department;
    profile.jurisdiction = body.jurisdiction ?? { level: '', region: '' };
  } else if (role === 'consumer') {
    profile.aadhaarNumber = body.aadhaarNumber;
  }

  return payload;
}

export async function POST(req: NextRequest) {
  let body: LegacyPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const normalizedPayload = toRoleAwarePayload(body);
  const forwardedReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(normalizedPayload),
  });

  return authRegisterPost(forwardedReq);
}
