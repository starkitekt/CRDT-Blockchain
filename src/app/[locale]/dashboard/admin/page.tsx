'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile,
  Button,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  Tag,
  Modal,
  ToastNotification,
  Toggle,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  DataTableSkeleton,
  DataTable,
  InlineNotification,
  SkeletonText,
  TextArea,
} from '@carbon/react';
import {
  IbmCloudSecurityComplianceCenter as Audit,
  Download,
  Settings,
  Information,
  WarningAltFilled,
  Renew,
  CheckmarkFilled,
  Close,
  UserIdentification,
} from '@carbon/icons-react';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import RecallManagementModal from '@/components/Traceability/RecallManagementModal';
import { useRecalls } from '@/hooks/useRecalls';
import { useBatches } from '@/hooks/useBatches';
import type { RecallEvent } from '@/types';

/* ── KYC queue user shape ───────────────────────────────────────────────── */
interface PendingUser {
  _id: string;
  email: string;
  name?: string;
  role: string;
  kycCompleted: boolean;
  fssaiLicense?: string;
  createdAt?: string;
}

const KYC_HEADERS = [
  { key: 'name', header: 'Name / Email' },
  { key: 'role', header: 'Role' },
  { key: 'license', header: 'License / ID' },
  { key: 'joined', header: 'Registered' },
  { key: 'actions', header: '' },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   KYC QUEUE COMPONENT
══════════════════════════════════════════════════════════════════════════ */
function KycQueue() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/users?kycCompleted=false');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setUsers(await res.json() as PendingUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (user: PendingUser) => {
    setApprovingId(user._id);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycCompleted: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.filter(u => u._id !== user._id));
      setToast({ kind: 'success', msg: `Approved: ${user.name ?? user.email}` });
    } catch (e) {
      setToast({ kind: 'error', msg: e instanceof Error ? e.message : 'Approval failed' });
    } finally { setApprovingId(null); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/users/${rejectTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kycRejected: true,
          kycRejectReason: rejectReason.trim() || 'Rejected by admin',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.filter(u => u._id !== rejectTarget._id));
      setToast({ kind: 'success', msg: `Rejected: ${rejectTarget.name ?? rejectTarget.email}` });
      setRejectTarget(null); setRejectReason('');
    } catch (e) {
      setToast({ kind: 'error', msg: e instanceof Error ? e.message : 'Rejection failed' });
    } finally { setRejectLoading(false); }
  };

  const rows = users.map(u => ({
    id: u._id,
    name: u.name ?? u.email,
    role: u.role,
    license: u.fssaiLicense ?? '—',
    joined: fmtDate(u.createdAt),
    actions: u._id,
  }));

  return (
    <>
      {toast && (
        <InlineNotification
          kind={toast.kind}
          lowContrast
          title={toast.kind === 'success' ? 'Done' : 'Error'}
          subtitle={toast.msg}
          onCloseButtonClick={() => setToast(null)}
          className="mb-4"
        />
      )}

      <Tile className="glass-panel rounded-2xl shadow-xl p-0 overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold flex items-center gap-2">
            <UserIdentification size={20} className="text-primary" />
            KYC Approval Queue
            {!loading && (
              <Tag type={users.length > 0 ? 'red' : 'green'} className="ml-2">
                {users.length} pending
              </Tag>
            )}
          </h3>
          <Button
            kind="ghost" size="sm"
            renderIcon={Renew}
            iconDescription="Refresh"
            onClick={fetchPending}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <SkeletonText key={i} />)}
          </div>
        ) : error ? (
          <InlineNotification
            kind="error" title="Error" subtitle={error}
            lowContrast className="m-4"
          />
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[var(--cds-text-secondary)]">
            <CheckmarkFilled size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-medium">No pending KYC requests</p>
          </div>
        ) : (
          <DataTable rows={rows} headers={KYC_HEADERS}>
            {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()} size="lg">
                  <TableHead>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHeader key={h.key} {...(() => { const { key: _k, ...rest } = getHeaderProps({ header: h }); return rest; })()}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => {
                      const user = users.find(u => u._id === row.id)!;
                      return (
                        <TableRow key={row.id} {...(() => { const { key: _k, ...rest } = getRowProps({ row }); return rest; })()}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'role') return (
                              <TableCell key={cell.id}>
                                <Tag type="blue">{cell.value}</Tag>
                              </TableCell>
                            );
                            if (cell.info.header === 'actions') return (
                              <TableCell key={cell.id}>
                                <div className="flex gap-2">
                                  <Button
                                    kind="primary" size="sm"
                                    renderIcon={CheckmarkFilled}
                                    disabled={approvingId === user._id}
                                    onClick={() => handleApprove(user)}
                                  >
                                    {approvingId === user._id ? 'Approving…' : 'Approve'}
                                  </Button>
                                  <Button
                                    kind="danger--ghost" size="sm"
                                    renderIcon={Close}
                                    onClick={() => { setRejectTarget(user); setRejectReason(''); }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            );
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   REAL PLATFORM STATS HOOK
══════════════════════════════════════════════════════════════════════════ */
function useAdminStats() {
  const { batches, loading: bLoading } = useBatches({});
  const [pendingKyc, setPendingKyc] = useState<number | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch('/api/users?kycCompleted=false')
      .then(r => r.json())
      .then((d: unknown[]) => setPendingKyc(d.length))
      .catch(() => setPendingKyc(0))
      .finally(() => setKycLoading(false));
  }, []);

  const certifiedPct = batches.length > 0
    ? ((batches.filter(b =>
      b.status === 'certified' || b.status === 'dispatched'
    ).length / batches.length) * 100).toFixed(1)
    : null;

  return {
    batches,
    totalBatches: bLoading ? null : batches.length,
    certifiedPct: bLoading ? null : certifiedPct,
    pendingKyc: kycLoading ? null : pendingKyc,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const t = useTranslations('Dashboard.admin');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const { recalls, loading: recallsLoading, error: recallsError, refresh: refreshRecalls } = useRecalls();
  const { batches, totalBatches, certifiedPct, pendingKyc } = useAdminStats();
  const latestBatchAt = batches[0]?.updatedAt || batches[0]?.createdAt || null;
  const msElapsed = Date.now() - new Date('2025-01-01T00:00:00Z').getTime();
  const blockHeightBase = 452000 + Math.floor(msElapsed / 12000) + batches.length + recalls.length;
  const nodes = [
    {
      name: 'Batch API Node',
      sync: latestBatchAt ? new Date(latestBatchAt).toLocaleString() : 'No sync yet',
      height: `#${blockHeightBase}`,
      status: 'synced',
    },
    {
      name: 'Recall Relay Node',
      sync: recalls[0]?.initiatedAt ? new Date(recalls[0].initiatedAt).toLocaleString() : 'No recalls yet',
      height: `#${blockHeightBase + 2}`,
      status: recalls.length > 0 ? 'synced' : 'standby',
    },
  ] as const;

  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('admin_tour_seen');
    const hasCompletedKYC = localStorage.getItem('admin_kyc_completed');
    if (!hasCompletedKYC) {
      setIsKYCOpen(true);
    } else if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, []);

  const tourSteps = [
    {
      label: 'Audit Overview',
      title: t('page_title'),
      description: t('page_subtitle'),
    },
    {
      label: 'Batch Inspection',
      title: 'Batch Inspection',
      description: 'Review harvested batches and their blockchain verification status.',
    },
    {
      label: 'Network Health',
      title: 'Network Health',
      description: 'Check connectivity of all nodes across the supply chain.',
    },
  ];

  const handleSettingsSave = () => {
    setIsSettingsOpen(false);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  const recallTierTag = (tier: RecallEvent['tier']) => {
    if (tier === 1) return <Tag type="red" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class I</Tag>;
    if (tier === 2) return <Tag type="warm-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class II</Tag>;
    return <Tag type="blue" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class III</Tag>;
  };

  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-spacing-sm w-full md:w-auto mt-spacing-md md:mt-0">
      <Button renderIcon={Audit} kind="secondary" onClick={() => setIsTourOpen(true)} className="w-full sm:w-auto flex justify-center">{t('audit_tour')}</Button>
      <Button renderIcon={WarningAltFilled} kind="danger--ghost" onClick={() => setIsRecallOpen(true)} className="w-full sm:w-auto flex justify-center">Initiate Recall</Button>
      <Button
        renderIcon={Download}
        className="w-full sm:w-auto flex justify-center"
        onClick={async () => {
          try {
            const res = await fetch('/api/admin/export?format=csv');
            if (!res.ok) throw new Error(`Export failed: ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `honeytrace-ledger-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error('Export error:', err);
          }
        }}
      >
        {t('export_ledger')}
      </Button>
    </div>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1">{t('page_title')}</h1>
        <p className="text-body mt-spacing-xs max-w-lg">{t('page_subtitle')}</p>
      </div>
      <div className="shrink-0">{headerActions}</div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>

      <RecallManagementModal
        isOpen={isRecallOpen}
        onClose={() => setIsRecallOpen(false)}
        onRecallCreated={refreshRecalls}
      />
      <IdentityVerificationModal
        isOpen={isKYCOpen}
        role="admin"
        onCompleteAction={() => {
          setIsKYCOpen(false);
          localStorage.setItem('admin_kyc_completed', 'true');
          setIsTourOpen(true);
        }}
      />
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => setIsTourOpen(false)}
      />

      {showNotification && (
        <div className="fixed top-20 right-8 z-[1001]">
          <ToastNotification
            kind="success"
            title={t('config_updated')}
            subtitle={t('config_propagated')}
            caption={new Date().toLocaleTimeString()}
          />
        </div>
      )}

      <Modal
        open={isSettingsOpen}
        modalHeading={t('modal_heading')}
        primaryButtonText={t('modal_save')}
        secondaryButtonText={t('modal_cancel')}
        onRequestClose={() => setIsSettingsOpen(false)}
        onRequestSubmit={handleSettingsSave}
      >
        <Stack gap={7}>
          <p className="text-body text-text-secondary mb-spacing-md">{t('modal_desc')}</p>
          <Toggle id="sync-toggle" labelA={t('sync_manual')} labelB={t('sync_auto')} labelText={t('sync_mode')} defaultToggled />
          <Toggle id="audit-toggle" labelA={t('audit_internal')} labelB={t('audit_global')} labelText={t('audit_visibility')} />
        </Stack>
      </Modal>

      {/* ── KYC Approval Queue ───────────────────────────────────────────── */}
      <KycQueue />

      {/* ── Platform Stats (real data) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-primary relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Audit size={120} />
          </div>
          <p className="text-caption mb-spacing-md">{t('nodes_active')}</p>
          <h2 className="text-h1 text-gradient tabular-nums">
            {totalBatches === null ? '…' : totalBatches.toLocaleString('en-IN')}
          </h2>
          <div className="mt-spacing-md">
            <Tag type="blue" className="!m-0 px-3 font-bold uppercase tracking-widest text-[10px]">
              Total Batches
            </Tag>
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-primary relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
            <Settings size={120} />
          </div>
          <p className="text-caption mb-spacing-md">{t('integrity_score')}</p>
          <h2 className="text-h1 text-gradient tabular-nums">
            {certifiedPct === null ? '…' : `${certifiedPct}%`}
          </h2>
          <div className="mt-spacing-md text-[10px] font-bold text-primary uppercase">
            Certified / Dispatched
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-success relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-[-12deg] transition-transform duration-700 text-success">
            <Download size={120} />
          </div>
          <p className="text-caption mb-spacing-md">Pending KYC</p>
          <h2 className="text-h1 text-gradient tabular-nums">
            {pendingKyc === null ? '…' : pendingKyc}
          </h2>
          <div className="mt-spacing-md flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pendingKyc ? 'bg-red-500 animate-pulse' : 'bg-success'}`} />
            <span className={`text-[10px] font-bold uppercase ${pendingKyc ? 'text-red-500' : 'text-success'}`}>
              {pendingKyc ? 'Needs attention' : 'All clear'}
            </span>
          </div>
        </Tile>

      </div>

      {/* ── Node Management ──────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden">
        <div className="p-spacing-lg border-b border-slate-100 bg-slate-50 shadow-inner">
          <h3 className="text-h3">{t('node_management')}</h3>
          <p className="text-body mt-1">{t('node_management_desc')}</p>
        </div>
        <div className="overflow-x-auto w-full">
          <StructuredListWrapper className="min-w-[700px] md:min-w-full !m-0 !border-none">
            <StructuredListHead className="!border-b !border-slate-100">
              <StructuredListRow head>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_node_location')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_last_sync')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_block_height')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_status')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_actions')}</StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {nodes.map((node) => (
                <StructuredListRow key={node.name} className="hover:!bg-slate-50 transition-colors group">
                  <StructuredListCell className="!p-spacing-lg !border-none group-hover:pl-spacing-xl transition-all font-bold">{node.name}</StructuredListCell>
                  <StructuredListCell className="!p-spacing-lg !border-none text-slate-500 font-medium">{node.sync}</StructuredListCell>
                  <StructuredListCell className="!p-spacing-lg !border-none mono-data text-primary">{node.height}</StructuredListCell>
                  <StructuredListCell className="!p-spacing-lg !border-none">
                    <Tag type={node.status === 'synced' ? 'green' : 'cool-gray'} className="!rounded-md font-bold uppercase tracking-widest text-[10px]">
                      {node.status === 'synced' ? t('node_synced') : 'Standby'}
                    </Tag>
                  </StructuredListCell>
                  <StructuredListCell className="!p-spacing-lg !border-none">
                    <div className="flex gap-2">
                      <Button hasIconOnly renderIcon={Settings} size="md" kind="ghost" iconDescription={t('modal_heading')} onClick={() => setIsSettingsOpen(true)} className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                      <Button hasIconOnly renderIcon={Information} size="md" kind="ghost" iconDescription="Info" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                    </div>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      </div>

      {/* ── Recalls Table ────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
        <div className="p-spacing-lg border-b border-slate-100 bg-slate-50 shadow-inner flex items-center justify-between">
          <div>
            <h3 className="text-h3 flex items-center gap-3">
              <WarningAltFilled size={20} className="text-red-500" />
              Recent Recalls
            </h3>
            <p className="text-body mt-1">
              {recallsLoading
                ? '…'
                : `${recalls.length} recall event${recalls.length !== 1 ? 's' : ''} on record`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          {recallsLoading ? (
            <DataTableSkeleton columnCount={5} rowCount={3} />
          ) : recallsError ? (
            <InlineNotification
              kind="error" title="Failed to load recalls"
              subtitle={recallsError} lowContrast className="m-4"
            />
          ) : recalls.length === 0 ? (
            <div className="p-spacing-xl text-center text-slate-400 text-sm font-medium">
              No recall events recorded.
            </div>
          ) : (
            <TableContainer className="!border-none !bg-white">
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-50">
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Recall ID</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Batch ID</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Tier</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Reason</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Initiated At</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recalls.map((recall) => (
                    <TableRow key={recall.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="!p-4 !border-none mono-data font-bold text-slate-900 group-hover:pl-6 transition-all">{recall.id}</TableCell>
                      <TableCell className="!p-4 !border-none mono-data text-primary font-bold">{recall.batchId}</TableCell>
                      <TableCell className="!p-4 !border-none">{recallTierTag(recall.tier)}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium max-w-xs">
                        <span className="line-clamp-1 block" title={recall.reason}>{recall.reason}</span>
                      </TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">
                        {recall.initiatedAt ? new Date(recall.initiatedAt).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>

    </UnifiedDashboardLayout>
  );
}
