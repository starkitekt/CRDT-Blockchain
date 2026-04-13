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
import CopyableValue from '@/components/CopyableValue';
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
            <Package size={100} />
          </div>
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">Batches Received</p>
          <h2 className="text-h1 text-gradient">{loading ? '—' : batches.length}</h2>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase">Active Tracking</span>
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700 text-primary">
            <CheckmarkFilled size={100} />
          </div>
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">Certified</p>
          <h2 className="text-h1 text-gradient">{loading ? '—' : certifiedCnt}</h2>
          <div className="mt-4 text-[10px] font-bold text-success uppercase">Quality Verified</div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
            <Delivery size={100} />
          </div>
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">Total Weight</p>
          <h2 className="text-h1 text-gradient">{loading ? '—' : `${totalKg.toFixed(1)} kg`}</h2>
          <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase">{onChainCnt} On-Chain Anchored</div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-error relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-[-12deg] transition-transform duration-700 text-error">
            <WarningAlt size={100} />
          </div>
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-error/70">Recalled</p>
          <h2 className="text-h1 !text-error">{loading ? '—' : recalledCnt}</h2>
          <div className="mt-4 flex items-center gap-1">
            {recalledCnt > 0 && [1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-error rounded-full" />)}
          </div>
        </Tile>
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
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] text-teal-700 break-all max-w-[200px]">{batch.onChainTxHash}</span>
                            <CopyableValue value={batch.onChainTxHash} label="Copy" className="min-h-0 h-6 px-1" />
                          </div>
                        ) : (
                          <Tag type="outline" className="!rounded-md text-[10px] border-none">Off-chain</Tag>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">On-Chain Transaction Hash</p>
                <p className="font-mono text-xs break-all text-teal-700">{detailBatch.onChainTxHash}</p>
                <CopyableValue value={detailBatch.onChainTxHash} label="Copy Full Hash" className="mt-2 min-h-0 h-7 px-2" />
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
