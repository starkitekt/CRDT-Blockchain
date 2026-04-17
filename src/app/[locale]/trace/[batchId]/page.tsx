'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Tile,
  Button,
  Stack,
  Tag,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import {
  ArrowLeft,
  Copy,
  Checkmark,
  WarningFilled,
  CheckmarkFilled,
  Time,
  Location,
  User,
  DataBase,
  Chemistry,
  Security,
  Delivery,
  Sprout,
  Locked,
  Information,
} from '@carbon/icons-react';

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
  network?: string;
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

/* step → Carbon Tag type + icon */
const STEP_META: Record<string, { tagType: 'gray' | 'blue' | 'purple' | 'green' | 'red' | 'teal'; dotColor: string }> = {
  created:    { tagType: 'gray',   dotColor: '#6b7280' },
  stored:     { tagType: 'blue',   dotColor: '#0f62fe' },
  tested:     { tagType: 'purple', dotColor: '#8b5cf6' },
  certified:  { tagType: 'green',  dotColor: '#16a34a' },
  approved:   { tagType: 'green',  dotColor: '#16a34a' },
  dispatched: { tagType: 'teal',   dotColor: '#0d9488' },
  delivered:  { tagType: 'green',  dotColor: '#16a34a' },
  recalled:   { tagType: 'red',    dotColor: '#dc2626' },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="text-caption shrink-0" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function PublicTracePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = React.use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<TraceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const locale = pathname.startsWith('/hi') ? 'hi' : 'en';

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

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.batch.batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="dashboard-container">
        <Stack gap={5}>
          <SkeletonText heading width="40%" />
          <Tile className="glass-panel"><SkeletonText paragraph lineCount={4} /></Tile>
          <Tile className="glass-panel"><SkeletonText paragraph lineCount={6} /></Tile>
        </Stack>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="dashboard-container">
        <Stack gap={4}>
          <Button kind="ghost" renderIcon={ArrowLeft} size="sm" onClick={() => router.back()}>
            Go Back
          </Button>
          <InlineNotification
            kind="error"
            title="Trace unavailable."
            subtitle={error ?? 'Could not load trace data. The batch ID may be invalid.'}
            lowContrast
          />
        </Stack>
      </div>
    );
  }

  const { batch, timeline, blockchain, warehouse, testing, officerDecision } = data;
  const isRecalled = blockchain.recalls?.length > 0;
  const images = Array.isArray(batch.images) ? batch.images : [];

  const verificationTagType: 'red' | 'green' | 'gray' = isRecalled ? 'red' : blockchain.tamperProof ? 'green' : 'gray';
  const verificationLabel = isRecalled ? 'Recalled' : blockchain.tamperProof ? 'Blockchain Verified' : 'Verification Pending';

  return (
    <div className="dashboard-container">
      <Stack gap={6}>

        {/* ── Recalled banner ── */}
        {isRecalled && (
          <InlineNotification
            kind="error"
            title="Recall Alert."
            subtitle="This batch has been recalled. Do not consume."
            lowContrast={false}
          />
        )}

        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Button
              kind="ghost"
              renderIcon={ArrowLeft}
              size="sm"
              className="mb-3 -ml-3"
              onClick={() => router.push(`/${locale}/track`)}
            >
              Check Another Batch
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1" style={{ fontSize: '1.75rem' }}>
                {batch.floraType || 'Honey Batch'}
              </h1>
              <Tag type={verificationTagType} size="md">
                {verificationLabel}
              </Tag>
            </div>
            <p className="mono-data mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {batch.batchId}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:shrink-0 md:flex-col md:items-end">
            <Button
              kind="ghost"
              size="sm"
              renderIcon={copied ? Checkmark : Copy}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy Batch ID'}
            </Button>
            {blockchain.onChain && (
              <Tag type="blue" size="md">
                <Locked size={12} className="mr-1" />
                On-Chain{blockchain.network ? ` · ${blockchain.network}` : ''}
              </Tag>
            )}
          </div>
        </div>

        {/* ── Batch overview ── */}
        <Tile className="standard-tile">
          <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {[
              { label: 'Farmer',       value: batch.farmerName || '—' },
              { label: 'Weight',       value: batch.weightKg != null ? `${batch.weightKg} kg` : '—' },
              { label: 'Grade',        value: batch.grade || '—' },
              { label: 'Harvest Date', value: fmtDate(batch.harvestDate) },
              { label: 'Moisture',     value: batch.moisturePct != null ? `${batch.moisturePct}%` : '—' },
              { label: 'Status',       value: <Tag type={isRecalled ? 'red' : 'gray'} size="sm">{batch.status || '—'}</Tag> },
            ].map(({ label, value }) => (
              <div key={label} className="p-4">
                <p className="text-caption" style={{ fontSize: '0.6875rem' }}>{label}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        </Tile>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left: Timeline ── */}
          <Stack gap={4}>
            <Tile className="glass-panel">
              <Stack gap={0}>
                <div className="mb-5 flex items-center gap-2">
                  <Time size={20} style={{ color: 'var(--interactive)' }} />
                  <h2 className="text-h2" style={{ fontSize: '1.125rem' }}>Journey Timeline</h2>
                </div>

                {timeline.length === 0 ? (
                  <div
                    className="flex flex-col items-center gap-2 rounded-lg py-10 text-center"
                    style={{ border: '2px dashed var(--border-subtle)', background: 'var(--background)' }}
                  >
                    <Information size={32} style={{ color: 'var(--border-strong)', opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No timeline events recorded yet</p>
                  </div>
                ) : (
                  <ol>
                    {timeline.map((evt, idx) => {
                      const meta = STEP_META[evt.step] ?? { tagType: 'gray' as const, dotColor: '#6b7280' };
                      const isLast = idx === timeline.length - 1;
                      return (
                        <li key={`${evt.step}-${idx}`} className="relative flex gap-4">
                          {/* Connector */}
                          <div className="flex flex-col items-center">
                            <div
                              className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                              style={{
                                background: meta.dotColor,
                                border: '2px solid var(--surface)',
                                boxShadow: `0 0 0 2px ${meta.dotColor}`,
                              }}
                            >
                              <span className="text-[10px] font-black text-white">{idx + 1}</span>
                            </div>
                            {!isLast && (
                              <div className="my-1 w-px flex-1" style={{ background: 'var(--border-subtle)', minHeight: '16px' }} />
                            )}
                          </div>

                          {/* Event card */}
                          <div
                            className="mb-4 flex-1 rounded-lg p-4"
                            style={{
                              background: 'var(--background)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Tag type={meta.tagType} size="sm">{evt.step}</Tag>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{evt.label}</span>
                            </div>
                            <div className="space-y-1">
                              {evt.actor && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <User size={12} />
                                  <span>{evt.actor}</span>
                                </div>
                              )}
                              {evt.timestamp && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <Time size={12} />
                                  <span>{fmtDate(evt.timestamp)}</span>
                                </div>
                              )}
                              {evt.location && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <Location size={12} />
                                  <span>{evt.location}</span>
                                </div>
                              )}
                            </div>
                            {evt.data && Object.keys(evt.data).length > 0 && (
                              <details className="mt-3">
                                <summary
                                  className="cursor-pointer text-xs font-semibold"
                                  style={{ color: 'var(--interactive)' }}
                                >
                                  View metadata
                                </summary>
                                <pre
                                  className="mono-data mt-2 overflow-x-auto rounded p-2 text-[10px]"
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                                >
                                  {JSON.stringify(evt.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Stack>
            </Tile>

            {/* ── Images ── */}
            {images.length > 0 && (
              <Tile className="glass-panel">
                <Stack gap={4}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-h2" style={{ fontSize: '1.125rem' }}>Evidence Images</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {images.map((img, idx) => (
                      <div
                        key={`${img.url}-${idx}`}
                        className="overflow-hidden rounded-lg"
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Evidence ${idx + 1}`} className="h-36 w-full object-cover" />
                        <div className="p-3" style={{ background: 'var(--background)' }}>
                          <p className="text-caption">Evidence {idx + 1}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Location size={11} />
                            {img.latitude == null || img.longitude == null
                              ? 'GPS not available'
                              : `${img.latitude}, ${img.longitude}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Stack>
              </Tile>
            )}
          </Stack>

          {/* ── Right: Sidebar ── */}
          <Stack gap={4}>

            {/* Blockchain */}
            <Tile className="standard-tile">
              <Stack gap={3}>
                <div className="flex items-center gap-2">
                  <Locked size={18} style={{ color: 'var(--interactive)' }} />
                  <h3 className="text-h3" style={{ fontSize: '1rem' }}>Blockchain Status</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isRecalled ? (
                    <WarningFilled size={20} style={{ color: 'var(--error)' }} />
                  ) : blockchain.tamperProof ? (
                    <CheckmarkFilled size={20} style={{ color: 'var(--success)' }} />
                  ) : (
                    <Information size={20} style={{ color: 'var(--warning)' }} />
                  )}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {isRecalled ? 'Recalled' : blockchain.tamperProof ? 'Tamper-Proof' : 'Pending Verification'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {blockchain.onChain ? 'Record anchored on-chain' : 'Not yet anchored'}
                  {blockchain.network ? ` · ${blockchain.network}` : ''}
                </p>
              </Stack>
            </Tile>

            {/* Warehouse */}
            <Tile className="standard-tile">
              <Stack gap={3}>
                <div className="flex items-center gap-2">
                  <DataBase size={18} style={{ color: 'var(--interactive)' }} />
                  <h3 className="text-h3" style={{ fontSize: '1rem' }}>Warehouse</h3>
                </div>
                <MetaRow label="Name"     value={warehouse?.name ?? batch.warehouseId ?? '—'} />
                <MetaRow label="Location" value={warehouse?.location ?? '—'} />
              </Stack>
            </Tile>

            {/* Lab Testing */}
            <Tile className="standard-tile">
              <Stack gap={3}>
                <div className="flex items-center gap-2">
                  <Chemistry size={18} style={{ color: 'var(--interactive)' }} />
                  <h3 className="text-h3" style={{ fontSize: '1rem' }}>Lab Testing</h3>
                </div>

                <div className="flex items-center gap-2">
                  {testing?.passed == null ? (
                    <Tag type="gray" size="sm">Pending</Tag>
                  ) : testing.passed ? (
                    <Tag type="green" size="sm">Passed</Tag>
                  ) : (
                    <Tag type="red" size="sm">Failed</Tag>
                  )}
                </div>

                {testing && (
                  <>
                    {testing.moisture != null && <MetaRow label="Moisture"  value={`${testing.moisture}%`} />}
                    {testing.hmf      != null && <MetaRow label="HMF"       value={`${testing.hmf} mg/kg`} />}
                    {testing.diastase != null && <MetaRow label="Diastase"  value={String(testing.diastase)} />}
                    {testing.publishedAt      && <MetaRow label="Published" value={fmtDate(testing.publishedAt)} />}
                  </>
                )}
              </Stack>
            </Tile>

            {/* Officer Decision */}
            <Tile className="standard-tile">
              <Stack gap={3}>
                <div className="flex items-center gap-2">
                  <Security size={18} style={{ color: 'var(--interactive)' }} />
                  <h3 className="text-h3" style={{ fontSize: '1rem' }}>Officer Decision</h3>
                </div>
                <MetaRow
                  label="Decision"
                  value={
                    officerDecision?.decision
                      ? officerDecision.decision.replace(/_/g, ' ')
                      : <span style={{ color: 'var(--warning)' }}>Pending Review</span>
                  }
                />
                {officerDecision?.actorRole && (
                  <MetaRow label="Role" value={officerDecision.actorRole} />
                )}
                {officerDecision?.decidedAt && (
                  <MetaRow label="Decided" value={fmtDate(officerDecision.decidedAt)} />
                )}
              </Stack>
            </Tile>

          </Stack>
        </div>
      </Stack>
    </div>
  );
}
