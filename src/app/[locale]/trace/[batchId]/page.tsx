'use client';

import React, { useEffect, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface TraceEvent {
  step:      string;
  label:     string;
  actor:     string | null;
  timestamp: string | null;
  location:  string | null;
  data:      Record<string, unknown> | null;
}

interface BatchData {
  batchId:     string;
  farmerName:  string;
  floraType:   string;
  weightKg:    number;
  grade:       string;
  harvestDate: string;
  moisturePct: number;
  status:      string;
  latitude?:   number;
  longitude?:  number;
}

interface BlockchainData {
  onChain:     boolean;
  tamperProof: boolean;
  recalls:     unknown[];
}

interface TraceResponse {
  batch:      BatchData;
  blockchain: BlockchainData;
  timeline:   TraceEvent[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const STEP_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  harvest:      { icon: '🌿', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  in_warehouse: { icon: '🏭', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300'  },
  in_testing:   { icon: '🔬', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300'},
  certified:    { icon: '✅', color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-300'},
  dispatched:   { icon: '🚚', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  recalled:     { icon: '⚠️', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300'   },
};

const GRADE_LABEL: Record<string, string> = { A: 'Premium', B: 'Standard' };

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-amber-100 shadow-sm min-w-[80px]">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 mb-0.5">{label}</span>
      <span className="text-lg font-bold text-gray-900 leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-gray-400 mt-0.5">{sub}</span>}
    </div>
  );
}

function VerificationBadge({ blockchain }: { blockchain: BlockchainData }) {
  if (blockchain.tamperProof) return (
    <div className="flex items-center gap-2 bg-emerald-500 text-white rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg shadow-emerald-200">
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
      </svg>
      Blockchain Verified
    </div>
  );
  if (blockchain.onChain) return (
    <div className="flex items-center gap-2 bg-yellow-400 text-yellow-900 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
      </svg>
      On-Chain (Unverified)
    </div>
  );
  return (
    <div className="flex items-center gap-2 bg-gray-100 text-gray-600 rounded-full px-4 py-1.5 text-sm font-medium">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd"/>
      </svg>
      Database Record
    </div>
  );
}

function TimelineStep({ evt, index, total }: { evt: TraceEvent; index: number; total: number }) {
  const meta = STEP_META[evt.step] ?? STEP_META.harvest;
  const isLast = index === total - 1;

  return (
    <div className="flex gap-4">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2 shadow-sm ${meta.bg} ${meta.border}`}>
          {meta.icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-amber-200 to-transparent mt-1 min-h-[24px]" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-6 rounded-2xl border p-4 shadow-sm ${meta.bg} ${meta.border}`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`font-bold text-sm ${meta.color}`}>{evt.label}</p>
          {evt.timestamp && (
            <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{fmt(evt.timestamp)}</span>
          )}
        </div>

        {evt.actor && (
          <p className="text-xs text-gray-500 capitalize">
            By {evt.actor.replace(/_/g, ' ')}
          </p>
        )}

        {evt.location && evt.location !== 'null, null' && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd"/>
            </svg>
            {evt.location}
          </p>
        )}

        {evt.data && Object.keys(evt.data).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(evt.data)
              .filter(([, v]) => v != null)
              .map(([k, v]) => (
                <span key={k} className="text-[11px] bg-white/70 text-gray-700 px-2 py-0.5 rounded-full border border-white font-medium capitalize">
                  {k.replace(/([A-Z])/g, ' $1').trim()}: {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function PublicTracePage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = React.use(params);

  const [data,    setData]    = useState<TraceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    fetch(`/api/trace/${batchId}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Batch not found' : 'Failed to load');
        return r.json() as Promise<TraceResponse>;
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [batchId]);

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍯</div>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-amber-700 text-sm mt-3 font-medium">Loading product journey…</p>
        </div>
      </main>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────────── */
  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
        <div className="text-center max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-1">Batch Not Found</h1>
          <p className="text-gray-500 text-sm">{error ?? 'This batch ID does not exist in our records.'}</p>
          <p className="text-xs text-gray-300 mt-4 font-mono bg-gray-50 rounded-lg px-3 py-2">{batchId}</p>
        </div>
      </main>
    );
  }

  const { batch, blockchain, timeline } = data;
  const isRecalled = blockchain.recalls?.length > 0;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(160deg, #fffbeb 0%, #fef9ee 60%, #f0fdf4 100%)' }}>

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative px-5 pt-8 pb-10 text-center text-white">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-lg">🍯</div>
            <span className="font-bold text-lg tracking-tight">HoneyTrace</span>
          </div>

          {/* Recall banner */}
          {isRecalled && (
            <div className="mb-4 bg-red-500 text-white rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 justify-center">
              <span>⚠️</span> Recall Notice — Do not consume this batch
            </div>
          )}

          {/* Verification badge */}
          <div className="flex justify-center mb-4">
            <VerificationBadge blockchain={blockchain} />
          </div>

          {/* Batch ID */}
          <h1 className="text-2xl font-bold mb-1">
            {batch.floraType ?? 'Natural Honey'}
          </h1>
          <p className="text-amber-200 text-sm font-mono">{batch.batchId}</p>

          {/* Quick stats row */}
          <div className="flex gap-2 justify-center mt-6 flex-wrap">
            <StatPill label="Grade" value={batch.grade ?? '—'} sub={GRADE_LABEL[batch.grade] ?? ''} />
            <StatPill label="Weight" value={batch.weightKg ? `${batch.weightKg}kg` : '—'} />
            <StatPill label="Moisture" value={batch.moisturePct ? `${batch.moisturePct}%` : '—'} sub="max 20%" />
            <StatPill label="Harvest" value={fmt(batch.harvestDate)} />
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 -mt-4 pb-12 space-y-4">

        {/* ── Farmer card ── */}
        <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-xl shrink-0">
              👨‍🌾
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Produced By</p>
              <p className="font-bold text-gray-900 text-base">{batch.farmerName ?? '—'}</p>
              <p className="text-xs text-gray-500">{batch.floraType} honey</p>
            </div>
            {batch.latitude && batch.longitude && (
              <a
                href={`https://maps.google.com/?q=${batch.latitude},${batch.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl px-3 py-2 text-blue-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd"/>
                </svg>
                <span className="text-[10px] font-semibold">Map</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Journey timeline ── */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-amber-100 rounded-xl flex items-center justify-center text-sm">🗺️</div>
              <h2 className="font-bold text-gray-900">Product Journey</h2>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {timeline.length} steps
              </span>
            </div>

            <div>
              {timeline.map((evt, i) => (
                <TimelineStep key={i} evt={evt} index={i} total={timeline.length} />
              ))}
            </div>
          </div>
        )}

        {/* ── Blockchain proof ── */}
        <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-amber-100 rounded-xl flex items-center justify-center text-sm">🔐</div>
            <h2 className="font-bold text-gray-900">Trust &amp; Transparency</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">On blockchain</span>
              <span className={`text-sm font-semibold ${blockchain.onChain ? 'text-emerald-600' : 'text-gray-400'}`}>
                {blockchain.onChain ? 'Yes' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Tamper proof</span>
              <span className={`text-sm font-semibold ${blockchain.tamperProof ? 'text-emerald-600' : 'text-gray-400'}`}>
                {blockchain.tamperProof ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Recall status</span>
              <span className={`text-sm font-semibold ${isRecalled ? 'text-red-600' : 'text-emerald-600'}`}>
                {isRecalled ? 'Recalled' : 'Safe'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-5 h-5 bg-amber-500 rounded-md flex items-center justify-center text-white text-xs">🍯</div>
            <span className="text-sm font-bold text-gray-700">HoneyTrace</span>
          </div>
          <p className="text-xs text-gray-400">Blockchain-verified honey supply chain</p>
          <p className="text-xs text-gray-300 mt-1">Ministry of Tribal Affairs · IIT Delhi</p>
        </div>

      </div>
    </main>
  );
}
