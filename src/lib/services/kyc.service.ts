import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';


// ── Types ─────────────────────────────────────────────────────────────────────

export interface KycVerificationResult {
  verified:   boolean;
  source:     'fssai' | 'gstn' | 'mock';
  details:    Record<string, unknown>;
  error?:     string;
}


// ── FSSAI License Verification ────────────────────────────────────────────────
// API docs: https://foscos.fssai.gov.in/api-docs
// Requires FSSAI_API_KEY in .env.local

export async function verifyFSSAILicense(
  licenseNo: string
): Promise<KycVerificationResult> {
  const apiKey = process.env.FSSAI_API_KEY;

  // ── Mock fallback when API key not configured ─────────────────────────────
  if (!apiKey) {
    console.warn('[kyc] FSSAI_API_KEY not set — using mock verification');
    return {
      verified: true,
      source:   'mock',
      details:  {
        licenseNo,
        businessName: 'Mock Business (dev mode)',
        status:       'Active',
        validUpto:    '2027-12-31',
      },
    };
  }

  try {
    const url = `https://foscos.fssai.gov.in/api/serveApplicantDetail?lic_no=${licenseNo}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Accept':    'application/json',
      },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      return {
        verified: false,
        source:   'fssai',
        details:  {},
        error:    `FSSAI API returned ${res.status}`,
      };
    }

    const data = await res.json();

    // FSSAI returns licDetails array; first element is the license
    const lic = data?.licDetails?.[0];
    if (!lic) {
      return {
        verified: false,
        source:   'fssai',
        details:  {},
        error:    'License not found in FSSAI database',
      };
    }

    const isActive = String(lic.lic_status).toLowerCase() === 'active';

    return {
      verified: isActive,
      source:   'fssai',
      details:  {
        licenseNo:    lic.lic_no,
        businessName: lic.bus_name,
        status:       lic.lic_status,
        validUpto:    lic.lic_exp_date,
        category:     lic.lic_category,
        state:        lic.state_name,
      },
    };
  } catch (err: any) {
    return {
      verified: false,
      source:   'fssai',
      details:  {},
      error:    err.message ?? 'FSSAI API unreachable',
    };
  }
}


// ── GSTN Verification ─────────────────────────────────────────────────────────
// Uses the public GST Search API (no key required for basic lookup)

export async function verifyGSTN(gstNo: string): Promise<KycVerificationResult> {
  const apiKey = process.env.GSTN_API_KEY;

  if (!apiKey) {
    console.warn('[kyc] GSTN_API_KEY not set — using mock verification');
    return {
      verified: true,
      source:   'mock',
      details:  {
        gstNo,
        legalName:  'Mock Enterprise Pvt Ltd (dev mode)',
        status:     'Active',
        stateCode:  gstNo.substring(0, 2),
      },
    };
  }

  try {
    const url = `https://api.gst.gov.in/commonapi/v1.1/taxpayerprofile/search?gstin=${gstNo}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept':        'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        verified: false,
        source:   'gstn',
        details:  {},
        error:    `GSTN API returned ${res.status}`,
      };
    }

    const data = await res.json();
    const taxpayer = data?.data;

    if (!taxpayer) {
      return {
        verified: false,
        source:   'gstn',
        details:  {},
        error:    'GSTIN not found',
      };
    }

    const isActive = String(taxpayer.sts).toLowerCase() === 'active';

    return {
      verified: isActive,
      source:   'gstn',
      details:  {
        gstNo:      taxpayer.gstin,
        legalName:  taxpayer.lgnm,
        tradeName:  taxpayer.tradeNam,
        status:     taxpayer.sts,
        stateCode:  taxpayer.stj,
        regDate:    taxpayer.rgdt,
      },
    };
  } catch (err: any) {
    return {
      verified: false,
      source:   'gstn',
      details:  {},
      error:    err.message ?? 'GSTN API unreachable',
    };
  }
}


// ── Combined KYC verifier — called by admin KYC approve flow ─────────────────
// Verifies all documents on the user based on their role

export async function verifyUserDocuments(userId: string): Promise<{
  passed:  boolean;
  results: Record<string, KycVerificationResult>;
}> {
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) throw new Error('USER_NOT_FOUND');

  const results: Record<string, KycVerificationResult> = {};

  if (user.fssaiLicense) {
    results.fssaiLicense = await verifyFSSAILicense(user.fssaiLicense);
  }

  if (user.gstNumber) {
    results.gstNumber = await verifyGSTN(user.gstNumber);
  }

  // All checked documents must pass
  const passed = Object.values(results).every((r) => r.verified);

  return { passed, results };
}