'use client';

import { useState } from 'react';
import QRScanner from './QRScanner';

export default function QRTraceResult({ token }: { token: string }) {
  const [batchId, setBatchId]   = useState<string | null>(null);
  const [trace, setTrace]       = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleScan(id: string) {
    setBatchId(id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trace/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Batch not found (${res.status})`);
      const data = await res.json();
      setTrace(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      <QRScanner onResult={handleScan} />

      {loading && (
        <p className="text-center text-amber-600 font-medium animate-pulse">
          Fetching trace for {batchId}…
        </p>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {trace && (
        <div className="flex flex-col gap-3">
          {/* Blockchain badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            ${trace.blockchain.tamperProof
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {trace.blockchain.tamperProof ? '✅ Blockchain Verified' : '⚠️ Tamper Detected'}
            <span className="ml-auto text-xs font-normal opacity-70">{trace.blockchain.network}</span>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-2">
            {trace.timeline.map((step: any, i: number) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-surface border border-border-subtle">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                  <p className="text-xs text-text-secondary">{step.actor} · {step.timestamp
                    ? new Date(step.timestamp).toLocaleString('en-IN')
                    : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}