// src/app/[locale]/dashboard/enterprise/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  DataTable, TableContainer, Table, TableHead, TableRow,
  TableHeader, TableBody, TableCell,
  Tag, Button, Tile, SkeletonText, InlineNotification,
  OverflowMenu, OverflowMenuItem, Stack,
  Modal,
} from '@carbon/react';

import {
  Renew, Package, WarningAlt, CheckmarkFilled,
} from '@carbon/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBatches } from '@/hooks/useBatches';
import BlockchainCertificate from '@/components/Traceability/BlockchainCertificate';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import type { Batch } from '@/types';

const HEADERS = [
  { key: 'batchId', header: 'Batch ID' },
  { key: 'floraType', header: 'Flora Type' },
  { key: 'farmerName', header: 'Farmer' },
  { key: 'weightKg', header: 'Weight (kg)' },
  { key: 'grade', header: 'Grade' },
  { key: 'invoiceNo', header: 'Invoice' },
  { key: 'dispatchedAt', header: 'Dispatched' },
  { key: 'quality', header: 'Quality' },
  { key: 'chain', header: 'On-Chain' },
  { key: 'actions', header: '' },
];

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function QualityTag({ batch }: { batch: Batch }) {
  if (batch.status === 'recalled')
    return <Tag type="red" renderIcon={WarningAlt}>Recalled</Tag>;
  if (batch.labResults?.passed === true)
    return <Tag type="green" renderIcon={CheckmarkFilled}>Certified</Tag>;
  if (batch.labResults?.passed === false)
    return <Tag type="magenta">Failed</Tag>;
  return <Tag type="warm-gray">Pending Lab</Tag>;
}

function KpiTile({ label, value, loading }: {
  label: string; value: string | number; loading: boolean;
}) {
  return (
    <Tile className="flex flex-col gap-1 min-w-[160px]">
      <span className="text-xs text-[var(--cds-text-secondary)]">{label}</span>
      {loading
        ? <SkeletonText width="60%" />
        : <span className="text-2xl font-semibold tabular-nums">{value}</span>}
    </Tile>
  );
}

export default function EnterpriseDashboard() {
  useTranslations('enterprise');
  const user = useCurrentUser();

  const { batches, loading, error, refresh } = useBatches({ status: 'dispatched' });

  const [certBatch, setCertBatch] = useState<Batch | null>(null);
  const [kycOpen, setKycOpen] = useState(false);

  /* KPIs */
  const totalKg = batches.reduce((s, b) => s + (b.weightKg ?? 0), 0);
  const certifiedCnt = batches.filter(b => b.labResults?.passed === true).length;
  const recalledCnt = batches.filter(b => b.status === 'recalled').length;
  const onChainCnt = batches.filter(b => !!b.onChainTxHash).length;

  /* DataTable rows — id must be the row key */
  const rows = batches.map(b => ({
    id: b.id,
    batchId: b.batchId ?? b.id,
    floraType: b.floraType ?? '—',
    farmerName: b.farmerName ?? '—',
    weightKg: b.weightKg?.toFixed(1) ?? '—',
    grade: b.grade ?? '—',
    invoiceNo: b.invoiceNo ?? '—',
    dispatchedAt: fmtDate(b.dispatchedAt),
    quality: b.id,   // resolved in cell renderer
    chain: b.id,
    actions: b.id,
  }));

  /* stakeholders array that BlockchainCertificate accepts */
  const certStakeholders = (b: Batch): string[] =>
    [
      b.farmerName && `Farmer: ${b.farmerName}`,
      b.warehouseId && `Warehouse: ${b.warehouseId}`,
      b.labId && `Lab: ${b.labId}`,
      b.destinationEnterprise && `Enterprise: ${b.destinationEnterprise}`,
    ].filter(Boolean) as string[];

  const openCert = useCallback((b: Batch) => setCertBatch(b), []);

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Enterprise Dashboard</h1>
          <p className="text-sm text-[var(--cds-text-secondary)] mt-0.5">
            {user?.name ?? user?.email ?? '…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button kind="ghost" size="sm" renderIcon={Renew}
            iconDescription="Refresh" onClick={refresh}>
            Refresh
          </Button>
          <Button kind="tertiary" size="sm" onClick={() => setKycOpen(true)}>
            KYC Documents
          </Button>
        </div>
      </div>

      {error && (
        <InlineNotification kind="error" lowContrast
          title="Failed to load batches" subtitle={error} />
      )}

      {/* KPI tiles */}
      <div className="flex flex-wrap gap-4">
        <KpiTile label="Batches Received" value={batches.length} loading={loading} />
        <KpiTile label="Certified" value={certifiedCnt} loading={loading} />
        <KpiTile label="Total Weight (kg)" value={totalKg.toFixed(1)} loading={loading} />
        <KpiTile label="On-Chain Anchored" value={onChainCnt} loading={loading} />
        <KpiTile label="Recalled" value={recalledCnt} loading={loading} />
      </div>

      {/* Table */}
      {loading ? (
        <Stack gap={2}>
          {[...Array(5)].map((_, i) => <SkeletonText key={i} />)}
        </Stack>
      ) : batches.length === 0 ? (
        <Tile className="text-center py-16 text-[var(--cds-text-secondary)]">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No dispatched batches yet</p>
          <p className="text-sm mt-1">
            Batches appear here once a warehouse dispatches to your organisation.
          </p>
        </Tile>
      ) : (
        <DataTable rows={rows} headers={HEADERS} isSortable>
          {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
            <TableContainer
              title="Received Dispatches"
              description="All batches dispatched to your organisation"
            >
              <Table {...getTableProps()} size="lg">
                <TableHead>
                  <TableRow>
                    {headers.map((h: any) => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row: any) => {
                    const batch = batches.find(b => b.id === row.id)!;
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map((cell: any) => {
                          switch (cell.info.header) {
                            case 'quality':
                              return (
                                <TableCell key={cell.id}>
                                  <QualityTag batch={batch} />
                                </TableCell>
                              );
                            case 'chain':
                              return (
                                <TableCell key={cell.id}>
                                  {batch.onChainTxHash
                                    ? <Tag type="teal">{batch.blockchainNetwork ?? 'anchored'}</Tag>
                                    : <Tag type="outline">Off-chain</Tag>}
                                </TableCell>
                              );
                            case 'actions':
                              return (
                                <TableCell key={cell.id}>
                                  <OverflowMenu size="sm" flipped>
                                    <OverflowMenuItem
                                      itemText="View Certificate"
                                      onClick={() => openCert(batch)}
                                    />
                                    <OverflowMenuItem
                                      itemText="Trace on-chain"
                                      onClick={() =>
                                        window.open(
                                          `/api/trace/${batch.batchId ?? batch.id}`,
                                          '_blank'
                                        )
                                      }
                                    />
                                  </OverflowMenu>
                                </TableCell>
                              );
                            default:
                              return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          }
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

      {/* BlockchainCertificate — props from consumer page: isOpen, batchId, stakeholders */}
      <BlockchainCertificate
        isOpen={!!certBatch}
        onClose={() => setCertBatch(null)}
        batchId={certBatch ? (certBatch.batchId ?? certBatch.id) : ''}
        stakeholders={certBatch ? certStakeholders(certBatch) : []}
      />

      {/* IdentityVerificationModal */}
      <IdentityVerificationModal
        isOpen={kycOpen}
        onCompleteAction={() => setKycOpen(false)}
        role="enterprise"
      />
    </div>
  );
}