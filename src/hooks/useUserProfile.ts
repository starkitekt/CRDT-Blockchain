'use client';

import { useEffect, useState } from 'react';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  aadhaarMasked: string | null;
  aadhaarVerified: boolean;
  pmKisanId?: string;
  blockchainId?: string;
  kycCompleted: boolean;
  kycVerifiedAt?: string;
}

const EMPTY: UserProfile = {
  name: '',
  email: '',
  role: '',
  aadhaarMasked: null,
  aadhaarVerified: false,
  kycCompleted: false,
};

export function useUserProfile(): { profile: UserProfile; loading: boolean } {
  const [profile, setProfile] = useState<UserProfile>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then(async (res) => {
        if (!res.ok) return EMPTY;
        const body = await res.json() as Partial<UserProfile>;
        return {
          name:           body.name           ?? '',
          email:          body.email          ?? '',
          role:           body.role           ?? '',
          aadhaarMasked:  body.aadhaarMasked  ?? null,
          aadhaarVerified: body.aadhaarVerified ?? false,
          pmKisanId:      body.pmKisanId,
          blockchainId:   body.blockchainId,
          kycCompleted:   body.kycCompleted   ?? false,
          kycVerifiedAt:  body.kycVerifiedAt,
        } satisfies UserProfile;
      })
      .catch(() => EMPTY)
      .then((p) => { if (!cancelled) { setProfile(p); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return { profile, loading };
}
