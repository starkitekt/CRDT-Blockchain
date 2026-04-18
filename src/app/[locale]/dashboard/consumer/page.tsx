'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  Tile, Button, TextInput, Stack, Tag, InlineNotification,
} from '@carbon/react';
import {
  QrCode, CheckmarkFilled, Search,
  IbmCloudSecurityComplianceCenter as Security,
} from '@carbon/icons-react';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import QRCodeGenerator from '@/components/Traceability/QRCodeGenerator';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import BlockchainCertificate from '@/components/Traceability/BlockchainCertificate';
import CTETimeline, { CTEEvent } from '@/components/Traceability/CTETimeline';
import { batchesApi, labApi, ApiError } from '@/lib/api';
import CopyableValue from '@/components/CopyableValue';
import type { Batch, LabResult } from '@/types';

type TFn = (...args: unknown[]) => string;

export default function ConsumerPortal() {
  const tOnboarding = useTranslations('Onboarding.consumer') as unknown as TFn;
  const tDashboard  = useTranslations('Dashboard.consumer') as unknown as TFn;
  const tc          = useTranslations('common') as unknown as TFn;

  const [searchId, setSearchId]               = useState('');
  const [isSearching, setIsSearching]         = useState(false);
  const [showResult, setShowResult]           = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [searchError, setSearchError]         = useState<string | null>(null);
  const [labWarning, setLabWarning]           = useState<string | null>(null);
  const [batchData, setBatchData]             = useState<Batch | null>(null);
  const [labData, setLabData]                 = useState<LabResult | null>(null);
  const [traceTimeline, setTraceTimeline]     = useState<Array<Record<string, unknown>>>([]);
  const { isTourOpen, completeTour, closeTour } = useOnboarding({ role: 'consumer' });

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  // ── accepts optional overrideId so QR scan can pass directly ──────────────
  const handleSearch = async (overrideId?: string) => {
    const id = overrideId ?? searchId;
    if (!id.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setLabWarning(null);
    setShowResult(false);
    setBatchData(null);
    setLabData(null);
    setTraceTimeline([]);

    try {
      const batch = await batchesApi.get(id);
      setBatchData(batch);

      try {
        const traceRes = await fetch(`/api/trace/${id}`);
        if (traceRes.ok) {
          const tr = await traceRes.json();
          setTraceTimeline(tr.timeline ?? []);
        }
      } catch { /* non-fatal */ }

      try {
        const lab = await labApi.getByBatch(id);
        setLabData(lab);
      } catch (labErr) {
        if (labErr instanceof ApiError && labErr.status === 404) {
          setLabWarning('Lab results are not yet available for this batch.');
        } else {
          setLabWarning('Lab results could not be loaded at this time.');
        }
      }

      setShowResult(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSearchError(`Batch "${id}" was not found. Please check the ID and try again.`);
      } else if (err instanceof ApiError) {
        setSearchError((err as ApiError).message);
      } else {
        setSearchError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const BIZ_STEP_MAP: Record<string, string> = {
    harvest:       'urn:epcglobal:cbv:bizstep:harvesting',
    warehousing:   'urn:epcglobal:cbv:bizstep:storing',
    in_warehouse:  'urn:epcglobal:cbv:bizstep:storing',
    lab_submission:'urn:epcglobal:cbv:bizstep:sampling',
    lab_certified: 'urn:epcglobal:cbv:bizstep:inspecting',
    certified:     'urn:epcglobal:cbv:bizstep:inspecting',
    dispatch:      'urn:epcglobal:cbv:bizstep:shipping',
    dispatched:    'urn:epcglobal:cbv:bizstep:shipping',
    recall:        'urn:epcglobal:cbv:bizstep:recall',
    recalled:      'urn:epcglobal:cbv:bizstep:recall',
  };

  const cteEvents: CTEEvent[] = traceTimeline.map(e => ({
    id:         (e.id as string) ?? `${String(e.step ?? 'event')}-${String(e.timestamp ?? Date.now())}`,
    bizStep:    BIZ_STEP_MAP[e.step as string] ?? 'urn:epcglobal:cbv:bizstep:harvesting',
    label:      e.label as string,
    location:   (e.location as string) ?? 'Location not recorded',
    eventTime:  (e.timestamp as string) ?? new Date().toISOString(),
    status:     'completed' as const,
    disposition:'active' as const,
    actor:      (e.actor as string) ?? 'system',
  }));

  const purityPct: string | null = (() => {
    if (!labData) return null;
    const moistureScore = labData.moisture != null
      ? Math.max(0, 100 - (labData.moisture / 20) * 30) : 85;
    const hmfScore = labData.hmf != null
      ? Math.max(0, 100 - (labData.hmf / 40) * 20) : 90;
    const antibioticPenalty = labData.antibioticPpb != null && labData.antibioticPpb > 0.05 ? 15 : 0;
    const composite = (moistureScore * 0.5 + hmfScore * 0.3 + (100 - antibioticPenalty) * 0.2);
    return Math.min(99.9, Math.max(70, composite)).toFixed(1);
  })();

  const stakeholders: string[] = batchData
    ? [
        batchData.farmerName         ? `Farmer: ${batchData.farmerName}`                    : null,
        batchData.warehouseId        ? `Warehouse: ${batchData.warehouseId}`                : null,
        batchData.labId              ? `Lab: ${batchData.labId}`                            : null,
        batchData.destinationEnterprise ? `Enterprise: ${batchData.destinationEnterprise}`  : null,
      ].filter(Boolean) as string[]
    : [];

  const pageHeader = (
    <div className="page-header">
      <div className="page-header-lead">
        <div className="page-header-icon">
          <Security size={26} />
        </div>
        <div className="page-header-text">
          <span className="page-header-eyebrow">Consumer Portal</span>
          <h1 className="page-header-title">HoneyTrace Consumer Portal</h1>
          <p className="page-header-subtitle">{tDashboard('portal_subtitle')}</p>
        </div>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      <BlockchainCertificate
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        batchId={searchId}
        stakeholders={stakeholders}
        txHash={batchData?.onChainTxHash}
      />

      <Stack gap={6}>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <Tile className="p-spacing-xl glass-panel rounded-2xl shadow-xl">
          <Stack gap={4}>
            <div className="flex items-center gap-spacing-sm">
              <QrCode size={24} className="text-primary" />
              <h2 className="text-h2">{tDashboard('search_title')}</h2>
            </div>

            {/* Tip: scanning the jar QR opens the page directly */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-[14px] px-3 py-2.5 text-sm text-amber-900">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-100 text-amber-700 shrink-0">
                <QrCode size={16} />
              </span>
              <span className="leading-relaxed">
                <strong>Tip:</strong> Scan the QR code on the product jar with your
                phone camera — you will be taken directly to the journey page.
                Or enter the batch ID below to search manually.
              </span>
            </div>

            <div className="flex gap-spacing-md items-end">
              <div className="flex-1">
                <TextInput
                  id="batch-search"
                  labelText={tDashboard('batch_id_label')}
                  placeholder="e.g. HT-20260402-001"
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Button
                renderIcon={Search}
                onClick={() => handleSearch()}
                disabled={!searchId.trim() || isSearching}
              >
                {isSearching ? tc('loading') : tDashboard('search_btn')}
              </Button>
            </div>

            {/* QR code — shown as soon as a valid-looking batch ID is typed */}
            {searchId.trim() && (
              <div className="border-t border-border-subtle pt-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <QrCode size={16} className="text-primary" />
                  QR Code for <span className="font-mono">{searchId.trim()}</span>
                </p>
                <QRCodeGenerator batchId={searchId.trim()} compact />
              </div>
            )}

            {searchError && (
              <InlineNotification
                kind="error"
                title={tc('error')}
                subtitle={searchError}
                hideCloseButton
              />
            )}
          </Stack>
        </Tile>

        {/* ── Results ─────────────────────────────────────────────────── */}
        {showResult && batchData && (
          <Stack gap={6}>

            {labWarning && (
              <InlineNotification
                kind="warning"
                title="Lab Results"
                subtitle={labWarning}
                hideCloseButton
              />
            )}

            {/* Quality Score */}
            <Tile className="p-spacing-xl glass-panel rounded-2xl shadow-xl">
              <div className="grid grid-cols-3 gap-spacing-lg text-center">
                <div>
                  <h2 className="text-h1 mb-1">{purityPct ? `${purityPct}%` : '—'}</h2>
                  <p className="text-caption">{tDashboard('natural_purity')}</p>
                </div>
                <div>
                  <h2 className="text-h1 mb-1">{String(batchData.grade ?? '—')}</h2>
                  <p className="text-caption">{tDashboard('quality_grade')}</p>
                </div>
                <div>
                  <h2 className="text-h1 mb-1">{String(batchData.floraType ?? '—')}</h2>
                  <p className="text-caption">{tDashboard('flora_type')}</p>
                </div>
              </div>

              {labData && (
                <div className="mt-spacing-md grid grid-cols-3 gap-spacing-sm text-center border-t border-[var(--cds-border-subtle)] pt-spacing-md">
                  <div>
                    <p className="text-xs text-muted">Moisture</p>
                    <p className="font-semibold tabular-nums">{labData.moisture != null ? `${labData.moisture}%` : '—'}</p>
                    <p className="text-xs text-muted">max 20%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">HMF</p>
                    <p className="font-semibold tabular-nums">{labData.hmf != null ? `${labData.hmf} mg/kg` : '—'}</p>
                    <p className="text-xs text-muted">max 40 mg/kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Diastase</p>
                    <p className="font-semibold tabular-nums">{labData.diastase != null ? `${labData.diastase} DN` : '—'}</p>
                    <p className="text-xs text-muted">min 8 DN</p>
                  </div>
                </div>
              )}
            </Tile>

            {/* Batch Details */}
            <Tile className="p-spacing-xl glass-panel rounded-2xl shadow-xl">
              <h3 className="text-h3 mb-spacing-md">{tDashboard('batch_details')}</h3>
              <div className="grid grid-cols-2 gap-spacing-md text-sm">
                <div>
                  <span className="text-muted">{tDashboard('farmer')}: </span>
                  <strong>{String(batchData.farmerName ?? '—')}</strong>
                </div>
                <div>
                  <span className="text-muted">{tDashboard('weight')}: </span>
                  <strong>{String(batchData.weightKg ?? '—')} kg</strong>
                </div>
                <div>
                  <span className="text-muted">{tDashboard('harvest_date')}: </span>
                  <strong>
                    {batchData.harvestDate
                      ? new Date(String(batchData.harvestDate)).toLocaleDateString('en-IN')
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted">{tDashboard('moisture')}: </span>
                  <strong>{String(batchData.moisturePct ?? '—')}%</strong>
                </div>
              </div>
              {batchData.onChainTxHash && (
                <div className="mt-spacing-md p-spacing-md bg-teal-50 border border-teal-100 rounded-xl">
                  <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">On-Chain Transaction Hash</p>
                  <p className="font-mono text-xs break-all text-teal-800">{batchData.onChainTxHash}</p>
                  <CopyableValue value={batchData.onChainTxHash} label="Copy Full Hash" className="mt-2 min-h-0 h-7 px-2 text-teal-700" />
                </div>
              )}
            </Tile>

            {/* Harvest Location Map */}
            {Boolean(batchData.latitude) && Boolean(batchData.longitude) && (
              <BlockchainMapStamp
                locationName="Harvest Location"
                latitude={batchData.latitude}
                longitude={batchData.longitude}
                utcTime={new Date().toISOString().substring(11, 19)}
              />
            )}

            {/* EPCIS 2.0 CTE Timeline */}
            {cteEvents.length > 0 && (
              <CTETimeline batchId={searchId} events={cteEvents} />
            )}

            {/* QR Prior Step display tile */}
            <PriorStepQR
              stepName="Harvest Unit"
              batchId={searchId}
              details={`${String(batchData.floraType ?? 'Honey')} | ${String(batchData.grade ?? '')} Grade`}
            />

            {/* Blockchain Certificate button */}
            <Button
              kind="ghost"
              renderIcon={CheckmarkFilled}
              onClick={() => setIsCertificateOpen(true)}
              className="w-full justify-center"
            >
              View Blockchain Certificate
            </Button>

          </Stack>
        )}

      </Stack>
    </UnifiedDashboardLayout>
  );
}
