import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FarmerProfile } from '@/lib/models/FarmerProfile';
import { WarehouseProfile } from '@/lib/models/WarehouseProfile';
import { LabProfile } from '@/lib/models/LabProfile';
import { QualityOfficerProfile } from '@/lib/models/QualityOfficerProfile';
import { EnterpriseProfile } from '@/lib/models/EnterpriseProfile';
import { GovtSecretaryProfile } from '@/lib/models/GovtSecretaryProfile';
import { ConsumerProfile } from '@/lib/models/ConsumerProfile';

const ProfileSchema = z.object({
  // Farmer
  kisanCard:              z.string().min(1).optional(),
  aadhaarNumber:          z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional(),
  panNumber:              z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  farmLocation: z.object({
    village:  z.string().min(1),
    district: z.string().min(1),
    state:    z.string().min(1),
    geo:      z.tuple([z.number(), z.number()]).optional(),
  }).optional(),
  honeyProductionCapacity: z.number().nonnegative().optional(),
  organicCertified:        z.boolean().optional(),
  // Warehouse
  warehouseName:        z.string().min(1).optional(),
  registrationNumber:   z.string().min(1).optional(),
  location: z.object({
    address: z.string().min(1),
    city:    z.string().min(1),
    state:   z.string().min(1),
    pincode: z.string().min(1).optional(),
    geo:     z.tuple([z.number(), z.number()]).optional(),
  }).optional(),
  storageCapacity:      z.number().nonnegative().optional(),
  currentUtilization:   z.number().nonnegative().optional(),
  temperatureControlled: z.boolean().optional(),
  humidityControl:       z.boolean().optional(),
  // Lab
  labName:        z.string().min(1).optional(),
  fssaiLabNumber: z.string().min(1).optional(),
  certifications: z.array(z.string().min(1)).optional(),
  testingCapabilities: z.object({
    purityTest:       z.boolean().optional(),
    adulterationTest: z.boolean().optional(),
    moistureTest:     z.boolean().optional(),
  }).optional(),
  // Officer
  employeeId:     z.string().min(1).optional(),
  department:     z.string().min(1).optional(),
  authorityLevel: z.enum(['regional', 'state', 'national']).optional(),
  labAffiliation: z.string().min(1).optional(),
  // Enterprise
  companyName:   z.string().min(1).optional(),
  gstNumber:     z.string().min(1).optional(),
  fssaiLicense:  z.string().min(1).optional(),
  companyPan:    z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  businessType:  z.enum(['buyer', 'processor', 'exporter']).optional(),
  contactPerson: z.object({
    name:        z.string().min(1),
    designation: z.string().min(1),
  }).optional(),
  facilityLocation: z.object({
    address: z.string().min(1),
    city:    z.string().min(1),
    state:   z.string().min(1),
  }).optional(),
  processingCapacity: z.number().nonnegative().optional(),
  // Secretary
  jurisdiction: z.object({
    level:  z.enum(['district', 'state', 'national']),
    region: z.string().min(1),
  }).optional(),
  permissions: z.object({
    approveStakeholders: z.boolean().optional(),
    auditAccess:         z.boolean().optional(),
    complianceControl:   z.boolean().optional(),
  }).optional(),
  // Consumer
  preferences: z.object({
    organicOnly:      z.boolean().optional(),
    preferredRegions: z.array(z.string().min(1)).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const cookieToken = req.cookies.get('honeytrace_token')?.value;
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken ?? bearerToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }

  const p = parsed.data;
  const { role, userId } = payload;

  await connectDB();

  // Role-specific validation
  if (role === 'farmer') {
    if (!p.aadhaarNumber && !p.panNumber)
      return NextResponse.json({ error: 'Farmer must provide Aadhaar or PAN' }, { status: 422 });
    if (!p.farmLocation?.village || !p.farmLocation.district || !p.farmLocation.state)
      return NextResponse.json({ error: 'Farm location (village, district, state) is required' }, { status: 422 });
  }
  if (role === 'warehouse') {
    if (!p.aadhaarNumber && !p.panNumber)
      return NextResponse.json({ error: 'Warehouse must provide Aadhaar or PAN' }, { status: 422 });
    if (!p.warehouseName || !p.registrationNumber)
      return NextResponse.json({ error: 'Warehouse name and registration number are required' }, { status: 422 });
    if (!p.location?.address || !p.location.city || !p.location.state || !p.location.pincode)
      return NextResponse.json({ error: 'Warehouse location (address, city, state, pincode) is required' }, { status: 422 });
    if (p.storageCapacity == null)
      return NextResponse.json({ error: 'Storage capacity is required' }, { status: 422 });
  }
  if (role === 'lab') {
    if (!p.aadhaarNumber && !p.panNumber)
      return NextResponse.json({ error: 'Lab must provide Aadhaar or PAN' }, { status: 422 });
    if (!p.labName || !p.fssaiLabNumber)
      return NextResponse.json({ error: 'Lab name and FSSAI number are required' }, { status: 422 });
    if (!p.location?.address || !p.location.city || !p.location.state)
      return NextResponse.json({ error: 'Lab location is required' }, { status: 422 });
  }
  if (role === 'officer') {
    if (!p.aadhaarNumber && !p.panNumber)
      return NextResponse.json({ error: 'Officer must provide Aadhaar or PAN' }, { status: 422 });
    if (!p.employeeId || !p.department)
      return NextResponse.json({ error: 'Employee ID and department are required' }, { status: 422 });
    if (!p.authorityLevel)
      return NextResponse.json({ error: 'Authority level is required' }, { status: 422 });
  }
  if (role === 'enterprise') {
    if (!p.companyName || !p.gstNumber || !p.fssaiLicense || !p.companyPan || !p.businessType)
      return NextResponse.json({ error: 'Company details are required' }, { status: 422 });
    if (!p.contactPerson?.name || !p.contactPerson.designation)
      return NextResponse.json({ error: 'Contact person details are required' }, { status: 422 });
    if (!p.facilityLocation?.address || !p.facilityLocation.city || !p.facilityLocation.state)
      return NextResponse.json({ error: 'Facility location is required' }, { status: 422 });
  }
  if (role === 'secretary') {
    if (!p.aadhaarNumber && !p.panNumber)
      return NextResponse.json({ error: 'Secretary must provide Aadhaar or PAN' }, { status: 422 });
    if (!p.employeeId || !p.department)
      return NextResponse.json({ error: 'Employee ID and department are required' }, { status: 422 });
    if (!p.jurisdiction?.level || !p.jurisdiction.region)
      return NextResponse.json({ error: 'Jurisdiction details are required' }, { status: 422 });
  }

  try {
    if (role === 'farmer') {
      await FarmerProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          kisanCard:              p.kisanCard,
          aadhaarNumber:          p.aadhaarNumber,
          panNumber:              p.panNumber,
          farmLocation: {
            village:  p.farmLocation!.village,
            district: p.farmLocation!.district,
            state:    p.farmLocation!.state,
            geo:      Array.isArray(p.farmLocation?.geo) ? p.farmLocation!.geo : null,
          },
          honeyProductionCapacity: p.honeyProductionCapacity,
          organicCertified:        p.organicCertified ?? false,
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'warehouse') {
      await WarehouseProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          warehouseName:         p.warehouseName,
          registrationNumber:    p.registrationNumber,
          aadhaarNumber:         p.aadhaarNumber,
          panNumber:             p.panNumber,
          location: {
            address: p.location!.address,
            city:    p.location!.city,
            state:   p.location!.state,
            pincode: p.location!.pincode,
            geo:     Array.isArray(p.location?.geo) ? p.location!.geo : null,
          },
          storageCapacity:       p.storageCapacity,
          currentUtilization:    p.currentUtilization,
          temperatureControlled: p.temperatureControlled ?? false,
          humidityControl:       p.humidityControl ?? false,
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'lab') {
      await LabProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          labName:        p.labName,
          fssaiLabNumber: p.fssaiLabNumber,
          aadhaarNumber:  p.aadhaarNumber,
          panNumber:      p.panNumber,
          certifications: p.certifications ?? [],
          testingCapabilities: {
            purityTest:       p.testingCapabilities?.purityTest ?? false,
            adulterationTest: p.testingCapabilities?.adulterationTest ?? false,
            moistureTest:     p.testingCapabilities?.moistureTest ?? false,
          },
          location: {
            address: p.location!.address,
            city:    p.location!.city,
            state:   p.location!.state,
          },
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'officer') {
      await QualityOfficerProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          employeeId:     p.employeeId,
          department:     p.department,
          aadhaarNumber:  p.aadhaarNumber,
          panNumber:      p.panNumber,
          authorityLevel: p.authorityLevel,
          labAffiliation: p.labAffiliation,
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'enterprise') {
      await EnterpriseProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          companyName:        p.companyName,
          gstNumber:          p.gstNumber,
          fssaiLicense:       p.fssaiLicense,
          companyPan:         p.companyPan,
          businessType:       p.businessType,
          contactPerson:      { name: p.contactPerson!.name, designation: p.contactPerson!.designation },
          facilityLocation:   { address: p.facilityLocation!.address, city: p.facilityLocation!.city, state: p.facilityLocation!.state },
          processingCapacity: p.processingCapacity,
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'secretary') {
      await GovtSecretaryProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          employeeId:    p.employeeId,
          department:    p.department,
          aadhaarNumber: p.aadhaarNumber,
          panNumber:     p.panNumber,
          jurisdiction:  { level: p.jurisdiction!.level, region: p.jurisdiction!.region },
          permissions: {
            approveStakeholders: p.permissions?.approveStakeholders ?? false,
            auditAccess:         p.permissions?.auditAccess ?? false,
            complianceControl:   p.permissions?.complianceControl ?? false,
          },
        },
        { upsert: true, new: true }
      );
    }
    if (role === 'consumer') {
      await ConsumerProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          aadhaarNumber: p.aadhaarNumber,
          preferences: {
            organicOnly:      p.preferences?.organicOnly ?? false,
            preferredRegions: p.preferences?.preferredRegions ?? [],
          },
        },
        { upsert: true, new: true }
      );
    }

    await User.findByIdAndUpdate(userId, { onboardingCompleted: true });
  } catch (err) {
    console.error('[onboarding] failed:', err);
    return NextResponse.json({ error: 'Onboarding submission failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
