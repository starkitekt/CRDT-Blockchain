'use client';

import { useState, useEffect, useCallback } from 'react';
import { recallsApi, ApiError } from '@/lib/api';
import type { RecallEvent } from '@/types';

interface UseRecallsResult {
  recalls: RecallEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Fetches all recall events from GET /api/recalls. */
export function useRecalls(): UseRecallsResult {
  const [recalls, setRecalls] = useState<RecallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    recallsApi
      .list()
      .then((res) => {
        if (!cancelled) {
          setRecalls(Array.isArray(res) ? res : []);
          setLoading(false);
        }
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load recalls');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { recalls, loading, error, refresh };
}
