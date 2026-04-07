'use client';

import { useEffect, useState } from 'react';

export interface CurrentUser {
  userId:       string;
  email:        string;
  role:         string;
  name:         string;
  kycCompleted: boolean;
}

const EMPTY: CurrentUser = {
  userId:       '',
  email:        '',
  role:         '',
  name:         '',
  kycCompleted: false,
};

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth', { method: 'GET' })
      .then(async (res) => {
        if (!res.ok) return EMPTY;
        const body = (await res.json()) as {
          user?: Partial<CurrentUser>;
        };
        const payload = body.user ?? {};
        return {
          userId: payload.userId ?? '',
          email: payload.email ?? '',
          role: payload.role ?? '',
          name: payload.name ?? payload.email ?? '',
          kycCompleted: Boolean(payload.kycCompleted),
        };
      })
      .catch(() => EMPTY)
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      });

    return () => { cancelled = true; };
  }, []);

  return user;
}
