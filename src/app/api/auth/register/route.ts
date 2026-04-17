import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FarmerProfile } from '@/lib/models/FarmerProfile';
import { WarehouseProfile } from '@/lib/models/WarehouseProfile';
import { LabProfile } from '@/lib/models/LabProfile';
import { QualityOfficerProfile } from '@/lib/models/QualityOfficerProfile';
import { EnterpriseProfile } from '@/lib/models/EnterpriseProfile';
import { GovtSecretaryProfile } from '@/lib/models/GovtSecretaryProfile';
import { ConsumerProfile } from '@/lib/models/ConsumerProfile';
import { signToken } from '@/lib/auth';

function generateBlockchainId(email: string): string {
  const hash = crypto.createHash('sha256').update(`honeytrace:${email}:${Date.now()}`).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['farmer','warehouse','lab','officer','enterprise','consumer','admin','secretary']),
  profile: z.object({
    kisanCard: z.string().min(1).optional(),
    aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional(),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must be valid').optional(),
    farmLocation: z.object({
      village: z.string().min(1),
      district: z.string().min(1),
      state: z.string().min(1),
      geo: z.tuple([z.number(), z.number()]).optional(),
    }).optional(),
    honeyProductionCapacity: z.number().nonnegative().optional(),
    organicCertified: z.boolean().optional(),
    warehouseName: z.string().min(1).optional(),
    registrationNumber: z.string().min(1).optional(),
    location: z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      pincode: z.string().min(1).optional(),
      geo: z.tuple([z.number(), z.number()]).optional(),
    }).optional(),
    storageCapacity: z.number().nonnegative().optional(),
    currentUtilization: z.number().nonnegative().optional(),
    temperatureControlled: z.boolean().optional(),
    humidityControl: z.boolean().optional(),
    labName: z.string().min(1).optional(),
    fssaiLabNumber: z.string().min(1).optional(),
    certifications: z.array(z.string().min(1)).optional(),
    testingCapabilities: z.object({
      purityTest: z.boolean().optional(),
      adulterationTest: z.boolean().optional(),
      moistureTest: z.boolean().optional(),
    }).optional(),
    authorityLevel: z.enum(['regional', 'state', 'national']).optional(),
    labAffiliation: z.string().min(1).optional(),
    employeeId: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    businessType: z.enum(['buyer', 'processor', 'exporter']).optional(),
    contactPerson: z.object({
      name: z.string().min(1),
      designation: z.string().min(1),
    }).optional(),
    facilityLocation: z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
    }).optional(),
    processingCapacity: z.number().nonnegative().optional(),
    gstNumber: z.string().min(1).optional(),
    fssaiLicense: z.string().min(1).optional(),
    companyPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must be valid').optional(),
    jurisdiction: z.object({
      level: z.enum(['district', 'state', 'national']),
      region: z.string().min(1),
    }).optional(),
    permissions: z.object({
      approveStakeholders: z.boolean().optional(),
      auditAccess: z.boolean().optional(),
      complianceControl: z.boolean().optional(),
    }).optional(),
    preferences: z.object({
      organicOnly: z.boolean().optional(),
      preferredRegions: z.array(z.string().min(1)).optional(),
    }).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { name, email, password, role, profile } = parsed.data;

  if (role === 'farmer') {
    const hasAadhaar = Boolean(profile?.aadhaarNumber);
    const hasPan = Boolean(profile?.panNumber);
    if (!hasAadhaar && !hasPan) {
      return NextResponse.json(
        { error: 'Farmer must provide either Aadhaar number or PAN number' },
        { status: 422 }
      );
    }
    if (!profile?.farmLocation?.village || !profile.farmLocation.district || !profile.farmLocation.state) {
      return NextResponse.json(
        { error: 'Farmer farmLocation (village, district, state) is required' },
        { status: 422 }
      );
    }
  }

  if (role === 'warehouse') {
    const hasAadhaar = Boolean(profile?.aadhaarNumber);
    const hasPan = Boolean(profile?.panNumber);
    if (!hasAadhaar && !hasPan) {
      return NextResponse.json(
        { error: 'Warehouse must provide either Aadhaar number or PAN number' },
        { status: 422 }
      );
    }
    if (!profile?.warehouseName || !profile.registrationNumber) {
      return NextResponse.json(
        { error: 'Warehouse name and registration number are required' },
        { status: 422 }
      );
    }
    if (
      !profile?.location?.address ||
      !profile.location.city ||
      !profile.location.state ||
      !profile.location.pincode
    ) {
      return NextResponse.json(
        { error: 'Warehouse location (address, city, state, pincode) is required' },
        { status: 422 }
      );
    }
    if (profile.storageCapacity == null) {
      return NextResponse.json(
        { error: 'Warehouse storageCapacity is required' },
        { status: 422 }
      );
    }
  }
  if (role === 'lab') {
    const hasAadhaar = Boolean(profile?.aadhaarNumber);
    const hasPan = Boolean(profile?.panNumber);
    if (!hasAadhaar && !hasPan) {
      return NextResponse.json(
        { error: 'Lab must provide either Aadhaar number or PAN number' },
        { status: 422 }
      );
    }
    if (!profile?.labName || !profile.fssaiLabNumber) {
      return NextResponse.json(
        { error: 'Lab name and fssaiLabNumber are required' },
        { status: 422 }
      );
    }
    if (!profile?.location?.address || !profile.location.city || !profile.location.state) {
      return NextResponse.json(
        { error: 'Lab location (address, city, state) is required' },
        { status: 422 }
      );
    }
  }
  if (role === 'officer') {
    const hasAadhaar = Boolean(profile?.aadhaarNumber);
    const hasPan = Boolean(profile?.panNumber);
    if (!hasAadhaar && !hasPan) {
      return NextResponse.json(
        { error: 'Officer must provide either Aadhaar number or PAN number' },
        { status: 422 }
      );
    }
    if (!profile?.employeeId || !profile.department) {
      return NextResponse.json(
        { error: 'Officer employeeId and department are required' },
        { status: 422 }
      );
    }
    if (!profile?.authorityLevel) {
      return NextResponse.json(
        { error: 'Officer authorityLevel is required' },
        { status: 422 }
      );
    }
  }
  if (role === 'enterprise') {
    if (!profile?.companyName) {
      return NextResponse.json({ error: 'Enterprise companyName is required' }, { status: 422 });
    }
    if (!profile?.gstNumber || !profile?.fssaiLicense) {
      return NextResponse.json({ error: 'Enterprise gstNumber and fssaiLicense are required' }, { status: 422 });
    }
    if (!profile?.businessType) {
      return NextResponse.json({ error: 'Enterprise businessType is required' }, { status: 422 });
    }
    if (!profile?.companyPan) {
      return NextResponse.json({ error: 'Enterprise companyPan is required' }, { status: 422 });
    }
    if (!profile?.contactPerson?.name || !profile.contactPerson.designation) {
      return NextResponse.json({ error: 'Enterprise contactPerson name and designation are required' }, { status: 422 });
    }
    if (!profile?.facilityLocation?.address || !profile.facilityLocation.city || !profile.facilityLocation.state) {
      return NextResponse.json({ error: 'Enterprise facilityLocation address/city/state are required' }, { status: 422 });
    }
  }
  if (role === 'secretary') {
    const hasAadhaar = Boolean(profile?.aadhaarNumber);
    const hasPan = Boolean(profile?.panNumber);
    if (!hasAadhaar && !hasPan) {
      return NextResponse.json(
        { error: 'Secretary must provide either Aadhaar number or PAN number' },
        { status: 422 }
      );
    }
    if (!profile?.employeeId || !profile.department) {
      return NextResponse.json(
        { error: 'Secretary employeeId and department are required' },
        { status: 422 }
      );
    }
    if (!profile?.jurisdiction?.level || !profile.jurisdiction.region) {
      return NextResponse.json(
        { error: 'Secretary jurisdiction level and region are required' },
        { status: 422 }
      );
    }
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const blockchainId = generateBlockchainId(email);

  let user: Awaited<ReturnType<typeof User.create>> | null = null;
  try {
    user = await User.create({
      name,
      email:        email.toLowerCase(),
      passwordHash,
      role,
      kycCompleted: false,
      isActive:     true,
      blockchainId,
    });

    if (role === 'farmer') {
      await FarmerProfile.create({
        userId: user._id,
        kisanCard: profile?.kisanCard,
        aadhaarNumber: profile?.aadhaarNumber,
        panNumber: profile?.panNumber,
        farmLocation: {
          village: profile?.farmLocation?.village,
          district: profile?.farmLocation?.district,
          state: profile?.farmLocation?.state,
          geo:
            Array.isArray(profile?.farmLocation?.geo) && profile.farmLocation.geo.length === 2
              ? profile.farmLocation.geo
              : null,
        },
        honeyProductionCapacity: profile?.honeyProductionCapacity,
        organicCertified: profile?.organicCertified ?? false,
      });
    }
    if (role === 'warehouse') {
      await WarehouseProfile.create({
        userId: user._id,
        warehouseName: profile?.warehouseName,
        registrationNumber: profile?.registrationNumber,
        aadhaarNumber: profile?.aadhaarNumber,
        panNumber: profile?.panNumber,
        location: {
          address: profile?.location?.address,
          city: profile?.location?.city,
          state: profile?.location?.state,
          pincode: profile?.location?.pincode,
          geo:
            Array.isArray(profile?.location?.geo) && profile.location.geo.length === 2
              ? profile.location.geo
              : null,
        },
        storageCapacity: profile?.storageCapacity,
        currentUtilization: profile?.currentUtilization,
        temperatureControlled: profile?.temperatureControlled ?? false,
        humidityControl: profile?.humidityControl ?? false,
      });
    }
    if (role === 'lab') {
      await LabProfile.create({
        userId: user._id,
        labName: profile?.labName,
        fssaiLabNumber: profile?.fssaiLabNumber,
        aadhaarNumber: profile?.aadhaarNumber,
        panNumber: profile?.panNumber,
        certifications: profile?.certifications ?? [],
        testingCapabilities: {
          purityTest: profile?.testingCapabilities?.purityTest ?? false,
          adulterationTest: profile?.testingCapabilities?.adulterationTest ?? false,
          moistureTest: profile?.testingCapabilities?.moistureTest ?? false,
        },
        location: {
          address: profile?.location?.address,
          city: profile?.location?.city,
          state: profile?.location?.state,
        },
      });
    }
    if (role === 'officer') {
      await QualityOfficerProfile.create({
        userId: user._id,
        employeeId: profile?.employeeId,
        department: profile?.department,
        aadhaarNumber: profile?.aadhaarNumber,
        panNumber: profile?.panNumber,
        authorityLevel: profile?.authorityLevel,
        labAffiliation: profile?.labAffiliation,
      });
    }
    if (role === 'enterprise') {
      await EnterpriseProfile.create({
        userId: user._id,
        companyName: profile?.companyName,
        gstNumber: profile?.gstNumber,
        fssaiLicense: profile?.fssaiLicense,
        companyPan: profile?.companyPan,
        businessType: profile?.businessType,
        contactPerson: {
          name: profile?.contactPerson?.name,
          designation: profile?.contactPerson?.designation,
        },
        facilityLocation: {
          address: profile?.facilityLocation?.address,
          city: profile?.facilityLocation?.city,
          state: profile?.facilityLocation?.state,
        },
        processingCapacity: profile?.processingCapacity,
      });
    }
    if (role === 'secretary') {
      await GovtSecretaryProfile.create({
        userId: user._id,
        employeeId: profile?.employeeId,
        department: profile?.department,
        aadhaarNumber: profile?.aadhaarNumber,
        panNumber: profile?.panNumber,
        jurisdiction: {
          level: profile?.jurisdiction?.level,
          region: profile?.jurisdiction?.region,
        },
        permissions: {
          approveStakeholders: profile?.permissions?.approveStakeholders ?? false,
          auditAccess: profile?.permissions?.auditAccess ?? false,
          complianceControl: profile?.permissions?.complianceControl ?? false,
        },
      });
    }
    if (role === 'consumer') {
      await ConsumerProfile.create({
        userId: user._id,
        aadhaarNumber: profile?.aadhaarNumber,
        preferences: {
          organicOnly: profile?.preferences?.organicOnly ?? false,
          preferredRegions: profile?.preferences?.preferredRegions ?? [],
        },
      });
    }
  } catch (err) {
    console.error('[auth/register] registration failed:', err);
    if (user?._id) {
      await User.findByIdAndDelete(user._id).catch((rollbackErr) => {
        console.error('[auth/register] rollback failed:', rollbackErr);
      });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }

  const token = signToken({
    userId:       String(user._id),
    email:        user.email,
    role:         user.role,
    kycCompleted: false,
  });

  return NextResponse.json({
    token,
    user: {
      id:           String(user._id),
      name:         user.name,
      email:        user.email,
      role:         user.role,
      kycCompleted: false,
    },
  }, { status: 201 });
}
