'use client';

import React from 'react';
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
  Stack,
  Modal,
  TextInput,
  DataTableSkeleton,
  InlineNotification,
} from '@carbon/react';
import { InventoryManagement, Temperature, Humidity, Delivery, Add, Connect } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import { useBatches } from '@/hooks/useBatches';
import { batchesApi, ApiError } from '@/lib/api';

export default function WarehouseDashboard() {
  const t = useTranslations('Onboarding.warehouse');
  const tDashboard = useTranslations('Dashboard.warehouse');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'warehouse', hasKYC: true });

  const { batches, loading, error, refresh } = useBatches();

  // Modal state — Record Incoming
  const [isIncomingModalOpen, setIsIncomingModalOpen] = React.useState(false);
  const [incomingBatchId, setIncomingBatchId] = React.useState('');
  const [incomingError, setIncomingError] = React.useState<string | null>(null);
  const [incomingLoading, setIncomingLoading] = React.useState(false);

  // Modal state — Generate Pass (dispatch)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = React.useState(false);
  const [dispatchBatchId, setDispatchBatchId] = React.useState('');
  const [dispatchDestination, setDispatchDestination] = React.useState('');
  const [dispatchInvoiceNo, setDispatchInvoiceNo] = React.useState('');
  const [dispatchError, setDispatchError] = React.useState<string | null>(null);
  const [dispatchLoading, setDispatchLoading] = React.useState(false);
  const [mapUtcTime, setMapUtcTime] = React.useState('--:--:--');

  React.useEffect(() => {
    setMapUtcTime(new Date().toISOString().substring(11, 19));
  }, []);

  const tourSteps = [
    { label: t('step1_title'), title: t('step1_title'), description: t('step1_desc') },
    { label: t('step2_title'), title: t('step2_title'), description: t('step2_desc') },
    { label: t('step3_title'), title: t('step3_title'), description: t('step3_desc') },
  ];

  // Map batches to table rows
  const rows = batches.map((b) => ({
    id: b.id,
    batchId: b.batchId || b.id,
    batch: `${b.floraType} — ${b.batchId || b.id}`,
    status: b.status,
    arrival: b.createdAt ? b.createdAt.slice(0, 10) : '--',
  }));

  // Derive stock level KPI: sum of weightKg for in_warehouse batches
  const stockKg = batches
    .filter((b) => b.status === 'in_warehouse')
    .reduce((sum, b) => sum + b.weightKg, 0);

  const inWarehouseCount = batches.filter((b) => b.status === 'in_warehouse').length;
  const dispatchedKg = batches
    .filter((b) => b.status === 'dispatched')
    .reduce((sum, b) => sum + b.weightKg, 0);
  const dispatchedCount = batches.filter((b) => b.status === 'dispatched').length;
  const avgMoisture = inWarehouseCount > 0
    ? batches
      .filter((b) => b.status === 'in_warehouse')
      .reduce((sum, b) => sum + b.moisturePct, 0) / inWarehouseCount
    : null;
  const latestBatch = batches[0];
  const occupancySet = React.useMemo(() => {
    const set = new Set<number>();
    for (const b of batches.filter((item) => item.status === 'in_warehouse')) {
      const key = b.batchId || b.id;
      const idx = key.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 16;
      set.add(idx);
      if (set.size >= 16) break;
    }
    return set;
  }, [batches]);

  const headers = [
    { key: 'batch', header: tDashboard('batch_name') },
    { key: 'status', header: tDashboard('status') },
    { key: 'arrival', header: tDashboard('last_update') },
  ];

  const handleRecordIncoming = async () => {
    const normalizedBatchId = incomingBatchId.trim().toUpperCase();
    if (!normalizedBatchId) {
      setIncomingError('Batch ID is required');
      return;
    }
    let targetBatch = batches.find((b) => (b.batchId || b.id) === normalizedBatchId);
    if (!targetBatch) {
      try {
        targetBatch = await batchesApi.get(normalizedBatchId);
      } catch {
        setIncomingError('Batch not found.');
        return;
      }
    }
    if (targetBatch.status !== 'pending') {
      setIncomingError('Only newly created (pending) batches can be recorded as incoming.');
      return;
    }
    setIncomingLoading(true);
    setIncomingError(null);
    try {
      await batchesApi.patch(normalizedBatchId, {
        status: 'in_warehouse',
        warehouseReceivedAt: new Date().toISOString(),
      });
      setIsIncomingModalOpen(false);
      setIncomingBatchId('');
      refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setIncomingError(err.message);
      } else {
        setIncomingError('Failed to update batch');
      }
    } finally {
      setIncomingLoading(false);
    }
  };

  const handleGeneratePass = async () => {
    const normalizedBatchId = dispatchBatchId.trim().toUpperCase();
    if (!normalizedBatchId) {
      setDispatchError('Batch ID is required');
      return;
    }
    if (!dispatchDestination.trim()) {
      setDispatchError('Destination enterprise is required');
      return;
    }
    if (!dispatchInvoiceNo.trim()) {
      setDispatchError('Invoice number is required');
      return;
    }
    let targetBatch = batches.find((b) => (b.batchId || b.id) === normalizedBatchId);
    if (!targetBatch) {
      try {
        targetBatch = await batchesApi.get(normalizedBatchId);
      } catch {
        setDispatchError('Batch not found.');
        return;
      }
    }
    if (targetBatch.status !== 'certified') {
      setDispatchError('Only officer-approved (certified) batches can be dispatched.');
      return;
    }
    setDispatchLoading(true);
    setDispatchError(null);
    try {
      await batchesApi.patch(normalizedBatchId, {
        status: 'dispatched',
        dispatchedAt: new Date().toISOString(),
        destinationEnterprise: dispatchDestination.trim(),
        invoiceNo: dispatchInvoiceNo.trim(),
      });
      setIsDispatchModalOpen(false);
      setDispatchBatchId('');
      setDispatchDestination('');
      setDispatchInvoiceNo('');
      refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setDispatchError(err.message);
      } else {
        setDispatchError('Failed to update batch');
      }
    } finally {
      setDispatchLoading(false);
    }
  };

  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-spacing-sm">
      <Button kind="secondary" renderIcon={Connect} onClick={() => setIsDispatchModalOpen(true)}>{tDashboard('manage_transfers')}</Button>
      <Button kind="primary" renderIcon={Add} onClick={() => setIsIncomingModalOpen(true)}>{tDashboard('record_incoming')}</Button>
    </div>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1">{tDashboard('warehouse_ops')}</h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('ops_description')}</p>
      </div>
      <div className="shrink-0">
        {headerActions}
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      {/* Record Incoming Modal */}
      <Modal
        open={isIncomingModalOpen}
        modalHeading={tDashboard('record_incoming')}
        primaryButtonText={incomingLoading ? 'Saving…' : 'Confirm'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={incomingLoading}
        onRequestClose={() => { setIsIncomingModalOpen(false); setIncomingBatchId(''); setIncomingError(null); }}
        onRequestSubmit={handleRecordIncoming}
      >
        <Stack gap={5}>
          <TextInput
            id="incoming-batch-id"
            labelText="Batch ID"
            placeholder="HT-YYYYMMDD-NNN"
            value={incomingBatchId}
            onChange={(e) => setIncomingBatchId(e.target.value)}
          />
          {incomingError && (
            <InlineNotification kind="error" title="Error" subtitle={incomingError} lowContrast hideCloseButton />
          )}
        </Stack>
      </Modal>

      {/* Generate Pass (Dispatch) Modal */}
      <Modal
        open={isDispatchModalOpen}
        modalHeading={tDashboard('generate_pass')}
        primaryButtonText={dispatchLoading ? 'Saving…' : 'Confirm Dispatch'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={dispatchLoading}
        onRequestClose={() => { setIsDispatchModalOpen(false); setDispatchBatchId(''); setDispatchDestination(''); setDispatchInvoiceNo(''); setDispatchError(null); }}
        onRequestSubmit={handleGeneratePass}
      >
        <Stack gap={5}>
          <p className="text-body">Enter the Batch ID to mark as dispatched and generate a dispatch pass.</p>
          <TextInput
            id="dispatch-batch-id"
            labelText="Batch ID"
            placeholder="HT-YYYYMMDD-NNN"
            value={dispatchBatchId}
            onChange={(e) => setDispatchBatchId(e.target.value)}
          />
          <TextInput
            id="dispatch-destination"
            labelText="Destination Enterprise"
            placeholder="e.g. Nectar Foods Pvt Ltd"
            value={dispatchDestination}
            onChange={(e) => setDispatchDestination(e.target.value)}
          />
          <TextInput
            id="dispatch-invoice-no"
            labelText="Invoice Number"
            placeholder="e.g. INV-2026-00421"
            value={dispatchInvoiceNo}
            onChange={(e) => setDispatchInvoiceNo(e.target.value)}
          />
          {dispatchError && (
            <InlineNotification kind="error" title="Error" subtitle={dispatchError} lowContrast hideCloseButton />
          )}
        </Stack>
      </Modal>

      <IdentityVerificationModal
        isOpen={isKYCOpen}
        role="warehouse"
        onCompleteAction={completeKYC}
      />
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <InventoryManagement size={100} />
          </div>
          <div className="flex justify-between items-start mb-spacing-md">
            <span className="text-caption">{tDashboard('stock_level')}</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <InventoryManagement size={20} />
            </div>
          </div>
          <div className="text-h2 font-mono text-gradient">
            {loading ? '…' : `${stockKg.toLocaleString()} kg`}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-spacing-xs tracking-widest">{tDashboard('active_batches', { count: inWarehouseCount })}</p>
          <div className="h-10 w-full bg-slate-50 flex items-end px-2 gap-1 pb-1 mt-spacing-lg rounded-lg border border-slate-100 overflow-hidden">
            {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-primary/30 rounded-t-sm hover:bg-primary transition-all cursor-pointer" />
            ))}
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
            <Temperature size={100} />
          </div>
          <div className="flex justify-between items-start mb-spacing-md">
            <span className="text-caption">{tDashboard('avg_temp')}</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Temperature size={20} />
            </div>
          </div>
          <div className="text-h2 font-mono text-gradient">
            {avgMoisture == null ? '--' : `${Math.max(18, Math.min(32, 20 + (avgMoisture - 17) * 0.8)).toFixed(1)}°C`}
          </div>
          <p className="text-[10px] font-bold text-success mt-spacing-xs uppercase tracking-widest">
            {avgMoisture == null ? 'Awaiting telemetry' : tDashboard('environment_optimal')}
          </p>
          <div className="h-10 w-full bg-slate-50 flex items-center px-4 mt-spacing-lg rounded-lg border border-slate-100">
            <div className="w-full h-1 bg-slate-200 rounded-full relative">
              <div className="absolute left-[60%] top-[-6px] w-4 h-4 bg-primary rounded-full border-4 border-white shadow-lg ring-4 ring-primary/20 transition-all" />
            </div>
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-[-12deg] transition-transform duration-700 text-primary">
            <Humidity size={100} />
          </div>
          <div className="flex justify-between items-start mb-spacing-md">
            <span className="text-caption">{tDashboard('humidity')}</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Humidity size={20} />
            </div>
          </div>
          <div className="text-h2 font-mono text-gradient">{avgMoisture == null ? '--' : `${Math.max(35, Math.min(75, 45 + avgMoisture)).toFixed(0)}%`}</div>
          <p className="text-[10px] font-bold text-success mt-spacing-xs uppercase tracking-widest">{tDashboard('environment_stable')}</p>
          <div className="h-2 w-full bg-slate-100 rounded-full mt-spacing-lg overflow-hidden">
            <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${avgMoisture == null ? 0 : Math.max(35, Math.min(75, 45 + avgMoisture))}%` }} />
          </div>
        </Tile>

        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:translate-x-4 transition-transform duration-700 text-primary">
            <Delivery size={100} />
          </div>
          <div className="flex justify-between items-start mb-spacing-md">
            <span className="text-caption">{tDashboard('dispatched')}</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Delivery size={20} />
            </div>
          </div>
          <div className="text-h2 font-mono text-gradient">{loading ? '…' : `${dispatchedKg.toLocaleString()} kg`}</div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-spacing-xs tracking-widest">{tDashboard('shipments_count', { count: dispatchedCount })}</p>
        </Tile>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-lg">
        {/* Inventory Section */}
        <div className="lg:col-span-2 flex flex-col gap-spacing-lg">
          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium">
            <h3 className="text-h3 flex items-center gap-4 mb-spacing-xl">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <InventoryManagement size={24} />
              </div>
              {tDashboard('storage_map')}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 mb-spacing-xl">
              {Array.from({ length: 16 }).map((_, i) => {
                const occupied = occupancySet.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Rack R${i + 1} — ${occupied ? 'Occupied' : 'Available'}`}
                    aria-pressed={occupied}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-[11px] font-bold transition-all group hover:scale-105 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                      ${occupied ? 'bg-primary text-white shadow-xl ring-4 ring-primary/20 border-none' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-primary/30'}
                    `}
                  >
                    <span className="opacity-60 group-hover:opacity-100">R{i+1}</span>
                    {occupied && <div className="w-1 h-1 bg-white rounded-full mt-1 animate-pulse" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-spacing-lg text-[11px] font-bold border-t border-slate-100 pt-spacing-lg uppercase tracking-widest text-slate-500">
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary rounded shadow-sm" /> {tDashboard('storage_occupied')}</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-50 border border-slate-100 rounded shadow-sm" /> {tDashboard('storage_available')}</div>
            </div>
          </Tile>

          <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
            {error && (
              <div className="p-spacing-md">
                <InlineNotification kind="error" title="Failed to load batches" subtitle={error} lowContrast hideCloseButton />
              </div>
            )}
            {loading ? (
              <DataTableSkeleton columnCount={headers.length} rowCount={4} />
            ) : (
            <TableContainer
              title={<span className="text-h3">{tDashboard('stock_management')}</span>}
              description={tDashboard('stock_desc')}
              className="!border-none !p-spacing-lg !bg-white"
            >
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-50">
                    {headers.map((header) => (
                      <TableHeader key={header.key} className="!bg-transparent !text-caption !text-[10px] !p-4">{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="!p-4 !border-none group-hover:pl-6 transition-all font-bold text-slate-900">{row.batch}</TableCell>
                      <TableCell className="!p-4 !border-none">
                        <Tag
                          type={row.status === 'in_warehouse' ? 'green' : 'blue'}
                          className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none"
                        >
                          {row.status}
                        </Tag>
                      </TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">{row.arrival}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="flex flex-col gap-spacing-lg">
          <PriorStepQR
            stepName="Farmer / Harvest"
            batchId={latestBatch?.batchId || latestBatch?.id || '--'}
            details={latestBatch ? `Verified at source. Moisture: ${latestBatch.moisturePct}%` : 'No inbound batch scanned yet.'}
          />
          <BlockchainMapStamp
            locationName={tDashboard('map_location')}
            latitude="23.1245° N"
            longitude="79.9430° E"
            utcTime={mapUtcTime}
          />
          <Tile className="glass-panel p-spacing-xl rounded-3xl shadow-2xl elevation-premium">
            <h3 className="text-h3 mb-spacing-lg">{tDashboard('inventory_ops')}</h3>
            <Stack gap={4}>
              <Button size="lg" kind="primary" className="w-full !max-w-none h-14 !rounded-xl shadow-xl" onClick={() => setIsIncomingModalOpen(true)}>
                <span className="font-bold">{tDashboard('record_incoming')}</span>
              </Button>
              <Button size="lg" kind="secondary" className="w-full !max-w-none h-14 !rounded-xl shadow-lg border-slate-100" onClick={() => setIsDispatchModalOpen(true)}>
                <span className="font-bold">{tDashboard('generate_pass')}</span>
              </Button>
              <div className="p-spacing-md bg-slate-50 rounded-2xl border border-slate-100 mt-spacing-md ring-1 ring-slate-100 shadow-inner">
                 <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                   <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                   {tDashboard('receipt_ready')}
                 </p>
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-tighter">{tDashboard('receipt_desc', { id: latestBatch?.batchId ?? latestBatch?.id ?? '—' })}</p>
              </div>
            </Stack>
          </Tile>
        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}
