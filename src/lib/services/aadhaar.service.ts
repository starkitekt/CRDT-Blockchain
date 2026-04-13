// ── In-memory OTP store ───────────────────────────────────────────────────────
// DEV/STAGING only. In production replace with Upstash Redis:
//   await redis.set(`aadhaar:${txnId}`, JSON.stringify(entry), { ex: 600 });
//
// WARNING: Resets on every server restart. Multi-instance safe only with Redis.

interface OtpEntry {
  otp:           string;
  aadhaarNumber: string;  // cleaned, no spaces
  userId:        string;
  expiresAt:     number;  // Unix ms
}

const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 10 * 60 * 1000;  // 10 minutes

function generateOtp():   string { return String(Math.floor(100000 + Math.random() * 900000)); }
function generateTxnId(): string { return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }


// ── Types ─────────────────────────────────────────────────────────────────────

export interface AadhaarInitiateResult {
  success:  boolean;
  txnId?:   string;
  message?: string;
  error?:   string;
}

export interface AadhaarKycData {
  name:          string;
  dob:           string;      // YYYY-MM-DD
  gender:        'M' | 'F' | 'T';
  address:       string;
  careOf:        string;
  pincode:       string;
  aadhaarSuffix: string;      // last 4 digits ONLY — never store full Aadhaar
}

export interface AadhaarVerifyResult {
  success:  boolean;
  kycData?: AadhaarKycData;
  error?:   string;
}


// ── Step 1: Initiate OTP ──────────────────────────────────────────────────────

export async function initiateAadhaarOtp(
  userId:        string,
  aadhaarNumber: string,
): Promise<AadhaarInitiateResult> {

  const clean = aadhaarNumber.replace(/\s/g, '');

  if (!/^\d{12}$/.test(clean)) {
    return { success: false, error: 'Aadhaar number must be exactly 12 digits' };
  }

  if (process.env.NODE_ENV !== 'production') {
    const otp   = generateOtp();
    const txnId = generateTxnId();

    otpStore.set(txnId, {
      otp,
      aadhaarNumber: clean,
      userId,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    // DEV ONLY — never log OTPs in production
    console.log(`[aadhaar:mock] userId=${userId}  OTP=${otp}  txnId=${txnId}`);

    return {
      success: true,
      txnId,
      message: '[DEV] OTP sent to Aadhaar-linked mobile. Check server console.',
    };
  }

  // ── Production: wire AUA provider here (Digio / IDfy / Karza) ─────────────
  // const res = await fetch('https://api.digio.in/client/kyc/aadhaar/generate_otp', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Basic ${process.env.DIGIO_BASIC_AUTH}`, ... },
  //   body: JSON.stringify({ aadhaar: clean, ref_id: userId }),
  // });
  // ...

  return {
    success: false,
    error:   'Aadhaar OTP requires AUA provider (Digio/IDfy). Not yet configured.',
  };
}


// ── Step 2: Verify OTP ────────────────────────────────────────────────────────

export async function verifyAadhaarOtp(
  txnId: string,
  otp:   string,
): Promise<AadhaarVerifyResult> {

  if (process.env.NODE_ENV !== 'production') {
    const entry = otpStore.get(txnId);

    if (!entry) {
      return { success: false, error: 'Invalid or expired transaction ID' };
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(txnId);
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }
    if (entry.otp !== otp.trim()) {
      return { success: false, error: 'Incorrect OTP' };
    }

    otpStore.delete(txnId);  // single-use

    return {
      success: true,
      kycData: {
        name:          'Mock User (Dev Mode)',
        dob:           '1990-01-01',
        gender:        'M',
        address:       '123, Mock Street, Dev City, Delhi, India',
        careOf:        'S/O Mock Father',
        pincode:       '110001',
        aadhaarSuffix: entry.aadhaarNumber.slice(-4),
      },
    };
  }

  // Production: call AUA provider verify endpoint
  return { success: false, error: 'Aadhaar OTP requires AUA provider. Not yet configured.' };
}