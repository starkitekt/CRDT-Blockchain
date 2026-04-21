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
  profilePhoto?: string | null;
}

const EMPTY: UserProfile = {
  name: '',
  email: '',
  role: '',
  aadhaarMasked: null,
  aadhaarVerified: false,
  kycCompleted: false,
  profilePhoto: null,
};

export function useUserProfile(): {
  profile: UserProfile;
  loading: boolean;
  updateProfilePhoto: (dataUrl: string | null) => Promise<{ ok: boolean; error?: string }>;
} {
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
          profilePhoto:   body.profilePhoto   ?? null,
        } satisfies UserProfile;
      })
      .catch(() => EMPTY)
      .then((p) => { if (!cancelled) { setProfile(p); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const updateProfilePhoto = async (dataUrl: string | null) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: (body as { error?: string }).error ?? 'Upload failed' };
      }
      setProfile((p) => ({ ...p, profilePhoto: dataUrl }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Upload failed' };
    }
  };

  return { profile, loading, updateProfilePhoto };
}
