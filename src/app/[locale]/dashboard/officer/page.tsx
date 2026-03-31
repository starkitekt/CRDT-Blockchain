'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { batchesApi, recallsApi, ApiError } from '@/lib/api';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import RecallManagementModal from '@/components/Traceability/RecallManagementModal';
import CopyableValue from '@/components/CopyableValue';
import type { RecallTier } from '@/types';

export default function OfficerDashboard() {
  const tOnboarding = useTranslations('Onboarding.officer');
  const tDashboard = useTranslations('Dashboard.officer');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'officer', hasKYC: true });
  const [signTimestamp, setSignTimestamp] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'flag' | null>(null);
  const [actionBatch, setActionBatch] = useState('');
  const [approvedBatches, setApprovedBatches] = useState<string[]>([]);
  const [flaggedBatches, setFlaggedBatches] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => { setSignTimestamp(new Date().toISOString()); }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { batches, loading: batchesLoading, refresh } = useBatches();

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  const rows = batches.map(b => ({
    id:        b.id,
    batch:     `${b.id} — ${b.floraType}`,
    origin:    `${b.latitude}° N, ${b.longitude}° E`,
    labResult: `Grade ${b.grade}`,
    status:    approvedBatches.includes(b.id) ? tDashboard('approved')
             : flaggedBatches.includes(b.id)  ? tDashboard('flagged_batches')
             : b.status.replace(/_/g, ' '),
  }));

  const headers = [
    { key: 'batch',     header: tDashboard('batch') },
    { key: 'origin',    header: tDashboard('origin') },
    { key: 'labResult', header: tDashboard('lab_grade') },
    { key: 'status',    header: tDashboard('status') },
  ];

  // ── Approve / flag handlers ───────────────────────────────────────────────
  const handleConfirmAction = async () => {
    if (!actionBatch || !confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmAction === 'approve') {
        await batchesApi.patch(actionBatch, { status: 'certified' });
        setApprovedBatches(p => [...p, actionBatch]);
      } else {
        await recallsApi.create({
          batchId:     actionBatch,
          tier:        2 as RecallTier,
          reason:      'Officer flagged for field audit',
          affectedKg:  0,
          initiatedBy: 'GOVT-OFC-04',
        });
        setFlaggedBatches(p => [...p, actionBatch]);
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
  const certifiedToday = batches.filter(b => approvedBatches.includes(b.id)).length;
  const flaggedCount   = flaggedBatches.length;

  const headerActions = (
    <div className="w-full md:w-80">
      <Search size="md" labelText={tDashboard('audit_search')} placeholder={tDashboard('search_placeholder')} />
    </div>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
            <Stamp size={32} />
          </div>
          {tDashboard('qc_header')}
        </h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('qc_description')}</p>
      </div>
      <div className="shrink-0">
        {headerActions}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('pending_approval')}</p>
          <h2 className="text-h1 text-gradient">{batchesLoading ? '—' : pendingCount}</h2>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase">{tDashboard('needs_review')}</span>
          </div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('approved_today')}</p>
          <h2 className="text-h1 text-gradient">{batchesLoading ? '—' : certifiedToday}</h2>
          <div className="mt-4 text-[10px] font-bold text-success uppercase">{tDashboard('signed_success')}</div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('field_audits_req')}</p>
          <h2 className="text-h1 text-gradient">5</h2>
          <div className="mt-4 text-[10px] font-bold text-warning uppercase">{tDashboard('site_visit_needed')}</div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-error relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-error/70">{tDashboard('flagged_batches')}</p>
          <h2 className="text-h1 !text-error">{flaggedCount}</h2>
          <div className="mt-4 flex items-center gap-1">
             {[1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-error rounded-full" />)}
          </div>
        </Tile>
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
             <div className="space-y-spacing-lg">
                <div className="p-spacing-lg bg-red-50/50 border-2 border-error/20 rounded-2xl relative shadow-inner ring-4 ring-red-50/20 group hover:scale-[1.01] transition-transform">
                   <div className="absolute right-spacing-md top-spacing-md">
                      <Tag type="red" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none shadow-md">{tDashboard('discrepancy_alert')}</Tag>
                   </div>
                   <p className="text-[10px] font-bold text-error mb-4 uppercase tracking-[0.2em]">{tDashboard('batch_analysis')}: <span className="mono-data font-bold">{tDashboard('batch')}-1204</span></p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">
                      <div className="flex flex-col p-4 bg-white/60 rounded-xl border border-error/10">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{tDashboard('purity_variance')}</span>
                         <span className="text-lg font-bold text-error">{tDashboard('purity_diff', { value: 3.4 })}</span>
                         <span className="text-[10px] text-slate-500 font-medium mt-1">{tDashboard('farmer')}: 98% | {tDashboard('lab')}: 94.6%</span>
                      </div>
                      <div className="flex flex-col p-4 bg-white/60 rounded-xl border border-slate-100">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{tDashboard('weight_mismatch')}</span>
                         <span className="text-lg font-bold text-success">{tDashboard('weight_ok', { value: 0.2 })}</span>
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
                        <TableRow key={row.id} className="hover:!bg-slate-50 transition-colors border-none group">
                          <TableCell className="!p-4 !border-none group-hover:pl-6 transition-all font-bold text-slate-900">{row.batch}</TableCell>
                          <TableCell className="!p-4 !border-none text-slate-500 font-medium font-mono text-[11px]">{row.origin}</TableCell>
                          <TableCell className="!p-4 !border-none font-bold text-slate-900">{row.labResult}</TableCell>
                          <TableCell className="!p-4 !border-none">
                            <Tag
                              type={approvedBatches.includes(row.id) ? 'green' : flaggedBatches.includes(row.id) ? 'red' : 'blue'}
                              renderIcon={approvedBatches.includes(row.id) ? CheckmarkFilled : WarningAltFilled}
                              className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none shadow-sm"
                            >
                              {row.status}
                            </Tag>
                          </TableCell>
                          <TableCell className="!p-4 !border-none">
                            <div className="flex gap-2">
                              <Button hasIconOnly renderIcon={View} iconDescription={tDashboard('review_action')} size="sm" kind="ghost" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                              <Button hasIconOnly renderIcon={Stamp} iconDescription={tDashboard('approve_action')} size="sm" kind="ghost" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100"
                                disabled={approvedBatches.includes(row.id)}
                                onClick={() => { setActionBatch(row.id); setConfirmAction('approve'); }} />
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
          IMMUTABLE_PAYLOAD: {confirmAction?.toUpperCase()}_BATCH_{actionBatch} · OFFICER: GOVT-OFC-04 · {signTimestamp}
        </div>
      </Modal>

        <div className="flex flex-col gap-spacing-lg">
          <PriorStepQR
            stepName={tDashboard('prior_step_name')}
            batchId="LAB-QR-901"
            details={tDashboard('prior_step_details')}
          />
          <BlockchainMapStamp 
            locationName={tDashboard('map_location_name')}
            latitude="23.2599° N"
            longitude="77.4126° E"
            utcTime="10:30:22"
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
                {`{
  "batch": "1204",
  "verified_by": "GOVT-OFC-04",
  "hash": "0x9df1...a2e8",
  "status": "APPROVED",
  "timestamp": "${signTimestamp}"
}`}
              </div>
              <CopyableValue
                value="0x9df1...a2e8"
                label="Copy Hash"
                className="text-primary mt-3 min-h-0 h-7 px-2"
              />
            </div>
            <Stack gap={4}>
              <Button size="lg" kind="primary" renderIcon={CheckmarkFilled} className="w-full !max-w-none h-14 !rounded-xl shadow-2xl" onClick={() => { setActionBatch('1204'); setConfirmAction('approve'); }}>
                 <span className="font-bold group-hover:mr-2 transition-all">{tDashboard('approve_batch')}</span>
              </Button>
              <Button size="lg" kind="ghost" renderIcon={CloseFilled} className="w-full !max-w-none h-14 !rounded-xl border border-red-300 !text-red-400 hover:!bg-red-950/30" onClick={() => { setActionBatch('HT-20240312-012'); setIsRecallOpen(true); }}>
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
