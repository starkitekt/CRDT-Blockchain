'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { LabResult } from '@/types';
import {
  Tile,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Search,
  Stack,
  Modal,
  InlineNotification,
  DataTableSkeleton,
} from '@carbon/react';
import { CheckmarkFilled, WarningAltFilled, Stamp, View, CloseFilled } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBatches } from '@/hooks/useBatches';
import { batchesApi, labApi, ApiError } from '@/lib/api';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import RecallManagementModal from '@/components/Traceability/RecallManagementModal';
import CopyableValue from '@/components/CopyableValue';

export default function OfficerDashboard() {
  const currentUser = useCurrentUser();
  const tOnboarding = useTranslations('Onboarding.officer');
  const tDashboard = useTranslations('Dashboard.officer');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'officer', hasKYC: true });
  const [signTimestamp, setSignTimestamp] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'flag' | null>(null);
  const [actionBatch, setActionBatch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedAuditBatch, setSelectedAuditBatch] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLabReport, setReviewLabReport] = useState<LabResult | null>(null);
  useEffect(() => { setSignTimestamp(new Date().toISOString()); }, []);

  // â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { batches, loading: batchesLoading, refresh } = useBatches();

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  const rows = batches.map(b => ({
    id:        b.id,
    batchId:   b.batchId,
    batch:     `${b.batchId || b.id} — ${b.floraType}`,
    origin:    `${b.latitude}° N, ${b.longitude}° E`,
    labResult: `Grade ${b.grade}`,
    statusKey: b.status,
    status:    b.status === 'certified' ? tDashboard('approved')
             : b.status === 'recalled'  ? tDashboard('flagged_batches')
             : b.status.replace(/_/g, ' '),
  }));

  const headers = [
    { key: 'batch',     header: tDashboard('batch') },
    { key: 'origin',    header: tDashboard('origin') },
    { key: 'labResult', header: tDashboard('lab_grade') },
    { key: 'status',    header: tDashboard('status') },
  ];

  const handleReviewBatch = async (batchId: string) => {
    setSelectedAuditBatch(batchId);
    setIsReviewOpen(true);
    setReviewLoading(true);
    setReviewError(null);
    setReviewLabReport(null);
    try {
      const report = await labApi.getByBatch(batchId);
      setReviewLabReport(report);
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'Unable to load lab report.');
    } finally {
      setReviewLoading(false);
    }
  };

  // â”€â”€ Approve / flag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleConfirmAction = async () => {
    if (!actionBatch || !confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmAction === 'approve') {
        await batchesApi.patch(actionBatch, { status: 'certified' });
      } else {
        await batchesApi.patch(actionBatch, { status: 'recalled' });
        setIsRecallOpen(true);
      }
      refresh();
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs from live data
  const pendingCount   = batches.filter(b => b.status === 'pending' || b.status === 'in_warehouse').length;
  const certifiedToday = batches.filter(b => b.status === 'certified').length;
  const flaggedCount   = batches.filter(b => b.status === 'recalled').length;
  const fieldAuditCount = batches.filter((b) => b.status === 'in_testing').length;
  const comparisonBatch = batches.find((b) => b.batchId === selectedAuditBatch) || batches[0] || null;
  const comparisonDelta = comparisonBatch ? Number(Math.max(0, 20 - comparisonBatch.moisturePct).toFixed(1)) : 0;

  useEffect(() => {
    if (!selectedAuditBatch && batches.length > 0) {
      setSelectedAuditBatch(batches[0].batchId);
    }
  }, [batches, selectedAuditBatch]);

  const pageHeader = (
    <div className="od-header">
      <div className="od-header-left">
        <p className="od-role-tag">Quality Control Officer · HoneyTRACE</p>
        <h1 className="od-title">{tDashboard('qc_header')}</h1>
        <p className="od-subtitle">{tDashboard('qc_description')}</p>
      </div>
      <div className="od-header-actions">
        <div style={{ width: 280 }}>
          <Search size="md" labelText={tDashboard('audit_search')} placeholder={tDashboard('search_placeholder')} />
        </div>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <RecallManagementModal isOpen={isRecallOpen} onClose={() => setIsRecallOpen(false)} batchId={actionBatch} />
      <IdentityVerificationModal 
        isOpen={isKYCOpen}
        role="officer"
        onCompleteAction={completeKYC}
      />
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      {/* Stats Cards */}
      <div className="wd-kpi-grid">
        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <span className="wd-kpi-label">{tDashboard('pending_approval')}</span>
            <div className="wd-kpi-icon wd-kpi-icon--blue"><Stamp size={18} /></div>
          </div>
          <p className="wd-kpi-value">{batchesLoading ? '—' : pendingCount}</p>
          <p className="wd-kpi-meta wd-kpi-delta">{tDashboard('needs_review')}</p>
        </div>
        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <span className="wd-kpi-label">{tDashboard('approved_today')}</span>
            <div className="wd-kpi-icon wd-kpi-icon--green"><CheckmarkFilled size={18} /></div>
          </div>
          <p className="wd-kpi-value">{batchesLoading ? '—' : certifiedToday}</p>
          <p className="wd-kpi-meta">{tDashboard('signed_success')}</p>
        </div>
        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <span className="wd-kpi-label">{tDashboard('field_audits_req')}</span>
            <div className="wd-kpi-icon wd-kpi-icon--amber"><WarningAltFilled size={18} /></div>
          </div>
          <p className="wd-kpi-value">{fieldAuditCount}</p>
          <p className="wd-kpi-meta wd-kpi-delta--warn">{tDashboard('site_visit_needed')}</p>
        </div>
        <div className="wd-kpi-card kpi-card--accent-error">
          <div className="wd-kpi-top">
            <span className="wd-kpi-label" style={{ color: 'var(--error)' }}>{tDashboard('flagged_batches')}</span>
            <div className="wd-kpi-icon tint-error"><CloseFilled size={18} /></div>
          </div>
          <p className="wd-kpi-value" style={{ color: 'var(--error)' }}>{flaggedCount}</p>
          <p className="wd-kpi-meta wd-kpi-delta--error">Requires action</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-md">
        <div className="lg:col-span-2 flex flex-col gap-spacing-lg">
          {/* Comparison Hub */}
          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium">
             <h3 className="text-h3 flex items-center gap-4 mb-spacing-xl">
               <div className="p-2 bg-warning/10 rounded-lg text-warning">
                 <WarningAltFilled size={24} />
               </div>
               {tDashboard('comparison_stack')}
             </h3>
             <p className="text-[11px] text-slate-500 font-semibold mb-spacing-md">
               Reviewing batch: <span className="font-mono text-slate-800">{comparisonBatch?.batchId || comparisonBatch?.id || '--'}</span>
             </p>
             <div className="space-y-spacing-lg">
                <div className="p-spacing-lg bg-red-50/50 border-2 border-error/20 rounded-2xl relative shadow-inner ring-4 ring-red-50/20 group hover:scale-[1.01] transition-transform">
                   <div className="absolute right-spacing-md top-spacing-md">
                      <Tag type="red" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none shadow-md">{tDashboard('discrepancy_alert')}</Tag>
                   </div>
                   <p className="text-[10px] font-bold text-error mb-4 uppercase tracking-[0.2em]">{tDashboard('batch_analysis')}: <span className="mono-data font-bold">{comparisonBatch?.batchId || comparisonBatch?.id || '--'}</span></p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">
                      <div className="flex flex-col p-4 bg-white/60 rounded-xl border border-error/10">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{tDashboard('purity_variance')}</span>
                         <span className="text-lg font-bold text-error">{tDashboard('purity_diff', { value: comparisonDelta })}</span>
                         <span className="text-[10px] text-slate-500 font-medium mt-1">{tDashboard('farmer')}: {comparisonBatch ? (100 - comparisonBatch.moisturePct).toFixed(1) : '--'}% | {tDashboard('lab')}: {comparisonBatch?.labResults?.moisture != null ? (100 - comparisonBatch.labResults.moisture).toFixed(1) : '--'}%</span>
                      </div>
                      <div className="flex flex-col p-4 bg-white/60 rounded-xl border border-slate-100">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{tDashboard('weight_mismatch')}</span>
                         <span className="text-lg font-bold text-success">{tDashboard('weight_ok', { value: comparisonBatch ? Number((comparisonBatch.weightKg * 0.002).toFixed(1)) : 0 })}</span>
                         <span className="text-[10px] text-slate-500 font-medium mt-1">{tDashboard('within_threshold')}</span>
                      </div>
                      <div className="flex flex-col p-4 bg-white/60 rounded-xl border border-slate-100">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{tDashboard('location_check')}</span>
                         <span className="text-lg font-bold text-primary mono-data">{tDashboard('location_match')}</span>
                         <span className="text-[10px] text-slate-500 font-medium mt-1">{tDashboard('location_alignment')}</span>
                      </div>
                   </div>
                </div>
             </div>
          </Tile>

          {/* Audit Table */}
          <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
            {batchesLoading ? (
              <DataTableSkeleton columnCount={5} rowCount={3} className="p-spacing-lg" />
            ) : (
              <div className="overflow-x-auto">
                <TableContainer title={<span className="text-h3">{tDashboard('audit_center')}</span>} description={tDashboard('audit_description')} className="!border-none !p-spacing-lg !bg-white">
                  <Table>
                    <TableHead>
                      <TableRow className="!border-b-2 !border-slate-50">
                        {headers.map((header) => (
                          <TableHeader key={header.key} className="!bg-transparent !text-caption !text-[10px] !p-4">{header.header}</TableHeader>
                        ))}
                        <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">{tDashboard('actions')}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} className={`${selectedAuditBatch === row.batchId ? '!bg-primary/5 ring-1 ring-primary/20' : 'hover:!bg-slate-50'} transition-colors border-none group`}>
                          <TableCell className="!p-4 !border-none group-hover:pl-6 transition-all font-bold text-slate-900">{row.batch}</TableCell>
                          <TableCell className="!p-4 !border-none text-slate-500 font-medium font-mono text-[11px]">{row.origin}</TableCell>
                          <TableCell className="!p-4 !border-none font-bold text-slate-900">{row.labResult}</TableCell>
                          <TableCell className="!p-4 !border-none">
                            <Tag
                              type={row.statusKey === 'certified' ? 'green' : row.statusKey === 'recalled' ? 'red' : 'blue'}
                              renderIcon={row.statusKey === 'certified' ? CheckmarkFilled : WarningAltFilled}
                              className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none shadow-sm"
                            >
                              {row.status}
                            </Tag>
                          </TableCell>
                          <TableCell className="!p-4 !border-none">
                            <div className="flex gap-2">
                              <Button hasIconOnly renderIcon={View} iconDescription={tDashboard('review_action')} size="sm" kind={selectedAuditBatch === row.batchId ? 'secondary' : 'ghost'} className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" onClick={() => handleReviewBatch(row.batchId)} />
                              <Button hasIconOnly renderIcon={Stamp} iconDescription={tDashboard('approve_action')} size="sm" kind="ghost" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100"
                                disabled={row.statusKey === 'certified'}
                                onClick={() => { setActionBatch(row.batchId); setConfirmAction('approve'); }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </div>
        </div>

      {/* Confirmation Modal */}
      <Modal
        open={confirmAction !== null}
        modalHeading={confirmAction === 'approve' ? tDashboard('approve_batch') : tDashboard('flag_for_audit')}
        primaryButtonText={actionLoading ? 'Processing…' : confirmAction === 'approve' ? tDashboard('approve_batch') : tDashboard('flag_for_audit')}
        secondaryButtonText="Cancel"
        danger={confirmAction === 'flag'}
        primaryButtonDisabled={actionLoading}
        onRequestClose={() => { setConfirmAction(null); setActionError(null); }}
        onRequestSubmit={handleConfirmAction}
      >
        {actionError && (
          <InlineNotification kind="error" title="Action failed." subtitle={actionError} onCloseButtonClick={() => setActionError(null)} lowContrast className="mb-4" />
        )}
        <p className="text-body mb-spacing-md">
          {confirmAction === 'approve'
            ? `You are about to digitally approve batch ${actionBatch}. This action is immutable on the blockchain.`
            : `You are flagging batch ${actionBatch} for field audit. The batch will be held pending investigation.`}
        </p>
        <div className="p-spacing-md bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600">
          IMMUTABLE_PAYLOAD: {confirmAction?.toUpperCase()}_BATCH_{actionBatch} · OFFICER: {currentUser.userId || '--'} · {signTimestamp}
        </div>
      </Modal>

      <Modal
        open={isReviewOpen}
        modalHeading={`Lab Report Review • ${selectedAuditBatch || '--'}`}
        primaryButtonText="Close"
        secondaryButtonText=""
        passiveModal={false}
        onRequestClose={() => setIsReviewOpen(false)}
        onRequestSubmit={() => setIsReviewOpen(false)}
      >
        {reviewLoading && <p className="text-body">Loading lab report...</p>}
        {!reviewLoading && reviewError && (
          <InlineNotification
            kind="error"
            title="Lab report unavailable."
            subtitle={reviewError}
            onCloseButtonClick={() => setReviewError(null)}
            lowContrast
          />
        )}
        {!reviewLoading && !reviewError && !reviewLabReport && (
          <p className="text-body">No lab report found for this batch.</p>
        )}
        {!reviewLoading && reviewLabReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><strong>Batch ID:</strong> {reviewLabReport.batchId}</div>
            <div><strong>Sample ID:</strong> {reviewLabReport.sampleId}</div>
            <div><strong>Lab ID:</strong> {reviewLabReport.labId}</div>
            <div><strong>FSSAI License:</strong> {reviewLabReport.fssaiLicense}</div>
            <div><strong>NABL Cert:</strong> {reviewLabReport.nablCert}</div>
            <div><strong>Published:</strong> {reviewLabReport.publishedAt || '--'}</div>
            <div><strong>Moisture %:</strong> {reviewLabReport.moisture}</div>
            <div><strong>HMF (mg/kg):</strong> {reviewLabReport.hmf}</div>
            <div><strong>Pollen Count:</strong> {reviewLabReport.pollenCount}</div>
            <div><strong>Acidity (meq/kg):</strong> {reviewLabReport.acidity}</div>
            <div><strong>Diastase:</strong> {reviewLabReport.diastase}</div>
            <div><strong>Sucrose (g/100g):</strong> {reviewLabReport.sucrose}</div>
            <div><strong>Reducing Sugars (g/100g):</strong> {reviewLabReport.reducingSugars}</div>
            <div><strong>Conductivity (mS/cm):</strong> {reviewLabReport.conductivity}</div>
            <div><strong>Antibiotic (ppb):</strong> {reviewLabReport.antibioticPpb ?? '--'}</div>
            <div><strong>Pesticide (mg/kg):</strong> {reviewLabReport.pesticideMgKg ?? '--'}</div>
            <div><strong>Heavy Metals (mg/kg):</strong> {reviewLabReport.heavyMetalsMgKg ?? '--'}</div>
            <div><strong>NMR Score:</strong> {reviewLabReport.nmrScore ?? '--'}</div>
          </div>
        )}
      </Modal>

        <div className="flex flex-col gap-spacing-lg">
          <PriorStepQR
            stepName={tDashboard('prior_step_name')}
            batchId={comparisonBatch?.batchId || comparisonBatch?.id || '--'}
            details={tDashboard('prior_step_details')}
          />
          <BlockchainMapStamp 
            locationName={tDashboard('map_location_name')}
            latitude="23.2599° N"
            longitude="77.4126° E"
            utcTime={new Date().toISOString().substring(11, 19)}
          />
          <Tile className="glass-panel bg-slate-950 text-white p-spacing-xl rounded-3xl shadow-2xl relative overflow-hidden group elevation-premium border-none">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-[2000ms] text-primary">
              <Stamp size={240} />
            </div>
            <h3 className="text-caption text-primary/80 mb-spacing-lg italic tracking-[0.2em]">
              {tDashboard('signing_payload')}
            </h3>
            <div className="bg-white/5 backdrop-blur-xl p-spacing-xl border border-white/10 rounded-2xl relative z-10 ring-1 ring-white/10 mb-8">
              <div className="font-mono text-[10px] text-primary/80 leading-relaxed overflow-x-auto">
                {JSON.stringify({
                  batch: comparisonBatch?.batchId || comparisonBatch?.id || '--',
                  verified_by: currentUser.userId || '--',
                  hash: comparisonBatch?.onChainTxHash || comparisonBatch?.onChainDataHash || 'pending',
                  status: 'APPROVED',
                  timestamp: signTimestamp,
                }, null, 2)}
              </div>
              <CopyableValue
                value={comparisonBatch?.onChainTxHash || comparisonBatch?.onChainDataHash || '--'}
                label="Copy Hash"
                className="text-primary mt-3 min-h-0 h-7 px-2"
              />
            </div>
            <Stack gap={4}>
              <Button size="lg" kind="primary" renderIcon={CheckmarkFilled} className="w-full !max-w-none h-14 !rounded-xl shadow-2xl" onClick={() => { if (comparisonBatch) { setActionBatch(comparisonBatch.batchId); setConfirmAction('approve'); } }}>
                 <span className="font-bold group-hover:mr-2 transition-all">{tDashboard('approve_batch')}</span>
              </Button>
              <Button size="lg" kind="ghost" renderIcon={CloseFilled} className="w-full !max-w-none h-14 !rounded-xl border border-red-300 !text-red-400 hover:!bg-red-950/30" onClick={() => { if (comparisonBatch) { setActionBatch(comparisonBatch.batchId); setIsRecallOpen(true); } }}>
                <span className="font-bold">{tDashboard('flag_for_audit')}</span>
              </Button>
            </Stack>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold px-2 mt-spacing-xl justify-center uppercase tracking-widest">
               <div className="w-2 h-2 bg-slate-500 rounded-full" />
               {tDashboard('immutable_sig_ready')}
            </div>
          </Tile>
        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}
