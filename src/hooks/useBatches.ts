'use client';

import { useState, useEffect, useCallback } from 'react';
import { batchesApi, ApiError, type BatchListParams } from '@/lib/api';
import type { Batch } from '@/types';

interface UseBatchesResult {
  batches: Batch[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches batches from GET /api/batches with optional filters.
 * Call `refresh()` after mutations to re-sync.
 */
export function useBatches(params?: BatchListParams): UseBatchesResult {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    batchesApi
      .list(params)
      .then(({ data }) => {
        if (!cancelled) {
          setBatches(data);
          setLoading(false);
        }
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load batches');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.farmerId, params?.status]);

  return { batches, loading, error, refresh };
}
