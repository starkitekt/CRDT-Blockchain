'use client';

import React, { useEffect, useState } from 'react';

interface TraceEvent {
  step: string;
  label: string;
  actor: string | null;
  timestamp: string | null;
  location: string | null;
  data: Record<string, unknown> | null;
}

interface BatchImage {
  url: string;
  latitude: number | null;
  longitude: number | null;
}

interface BatchData {
  batchId: string;
  farmerName: string;
  floraType: string;
  weightKg: number;
  grade: string;
  harvestDate: string;
  moisturePct: number;
  status: string;
  latitude?: string;
  longitude?: string;
  warehouseId?: string;
  images?: BatchImage[];
}

interface BlockchainData {
  onChain: boolean;
  tamperProof: boolean;
  recalls: unknown[];
}

interface TraceResponse {
  batch: BatchData;
  blockchain: BlockchainData;
  timeline: TraceEvent[];
  warehouse?: { id: string; name: string | null; location: string | null } | null;
  testing?: {
    moisture: number | null;
    hmf: number | null;
    diastase: number | null;
    passed: boolean | null;
    publishedAt: string | null;
  } | null;
  officerDecision?: {
    decision: string | null;
    actorRole: string | null;
    decidedAt: string | null;
  } | null;
}

const STEP_COLORS: Record<string, string> = {
  created: 'bg-slate-100 text-slate-700',
  stored: 'bg-blue-100 text-blue-700',
  tested: 'bg-purple-100 text-purple-700',
  certified: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  dispatched: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
  recalled: 'bg-red-100 text-red-700',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PublicTracePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = React.use(params);
  const [data, setData] = useState<TraceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    fetch(`/api/trace/${batchId}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Batch not found' : 'Failed to load trace');
        return r.json() as Promise<TraceResponse>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center">Loading trace...</main>;
  }

  if (error || !data) {
    return <main className="min-h-screen flex items-center justify-center">{error ?? 'Trace unavailable'}</main>;
  }

  const { batch, timeline, blockchain, warehouse, testing, officerDecision } = data;
  const isRecalled = blockchain.recalls?.length > 0;
  const images = Array.isArray(batch.images) ? batch.images : [];

  return (
    <main className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <section className="bg-white rounded-2xl border border-amber-200 p-5">
          <h1 className="text-2xl font-bold text-amber-900">{batch.floraType || 'Honey Batch'}</h1>
          <p className="font-mono text-sm text-amber-700">{batch.batchId}</p>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Farmer:</span> <strong>{batch.farmerName || '-'}</strong></div>
            <div><span className="text-gray-500">Weight:</span> <strong>{batch.weightKg ?? '-'} kg</strong></div>
            <div><span className="text-gray-500">Grade:</span> <strong>{batch.grade || '-'}</strong></div>
            <div><span className="text-gray-500">Harvest:</span> <strong>{fmtDate(batch.harvestDate)}</strong></div>
          </div>
          {isRecalled && <p className="mt-3 text-sm font-semibold text-red-600">Recalled batch. Do not consume.</p>}
        </section>

        <section className="bg-white rounded-2xl border border-amber-200 p-5">
          <h2 className="font-bold mb-3">Full Journey</h2>
          <div className="space-y-2">
            {timeline.map((evt, idx) => (
              <div key={`${evt.step}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${STEP_COLORS[evt.step] ?? 'bg-slate-100 text-slate-700'}`}>
                    {evt.step}
                  </span>
                  <span className="font-semibold">{evt.label}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Actor: {evt.actor ?? '-'}</p>
                <p className="text-sm text-gray-600">Time: {fmtDate(evt.timestamp)}</p>
                {evt.location && <p className="text-sm text-gray-600">Location: {evt.location}</p>}
                {evt.data && Object.keys(evt.data).length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{JSON.stringify(evt.data)}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-amber-200 p-5">
          <h2 className="font-bold mb-3">Warehouse, Testing, Approval</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Warehouse:</span> <strong>{warehouse?.name ?? batch.warehouseId ?? '-'}</strong></p>
            {warehouse?.location && <p><span className="text-gray-500">Warehouse Location:</span> <strong>{warehouse.location}</strong></p>}
            <p><span className="text-gray-500">Testing:</span> <strong>{testing?.passed == null ? 'Pending' : testing.passed ? 'Passed' : 'Failed'}</strong></p>
            {testing?.publishedAt && <p><span className="text-gray-500">Testing Time:</span> <strong>{fmtDate(testing.publishedAt)}</strong></p>}
            <p><span className="text-gray-500">Officer Decision:</span> <strong>{officerDecision?.decision ? officerDecision.decision.replace(/_/g, ' ') : 'Pending'}</strong></p>
            {officerDecision?.decidedAt && <p><span className="text-gray-500">Decision Time:</span> <strong>{fmtDate(officerDecision.decidedAt)}</strong></p>}
          </div>
        </section>

        {images.length > 0 && (
          <section className="bg-white rounded-2xl border border-amber-200 p-5">
            <h2 className="font-bold mb-3">Uploaded Images</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={`${img.url}-${idx}`} className="border border-slate-200 rounded-xl p-2">
                  <img src={img.url} alt={`Evidence ${idx + 1}`} className="w-full h-32 object-cover rounded" />
                  <p className="text-xs text-gray-500 mt-2">
                    GPS: {img.latitude == null || img.longitude == null ? 'Not available' : `${img.latitude}, ${img.longitude}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
