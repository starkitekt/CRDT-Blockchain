// src/app/[locale]/dashboard/secretary/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile, Button, Tag, Stack, ProgressBar,
  DataTable, TableContainer, Table, TableHead, TableRow,
  TableHeader, TableBody, TableCell,
  Modal, TextArea, SkeletonText, InlineNotification, NumberInput,
} from '@carbon/react';
import {
  DataAnalytics, Policy, Money, Report,
  Map as MapIcon, ChevronRight, CheckmarkFilled,
  Close, UserIdentification, Renew,
} from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import GuidedTour          from '@/components/Onboarding/GuidedTour';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import ProductionHeatMap   from '@/components/Map/ProductionHeatMap';
import type { ProductionCluster, UserRole } from '@/types';
import { useBatches } from '@/hooks/useBatches';
import { useRecalls } from '@/hooks/useRecalls';

/* ── KYC queue user shape (subset of MongoDB User doc) ─────────────────── */
interface PendingUser {
  _id:           string;
  email:         string;
  name?:         string;
  role:          UserRole;
  kycCompleted:  boolean;
  kycRejected?:  boolean;
  fssaiLicense?: string;
  createdAt?:    string;
}

const KYC_HEADERS = [
  { key: 'name',      header: 'Name / Email' },
  { key: 'role',      header: 'Role'         },
  { key: 'license',   header: 'License / ID' },
  { key: 'joined',    header: 'Registered'   },
  { key: 'actions',   header: ''             },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   KYC QUEUE SECTION
══════════════════════════════════════════════════════════════════════════ */
function KycQueue() {
  const [users,       setUsers]       = useState<PendingUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users?kycCompleted=false');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setUsers(data as PendingUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  /* approve */
  const handleApprove = async (user: PendingUser) => {
    setApprovingId(user._id);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ kycCompleted: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.filter(u => u._id !== user._id));
      setToast({ kind: 'success', msg: `KYC approved for ${user.name ?? user.email}` });
    } catch (e) {
      setToast({ kind: 'error', msg: e instanceof Error ? e.message : 'Approval failed' });
    } finally {
      setApprovingId(null);
    }
  };

  /* reject */
  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/users/${rejectTarget._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          kycRejected:     true,
          kycRejectReason: rejectReason.trim() || 'Rejected by secretary',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.filter(u => u._id !== rejectTarget._id));
      setToast({ kind: 'success', msg: `KYC rejected for ${rejectTarget.name ?? rejectTarget.email}` });
      setRejectTarget(null);
      setRejectReason('');
    } catch (e) {
      setToast({ kind: 'error', msg: e instanceof Error ? e.message : 'Rejection failed' });
    } finally {
      setRejectLoading(false);
    }
  };

  const rows = users.map(u => ({
    id:      u._id,
    name:    u.name ?? u.email,
    role:    u.role,
    license: u.fssaiLicense ?? '—',
    joined:  fmtDate(u.createdAt),
    actions: u._id,
  }));

  return (
    <>
      {toast && (
        <InlineNotification
          kind={toast.kind}
          title={toast.kind === 'success' ? 'Done' : 'Error'}
          subtitle={toast.msg}
          lowContrast
          onCloseButtonClick={() => setToast(null)}
          className="mb-4"
        />
      )}

      <Tile className="glass-panel rounded-2xl shadow-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold flex items-center gap-2">
            <UserIdentification size={20} className="text-primary" />
            KYC Approval Queue
            {!loading && (
              <Tag type={users.length > 0 ? 'red' : 'green'} className="ml-2">
                {users.length} pending
              </Tag>
            )}
          </h3>
          <Button kind="ghost" size="sm" renderIcon={Renew}
            iconDescription="Refresh" onClick={fetchPending}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <SkeletonText key={i} />)}
          </div>
        ) : error ? (
          <InlineNotification kind="error" title="Failed to load queue"
            subtitle={error} lowContrast className="m-4" />
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[var(--cds-text-secondary)]">
            <CheckmarkFilled size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-medium">All caught up — no pending KYC requests</p>
          </div>
        ) : (
          <DataTable rows={rows} headers={KYC_HEADERS}>
            {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()} size="lg">
                  <TableHead>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHeader {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => {
                      const user = users.find(u => u._id === row.id)!;
                      return (
                        <TableRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'role') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type="blue">{cell.value}</Tag>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'actions') {
                              return (
                                <TableCell key={cell.id}>
                                  <div className="flex gap-2">
                                    <Button
                                      kind="primary"
                                      size="sm"
                                      renderIcon={CheckmarkFilled}
                                      disabled={approvingId === user._id}
                                      onClick={() => handleApprove(user)}
                                    >
                                      {approvingId === user._id ? 'Approving…' : 'Approve'}
                                    </Button>
                                    <Button
                                      kind="danger--ghost"
                                      size="sm"
                                      renderIcon={Close}
                                      onClick={() => {
                                        setRejectTarget(user);
                                        setRejectReason('');
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </Tile>

      {/* Reject reason modal */}
      <Modal
        open={!!rejectTarget}
        modalHeading="Reject KYC Application"
        primaryButtonText={rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
        secondaryButtonText="Cancel"
        danger
        primaryButtonDisabled={rejectLoading}
        onRequestSubmit={handleReject}
        onRequestClose={() => { setRejectTarget(null); setRejectReason(''); }}
      >
        <p className="mb-4 text-sm">
          Rejecting KYC for <strong>{rejectTarget?.name ?? rejectTarget?.email}</strong>.
          Provide a reason (optional):
        </p>
        <TextArea
          labelText="Rejection reason"
          placeholder="e.g. FSSAI license number mismatch…"
          value={rejectReason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setRejectReason(e.target.value)
          }
          rows={3}
        />
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE  (existing content preserved exactly, KycQueue injected at top)
══════════════════════════════════════════════════════════════════════════ */
export default function SecretaryDashboard() {
  const tOnboarding = useTranslations('Onboarding.secretary');
  const tDashboard  = useTranslations('Dashboard.secretary');
  const { isTourOpen, completeTour, closeTour } = useOnboarding({ role: 'secretary' });
  const { batches, loading: batchesLoading } = useBatches();
  const { recalls } = useRecalls();
  const [pendingKycCount, setPendingKycCount] = useState<number>(0);
  const [mspValue, setMspValue] = useState<number>(348);
  const now = new Date(); const cycleId = `CYCLE-${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const [isMspModalOpen, setIsMspModalOpen] = useState(false);
  const [secretaryToast, setSecretaryToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const totalProductionKg = batches.reduce((sum, b) => sum + b.weightKg, 0);
  const activeFarmers = new Set(batches.map((b) => b.farmerId)).size;
  const totalKg = batches.reduce((sum, b) => sum + b.weightKg, 0);
  const dispatchedKg = batches.filter((b) => b.status === 'dispatched').reduce((sum, b) => sum + b.weightKg, 0);
  const disbursePct = totalKg > 0 ? Math.round((dispatchedKg / totalKg) * 100) : 0;
  const recallRate = batches.length > 0 ? ((recalls.length / batches.length) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    fetch('/api/users?kycCompleted=false')
      .then((res) => res.ok ? res.json() : [])
      .then((data: unknown) => {
        if (Array.isArray(data)) setPendingKycCount(data.length);
      })
      .catch(() => setPendingKycCount(0));
  }, []);

  const handleExportMis = async () => {
    try {
      const res = await fetch('/api/admin/export?format=csv&entity=batch');
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `honeytrace-mis-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSecretaryToast({ kind: 'success', msg: 'MIS export downloaded.' });
    } catch {
      setSecretaryToast({ kind: 'error', msg: 'Failed to export MIS.' });
    }
  };

  const handleDisburseFunds = () => {
    setSecretaryToast({ kind: 'success', msg: `Funds disbursal initiated at MSP ₹${mspValue}/kg.` });
  };

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  const productionClusters: ProductionCluster[] = [
    { id: 'siwan',     name: 'Siwan Cluster, Bihar',        lat: 26.22, lng: 84.36, farmerCount: 142, productionKg: 18400, growthPercent: 14.2, floraType: 'Mustard/Lychee' },
    { id: 'dindori',   name: 'Dindori Hub, Madhya Pradesh', lat: 22.94, lng: 81.08, farmerCount: 88,  productionKg: 11200, growthPercent: 9.7,  floraType: 'Forest/Mahua' },
    { id: 'sunderban', name: 'Sundarban Belt, WB',          lat: 21.95, lng: 88.92, farmerCount: 210, productionKg: 27600, growthPercent: 18.5, floraType: 'Mangrove' },
    { id: 'karnataka', name: 'Nilgiri Zone, Karnataka',     lat: 11.41, lng: 76.69, farmerCount: 64,  productionKg: 8900,  growthPercent: 6.1,  floraType: 'Coffee/Eucalyptus' },
    { id: 'rajasthan', name: 'Ajmer Belt, Rajasthan',       lat: 26.45, lng: 74.63, farmerCount: 97,  productionKg: 13100, growthPercent: -2.3, floraType: 'Mustard/Acacia' },
    { id: 'himachal',  name: 'Kullu Valley, Himachal',      lat: 31.96, lng: 77.10, farmerCount: 53,  productionKg: 7200,  growthPercent: 22.4, floraType: 'Apple Blossom' },
  ];

  const colorClasses: Record<string, string> = {
    blue:   'text-blue-600 bg-blue-50',
    green:  'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  const stats = [
    { label: tDashboard('total_state_production'), value: batchesLoading ? '—' : `${(totalProductionKg / 1000).toFixed(1)} ${tDashboard('tons')}`, trend: `${batches.length} batches`, color: 'blue' },
    { label: tDashboard('farmers_benefited'), value: batchesLoading ? '—' : activeFarmers.toLocaleString('en-IN'), trend: `${pendingKycCount} pending KYC`, color: 'green' },
    { label: tDashboard('active_msp'), value: `₹${mspValue}/${tDashboard('kg')}`, trend: 'Live policy', color: 'orange' },
    { label: tDashboard('export_revenue'), value: batchesLoading ? '—' : `${(dispatchedKg / 1000).toFixed(1)} ${tDashboard('tons')}`, trend: `${recallRate}% recall rate`, color: 'purple' },
  ];

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
            <Policy size={32} />
          </div>
          {tDashboard('strategic_overview')}
        </h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('ops_description')}</p>
      </div>
      <div className="flex gap-spacing-sm shrink-0">
        <Button kind="secondary" renderIcon={Report} size="lg" className="!rounded-xl shadow-lg border-slate-100" onClick={handleExportMis}>{tDashboard('export_mis')}</Button>
        <Button kind="primary"   renderIcon={Money}  size="lg" className="!rounded-xl shadow-xl" onClick={() => setIsMspModalOpen(true)}>{tDashboard('update_msp')}</Button>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      {secretaryToast && (
        <InlineNotification
          kind={secretaryToast.kind}
          title={secretaryToast.kind === 'success' ? 'Done' : 'Error'}
          subtitle={secretaryToast.msg}
          onCloseButtonClick={() => setSecretaryToast(null)}
          lowContrast
          className="mb-4"
        />
      )}

      <Modal
        open={isMspModalOpen}
        modalHeading={tDashboard('update_msp')}
        primaryButtonText="Save MSP"
        secondaryButtonText="Cancel"
        onRequestClose={() => setIsMspModalOpen(false)}
        onRequestSubmit={() => {
          setIsMspModalOpen(false);
          setSecretaryToast({ kind: 'success', msg: `MSP updated to ₹${mspValue}/kg.` });
        }}
      >
        <NumberInput
          id="msp-value"
          label="MSP (₹/kg)"
          min={1}
          value={mspValue}
          onChange={(_e, state: { value: string | number }) => {
            const next = typeof state.value === 'number' ? state.value : Number(state.value || 0);
            setMspValue(Number.isFinite(next) && next > 0 ? next : 1);
          }}
        />
      </Modal>

      {/* ── KYC Queue — NEW ──────────────────────────────────────────── */}
      <KycQueue />

      {/* ── Macro Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
        {stats.map((stat, i) => (
          <Tile key={i} className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
            <div className={`absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700 text-${stat.color}-600`}>
              {i === 0 && <DataAnalytics size={100} />}
              {i === 1 && <Policy size={100} />}
              {i === 2 && <Money size={100} />}
              {i === 3 && <Report size={100} />}
            </div>
            <span className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{stat.label}</span>
            <span className="text-h2 text-gradient block">{stat.value}</span>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${colorClasses[stat.color]}`}>{stat.trend}</span>
              <span className="text-[10px] text-slate-400 font-medium">{tDashboard('vs_last_month')}</span>
            </div>
          </Tile>
        ))}
      </div>

      {/* ── Analytics Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-lg">
        <Tile className="lg:col-span-2 min-h-[500px] flex flex-col glass-panel rounded-2xl shadow-xl elevation-premium p-0 overflow-hidden group border border-slate-100">
          <div className="p-spacing-lg border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
            <h3 className="text-h3 flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <MapIcon size={24} />
              </div>
              {tDashboard('gis_insights')}
            </h3>
            <Button size="lg" kind="ghost" renderIcon={DataAnalytics} className="!rounded-xl hover:!bg-white shadow-sm ring-1 ring-slate-100 font-bold">{tDashboard('view_gis_map')}</Button>
          </div>
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 400 }}>
            <ProductionHeatMap clusters={productionClusters} center={[24.5, 81.0]} zoom={5} />
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 shadow-lg px-3 py-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#24a148]" />High growth</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#f5a623]" />Stable</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#da1e28]" />Declining</span>
            </div>
          </div>
        </Tile>

        <div className="flex flex-col gap-spacing-lg">
          <Tile className="glass-panel bg-slate-950 text-white p-spacing-xl rounded-3xl shadow-2xl relative overflow-hidden group elevation-premium border-none">
            <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-[2000ms] text-primary">
              <Money size={240} />
            </div>
            <h3 className="text-caption text-primary/80 mb-spacing-lg italic tracking-[0.2em]">
              {tDashboard('subsidy_tracker')}
            </h3>
            <div className="bg-white/5 backdrop-blur-xl p-spacing-xl border border-white/10 rounded-2xl relative z-10 ring-1 ring-white/10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-primary/80 mb-2 uppercase tracking-[0.2em]">{tDashboard('subsidy_batch')}</p>
                  <p className="text-h2 !text-white leading-none">{cycleId}</p>
                </div>
                <Tag type="green" className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none bg-success/20 text-success shadow-lg">{tDashboard('audit_pass')}</Tag>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">{tDashboard('pending_subsidies')}</span>
                  <span className="font-bold text-lg text-primary tracking-tighter">₹4.2 {tDashboard('crore')}</span>
                </div>
                <ProgressBar label={tDashboard('pending_subsidies')} hideLabel value={disbursePct} status="finished" size="small" className="!mb-0" />
                <p className="text-[11px] text-slate-500 text-right font-bold uppercase tracking-widest">{tDashboard('disbursement_verified', { percent: disbursePct })}</p>
              </div>
              <div className="p-4 bg-black/40 rounded-xl font-mono text-[11px] text-primary/60 ring-1 ring-white/5 shadow-inner mb-8">
                {tDashboard('block_payload')}
              </div>
              <Button size="lg" kind="primary" className="w-full !max-w-none h-14 !rounded-xl shadow-2xl" renderIcon={Money} onClick={handleDisburseFunds}>
                <span className="font-bold">{tDashboard('disburse_funds')}</span>
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-success font-bold px-2 mt-spacing-xl justify-center uppercase tracking-widest">
              <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse ring-4 ring-success/20" />
              {tDashboard('audit_verification_complete')}
            </div>
          </Tile>

          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium border border-slate-100">
            <h3 className="text-caption mb-spacing-xl tracking-widest uppercase !text-slate-400">{tDashboard('district_performance')}</h3>
            <Stack gap={6}>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 group cursor-pointer hover:px-2 transition-all">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{tDashboard('siwan_cluster')}</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-1">{tDashboard('cluster_growth')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-success">+14.2%</span>
                  <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 group cursor-pointer hover:px-2 transition-all">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{tDashboard('dindori_hub')}</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-1">{tDashboard('yield_efficiency')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{tDashboard('high')}</span>
                  <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <Button size="lg" kind="ghost" className="w-full h-14 !rounded-xl border border-slate-100 hover:bg-slate-50 shadow-sm" renderIcon={DataAnalytics}>
                <span className="font-bold">{tDashboard('regional_report')}</span>
              </Button>
            </Stack>
          </Tile>
        </div>
      </div>

      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </UnifiedDashboardLayout>
  );
}
