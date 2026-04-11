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
  const farmerId = params?.farmerId;
  const status = params?.status;

  const [batches, setBatches] = useState<Batch[]>([]);
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

    batchesApi
      .list({ farmerId, status })
      .then((res) => {
        if (!cancelled) {
          setBatches(Array.isArray(res) ? res : []);
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
  }, [tick, farmerId, status]);

  return { batches, loading, error, refresh };
}
