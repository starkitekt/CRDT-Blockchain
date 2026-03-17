'use client';

import { useState, useEffect, useCallback } from 'react';
import { labApi, ApiError } from '@/lib/api';
import type { LabResult } from '@/types';

interface UseLabResultsResult {
  results: LabResult[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Fetches all published lab results from GET /api/lab. */
export function useLabResults(): UseLabResultsResult {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    labApi
      .list()
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load lab results');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { results, loading, error, refresh };
}
