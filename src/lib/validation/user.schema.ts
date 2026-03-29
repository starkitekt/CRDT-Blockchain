import { z } from 'zod';

// ── Reusable format validators ────────────────────────────────────────────────

const aadhaar    = z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits');
const fssai      = z.string().regex(/^\d{14}$/, 'FSSAI license must be exactly 14 digits');
const gst        = z.string().regex(
  /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
  'Invalid GST number format (e.g. 09AABCU9603R1ZP)'
);
const mobile     = z.string().regex(/^[6-9]\d{9}$/, 'Mobile must be a valid 10-digit Indian number');
const nabl       = z.string().regex(/^[A-Z]{1,2}-\d{3,5}$/, 'NABL format must be like T-1234 or CC-1234');
const cin        = z.string().regex(
  /^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/,
  'Invalid CIN format (e.g. U12345MH2020PTC123456)'
);

// ── Base fields all users must have ──────────────────────────────────────────

const BaseUserSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1, 'Name is required'),
});

// ── Role-specific schemas ─────────────────────────────────────────────────────

export const FarmerSchema = BaseUserSchema.extend({
  role:         z.literal('farmer'),
  aadhaarNumber:z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  pmKisanId:    z.string().regex(/^PMKISAN-\d{6,10}$/, 'PM-KISAN ID format: PMKISAN-XXXXXX').optional(),
});

export const WarehouseSchema = BaseUserSchema.extend({
  role:         z.literal('warehouse'),
  fssaiLicense: fssai,
  gstNumber:    gst,
  wdraLicenseNo:z.string().min(1, 'WDRA license is required'),
});

export const LabSchema = BaseUserSchema.extend({
  role:               z.literal('lab'),
  fssaiLicense:       fssai,
  nablAccreditationNo:nabl,
  labRegistrationNo:  z.string().min(1, 'Lab registration number is required'),
});

export const OfficerSchema = BaseUserSchema.extend({
  role:           z.literal('officer'),
  employeeId:     z.string().min(1, 'Employee ID is required'),
  fssaiOfficerId: z.string().min(1, 'FSSAI Officer ID is required'),
  department:     z.string().min(1, 'Department is required'),
  jurisdiction:   z.string().min(1, 'Jurisdiction is required'),
});

export const EnterpriseSchema = BaseUserSchema.extend({
  role:         z.literal('enterprise'),
  gstNumber:    gst,
  fssaiLicense: fssai,
  cinNumber:    cin,
  iecCode:      z.string().optional(),
});

export const ConsumerSchema = BaseUserSchema.extend({
  role:         z.literal('consumer'),
  mobileNumber: mobile,
});

export const SecretarySchema = BaseUserSchema.extend({
  role:       z.literal('secretary'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  department: z.string().min(1, 'Department is required'),
});

export const AdminSchema = BaseUserSchema.extend({
  role:       z.literal('admin'),
  employeeId: z.string().min(1, 'Employee ID is required'),
});

// ── Union discriminator — validates any role ──────────────────────────────────

export const AnyUserSchema = z.discriminatedUnion('role', [
  FarmerSchema,
  WarehouseSchema,
  LabSchema,
  OfficerSchema,
  EnterpriseSchema,
  ConsumerSchema,
  SecretarySchema,
  AdminSchema,
]);

export type AnyUserInput = z.infer<typeof AnyUserSchema>;
