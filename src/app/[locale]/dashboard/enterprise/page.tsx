'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile, Button, Tag, InlineNotification,
  TableContainer, Table, TableHead, TableRow,
  TableHeader, TableBody, TableCell,
  Modal, Stack, DataTableSkeleton,
} from '@carbon/react';

import {
  Renew, Package, WarningAlt, CheckmarkFilled, Delivery, DataAnalytics,
} from '@carbon/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBatches } from '@/hooks/useBatches';
import BlockchainCertificate from '@/components/Traceability/BlockchainCertificate';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import OnChainTxLink from '@/components/Blockchain/OnChainTxLink';
import type { Batch } from '@/types';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function QualityTag({ batch }: { batch: Batch }) {
  if (batch.status === 'recalled')
    return <Tag type="red" renderIcon={WarningAlt} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Recalled</Tag>;
  if (batch.status === 'certified' || batch.status === 'dispatched')
    return <Tag type="green" renderIcon={CheckmarkFilled} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Certified</Tag>;
  if (batch.labResults?.passed === true)
    return <Tag type="green" renderIcon={CheckmarkFilled} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Certified</Tag>;
  if (batch.labResults?.passed === false)
    return <Tag type="magenta" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Failed</Tag>;
  return <Tag type="warm-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Pending Lab</Tag>;
}

export default function EnterpriseDashboard() {
  useTranslations('enterprise');
  const user = useCurrentUser();

  const { batches, loading, error, refresh } = useBatches({ status: 'dispatched' });

  const [certBatch, setCertBatch] = useState<Batch | null>(null);
  const [kycOpen, setKycOpen] = useState(false);
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);

  const totalKg = batches.reduce((s, b) => s + (b.weightKg ?? 0), 0);
  const certifiedCnt = batches.filter(b => b.labResults?.passed === true).length;
  const recalledCnt = batches.filter(b => b.status === 'recalled').length;
  const onChainCnt = batches.filter(b => !!b.onChainTxHash).length;

  const certStakeholders = (b: Batch): string[] =>
    [
      b.farmerName && `Farmer: ${b.farmerName}`,
      b.warehouseId && `Warehouse: ${b.warehouseId}`,
      b.labId && `Lab: ${b.labId}`,
      b.destinationEnterprise && `Enterprise: ${b.destinationEnterprise}`,
    ].filter(Boolean) as string[];

  const openCert = useCallback((b: Batch) => setCertBatch(b), []);

  const headerActions = (
    <div className="flex gap-spacing-sm">
      <Button kind="ghost" size="md" renderIcon={Renew} iconDescription="Refresh" onClick={refresh}>Refresh</Button>
      <Button kind="secondary" size="md" onClick={() => setKycOpen(true)}>KYC Documents</Button>
    </div>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
            <Package size={32} />
          </div>
          Enterprise Dashboard
        </h1>
        <p className="text-body mt-spacing-xs max-w-lg">{user?.name ?? user?.email ?? '…'}</p>
      </div>
      <div className="shrink-0">{headerActions}</div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>

      {error && (
        <InlineNotification kind="error" lowContrast title="Failed to load batches" subtitle={error} />
      )}

      {/* KPI Tiles — unified .kpi-card tokens (white surface, generous
          padding, 36px icon swatch, no oversized watermark icon). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-spacing-md">
        <div className="kpi-card kpi-card--accent-honey">
          <div className="kpi-card-body">
            <div className="flex items-start justify-between gap-3">
              <p className="kpi-card-label">Batches received</p>
              <span className="kpi-card-icon tint-honey"><Package size={18} /></span>
            </div>
            <p className="kpi-card-value">{loading ? '—' : batches.length}</p>
            <p className="kpi-card-meta flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-eyebrow !text-emerald-700">Active tracking</span>
            </p>
          </div>
        </div>

        <div className="kpi-card kpi-card--accent-ok">
          <div className="kpi-card-body">
            <div className="flex items-start justify-between gap-3">
              <p className="kpi-card-label">Certified</p>
              <span className="kpi-card-icon tint-green"><CheckmarkFilled size={18} /></span>
            </div>
            <p className="kpi-card-value">{loading ? '—' : certifiedCnt}</p>
            <p className="kpi-card-meta text-eyebrow !text-emerald-700">Quality verified</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-body">
            <div className="flex items-start justify-between gap-3">
              <p className="kpi-card-label">Total weight</p>
              <span className="kpi-card-icon tint-blue"><Delivery size={18} /></span>
            </div>
            <p className="kpi-card-value">{loading ? '—' : `${totalKg.toFixed(1)} kg`}</p>
            <p className="kpi-card-meta text-eyebrow !text-slate-500">{onChainCnt} on-chain anchored</p>
          </div>
        </div>

        <div className={`kpi-card ${recalledCnt > 0 ? 'kpi-card--accent-error' : ''}`}>
          <div className="kpi-card-body">
            <div className="flex items-start justify-between gap-3">
              <p className="kpi-card-label">Recalled</p>
              <span className="kpi-card-icon tint-error"><WarningAlt size={18} /></span>
            </div>
            <p className={`kpi-card-value ${recalledCnt > 0 ? '!text-error' : ''}`}>
              {loading ? '—' : recalledCnt}
            </p>
            <p className="kpi-card-meta text-eyebrow !text-slate-500">
              {recalledCnt > 0 ? 'Action required' : 'No active recalls'}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
        {loading ? (
          <DataTableSkeleton columnCount={9} rowCount={5} className="p-spacing-lg" />
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No dispatched batches yet</p>
            <p className="text-sm mt-1">Batches appear here once a warehouse dispatches to your organisation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TableContainer
              title={<span className="text-h3">Received Dispatches</span>}
              description="All batches dispatched to your organisation"
              className="!border-none !p-spacing-lg !bg-white"
            >
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-50">
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Batch ID</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Flora</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Farmer</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Weight</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Grade</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Quality</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">On-Chain TX</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Dispatched</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4"></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="!p-4 !border-none mono-data text-primary font-bold group-hover:pl-6 transition-all">{batch.batchId ?? batch.id}</TableCell>
                      <TableCell className="!p-4 !border-none font-medium text-slate-900">{batch.floraType ?? '—'}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">{batch.farmerName ?? '—'}</TableCell>
                      <TableCell className="!p-4 !border-none font-bold text-slate-900 font-mono">{batch.weightKg?.toFixed(1) ?? '—'} kg</TableCell>
                      <TableCell className="!p-4 !border-none">
                        <Tag type={batch.grade === 'A' ? 'green' : 'blue'} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">{batch.grade ?? '—'}</Tag>
                      </TableCell>
                      <TableCell className="!p-4 !border-none"><QualityTag batch={batch} /></TableCell>
                      <TableCell className="!p-4 !border-none">
                        {batch.onChainTxHash ? (
                          <OnChainTxLink
                            txHash={batch.onChainTxHash}
                            label="Anchor"
                            compact
                          />
                        ) : (
                          <Tag type="outline" className="!rounded-md text-eyebrow border-none">Off-chain</Tag>
                        )}
                      </TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">{fmtDate(batch.dispatchedAt)}</TableCell>
                      <TableCell className="!p-4 !border-none">
                        <div className="flex gap-2">
                          <Button size="sm" kind="ghost" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" onClick={() => openCert(batch)}>Certificate</Button>
                          <Button size="sm" kind="ghost" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" onClick={() => setDetailBatch(batch)}>Details</Button>
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

      {/* Batch Detail Modal */}
      <Modal
        open={!!detailBatch}
        modalHeading={`Batch Details — ${detailBatch?.batchId ?? detailBatch?.id ?? ''}`}
        passiveModal
        onRequestClose={() => setDetailBatch(null)}
      >
        {detailBatch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Farmer:</span> <strong>{detailBatch.farmerName ?? '—'}</strong></div>
              <div><span className="text-slate-500">Flora:</span> <strong>{detailBatch.floraType ?? '—'}</strong></div>
              <div><span className="text-slate-500">Weight:</span> <strong>{detailBatch.weightKg?.toFixed(1)} kg</strong></div>
              <div><span className="text-slate-500">Grade:</span> <strong>{detailBatch.grade ?? '—'}</strong></div>
              <div><span className="text-slate-500">Moisture:</span> <strong>{detailBatch.moisturePct ?? '—'}%</strong></div>
              <div><span className="text-slate-500">Status:</span> <strong>{detailBatch.status}</strong></div>
              <div><span className="text-slate-500">Invoice:</span> <strong>{detailBatch.invoiceNo ?? '—'}</strong></div>
              <div><span className="text-slate-500">Destination:</span> <strong>{detailBatch.destinationEnterprise ?? '—'}</strong></div>
            </div>
            {detailBatch.onChainTxHash && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-eyebrow text-slate-400 mb-2">On-chain anchor</p>
                <OnChainTxLink
                  txHash={detailBatch.onChainTxHash}
                  label="Tx hash"
                  prefetchDetails
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <BlockchainCertificate
        isOpen={!!certBatch}
        onClose={() => setCertBatch(null)}
        batchId={certBatch ? (certBatch.batchId ?? certBatch.id) : ''}
        stakeholders={certBatch ? certStakeholders(certBatch) : []}
        txHash={certBatch?.onChainTxHash}
      />

      <IdentityVerificationModal
        isOpen={kycOpen}
        onCompleteAction={() => setKycOpen(false)}
        role="enterprise"
      />
    </UnifiedDashboardLayout>
  );
}
