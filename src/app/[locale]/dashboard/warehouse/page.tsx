'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Modal,
  TextInput,
  Stack,
  DataTableSkeleton,
  InlineNotification,
  Tag,
} from '@carbon/react';
import { InventoryManagement, Temperature, Humidity, Delivery, Add, Connect, Location, Time, QrCode, Blockchain } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import { useBatches } from '@/hooks/useBatches';
import { batchesApi, ApiError } from '@/lib/api';
import OnChainTxLink from '@/components/Blockchain/OnChainTxLink';

const STATUS_META: Record<string, { label: string; type: 'green' | 'blue' | 'purple' | 'red' | 'gray' }> = {
  in_warehouse: { label: 'In Warehouse', type: 'green' },
  dispatched:   { label: 'Dispatched',   type: 'blue'  },
  certified:    { label: 'Certified',    type: 'green' },
  recalled:     { label: 'Recalled',     type: 'red'   },
  in_testing:   { label: 'In Testing',   type: 'purple'},
};
const getStatus = (s: string) => STATUS_META[s] ?? { label: s.replace(/_/g, ' '), type: 'gray' as const };

export default function WarehouseDashboard() {
  const t          = useTranslations('Onboarding.warehouse');
  const tDashboard = useTranslations('Dashboard.warehouse');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'warehouse', hasKYC: true });

  const { batches, loading, error, refresh } = useBatches();

  const [isIncomingModalOpen,  setIsIncomingModalOpen]  = React.useState(false);
  const [incomingBatchId,      setIncomingBatchId]      = React.useState('');
  const [incomingError,        setIncomingError]        = React.useState<string | null>(null);
  const [incomingLoading,      setIncomingLoading]      = React.useState(false);

  const [isDispatchModalOpen,  setIsDispatchModalOpen]  = React.useState(false);
  const [dispatchBatchId,      setDispatchBatchId]      = React.useState('');
  const [dispatchDestination,  setDispatchDestination]  = React.useState('');
  const [dispatchInvoiceNo,    setDispatchInvoiceNo]    = React.useState('');
  const [dispatchError,        setDispatchError]        = React.useState<string | null>(null);
  const [dispatchLoading,      setDispatchLoading]      = React.useState(false);
  const [mapUtcTime,           setMapUtcTime]           = React.useState('--:--:--');

  React.useEffect(() => {
    setMapUtcTime(new Date().toISOString().substring(11, 19));
  }, []);

  const tourSteps = [
    { label: t('step1_title'), title: t('step1_title'), description: t('step1_desc') },
    { label: t('step2_title'), title: t('step2_title'), description: t('step2_desc') },
    { label: t('step3_title'), title: t('step3_title'), description: t('step3_desc') },
  ];

  /* ── Derived values ──────────────────────────────────────────────────── */
  const stockKg          = batches.filter(b => b.status === 'in_warehouse').reduce((s, b) => s + b.weightKg, 0);
  const inWarehouseCount = batches.filter(b => b.status === 'in_warehouse').length;
  const dispatchedKg     = batches.filter(b => b.status === 'dispatched').reduce((s, b) => s + b.weightKg, 0);
  const dispatchedCount  = batches.filter(b => b.status === 'dispatched').length;
  const avgMoisture      = inWarehouseCount > 0
    ? batches.filter(b => b.status === 'in_warehouse').reduce((s, b) => s + b.moisturePct, 0) / inWarehouseCount
    : null;
  const avgTemp          = avgMoisture != null ? Math.max(18, Math.min(32, 20 + (avgMoisture - 17) * 0.8)) : null;
  const humidity         = avgMoisture != null ? Math.max(35, Math.min(75, 45 + avgMoisture)) : null;
  const latestBatch      = batches[0];

  const occupancySet = React.useMemo(() => {
    const set = new Set<number>();
    for (const b of batches.filter(item => item.status === 'in_warehouse')) {
      const idx = (b.batchId || b.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 16;
      set.add(idx);
      if (set.size >= 16) break;
    }
    return set;
  }, [batches]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleRecordIncoming = async () => {
    const id = incomingBatchId.trim().toUpperCase();
    if (!id) { setIncomingError('Batch ID is required'); return; }
    let target = batches.find(b => (b.batchId || b.id) === id);
    if (!target) { try { target = await batchesApi.get(id); } catch { setIncomingError('Batch not found.'); return; } }
    if (target.status !== 'pending') { setIncomingError('Only pending batches can be recorded as incoming.'); return; }
    setIncomingLoading(true); setIncomingError(null);
    try {
      await batchesApi.patch(id, { status: 'in_warehouse', warehouseReceivedAt: new Date().toISOString() });
      setIsIncomingModalOpen(false); setIncomingBatchId(''); refresh();
    } catch (err) { setIncomingError(err instanceof ApiError ? err.message : 'Failed to update batch'); }
    finally { setIncomingLoading(false); }
  };

  const handleGeneratePass = async () => {
    const id = dispatchBatchId.trim().toUpperCase();
    if (!id)                        { setDispatchError('Batch ID is required'); return; }
    if (!dispatchDestination.trim()) { setDispatchError('Destination enterprise is required'); return; }
    if (!dispatchInvoiceNo.trim())   { setDispatchError('Invoice number is required'); return; }
    let target = batches.find(b => (b.batchId || b.id) === id);
    if (!target) { try { target = await batchesApi.get(id); } catch { setDispatchError('Batch not found.'); return; } }
    if (target.status !== 'certified') { setDispatchError('Only certified batches can be dispatched.'); return; }
    setDispatchLoading(true); setDispatchError(null);
    try {
      await batchesApi.patch(id, {
        status: 'dispatched', dispatchedAt: new Date().toISOString(),
        destinationEnterprise: dispatchDestination.trim(), invoiceNo: dispatchInvoiceNo.trim(),
      });
      setIsDispatchModalOpen(false); setDispatchBatchId(''); setDispatchDestination(''); setDispatchInvoiceNo(''); refresh();
    } catch (err) { setDispatchError(err instanceof ApiError ? err.message : 'Failed to update batch'); }
    finally { setDispatchLoading(false); }
  };

  /* ── Page header ─────────────────────────────────────────────────────── */
  const pageHeader = (
    <div className="wd-header">
      <div className="wd-header-left">
        <p className="wd-role-tag">Warehouse Operations · HoneyTRACE</p>
        <h1 className="wd-title">{tDashboard('warehouse_ops')}</h1>
        <p className="wd-subtitle">{tDashboard('ops_description')}</p>
      </div>
      <div className="wd-header-actions">
        <Button kind="secondary" renderIcon={Connect} onClick={() => setIsDispatchModalOpen(true)}>
          {tDashboard('manage_transfers')}
        </Button>
        <Button kind="primary" renderIcon={Add} onClick={() => setIsIncomingModalOpen(true)}>
          {tDashboard('record_incoming')}
        </Button>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <IdentityVerificationModal isOpen={isKYCOpen} role="warehouse" onCompleteAction={completeKYC} />
      <GuidedTour steps={tourSteps} isOpen={isTourOpen} onClose={closeTour} onComplete={completeTour} />

      {/* Record Incoming Modal */}
      <Modal
        open={isIncomingModalOpen}
        modalHeading={tDashboard('record_incoming')}
        primaryButtonText={incomingLoading ? 'Saving…' : 'Confirm'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={incomingLoading}
        onRequestClose={() => { setIsIncomingModalOpen(false); setIncomingBatchId(''); setIncomingError(null); }}
        onRequestSubmit={handleRecordIncoming}
        size="sm"
      >
        <Stack gap={5}>
          <p className="wd-modal-desc">Enter the batch ID to record it as received at this warehouse.</p>
          <TextInput id="incoming-batch-id" labelText="Batch ID" placeholder="HT-YYYYMMDD-NNN"
            value={incomingBatchId} onChange={e => setIncomingBatchId(e.target.value)} />
          {incomingError && <InlineNotification kind="error" title="Error" subtitle={incomingError} lowContrast hideCloseButton />}
        </Stack>
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        open={isDispatchModalOpen}
        modalHeading={tDashboard('generate_pass')}
        primaryButtonText={dispatchLoading ? 'Saving…' : 'Confirm Dispatch'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={dispatchLoading}
        onRequestClose={() => { setIsDispatchModalOpen(false); setDispatchBatchId(''); setDispatchDestination(''); setDispatchInvoiceNo(''); setDispatchError(null); }}
        onRequestSubmit={handleGeneratePass}
        size="sm"
      >
        <Stack gap={5}>
          <p className="wd-modal-desc">Mark a certified batch as dispatched and generate a dispatch pass.</p>
          <TextInput id="dispatch-batch-id" labelText="Batch ID" placeholder="HT-YYYYMMDD-NNN"
            value={dispatchBatchId} onChange={e => setDispatchBatchId(e.target.value)} />
          <TextInput id="dispatch-destination" labelText="Destination Enterprise" placeholder="e.g. Nectar Foods Pvt Ltd"
            value={dispatchDestination} onChange={e => setDispatchDestination(e.target.value)} />
          <TextInput id="dispatch-invoice-no" labelText="Invoice Number" placeholder="e.g. INV-2026-00421"
            value={dispatchInvoiceNo} onChange={e => setDispatchInvoiceNo(e.target.value)} />
          {dispatchError && <InlineNotification kind="error" title="Error" subtitle={dispatchError} lowContrast hideCloseButton />}
        </Stack>
      </Modal>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <section className="wd-kpi-grid" aria-label="Warehouse key metrics">

        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <div className="wd-kpi-icon wd-kpi-icon--blue"><InventoryManagement size={22} /></div>
            <p className="wd-kpi-label">{tDashboard('stock_level')}</p>
            <p className="wd-kpi-value">{loading ? '—' : `${stockKg.toLocaleString()} kg`}</p>
          </div>
          <div className="wd-kpi-body">
            <p className="wd-kpi-sub">{loading ? '—' : `${inWarehouseCount} active batch${inWarehouseCount !== 1 ? 'es' : ''}`}</p>
            <div className="wd-sparkbar">
              {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                <div key={i} className="wd-sparkbar-col" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <div className="wd-kpi-icon wd-kpi-icon--amber"><Temperature size={22} /></div>
            <p className="wd-kpi-label">{tDashboard('avg_temp')}</p>
            <p className="wd-kpi-value">{avgTemp == null ? '—' : `${avgTemp.toFixed(1)}°C`}</p>
          </div>
          <div className="wd-kpi-body">
            <p className="wd-kpi-sub">{avgTemp == null ? 'Awaiting telemetry' : tDashboard('environment_optimal')}</p>
            <div className="wd-temp-bar">
              <div className="wd-temp-track">
                <div className="wd-temp-thumb" style={{ left: `${avgTemp == null ? 60 : Math.min(95, Math.max(5, ((avgTemp - 15) / 20) * 100))}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <div className="wd-kpi-icon wd-kpi-icon--teal"><Humidity size={22} /></div>
            <p className="wd-kpi-label">{tDashboard('humidity')}</p>
            <p className="wd-kpi-value">{humidity == null ? '—' : `${humidity.toFixed(0)}%`}</p>
          </div>
          <div className="wd-kpi-body">
            <p className="wd-kpi-sub">{tDashboard('environment_stable')}</p>
            <div className="wd-progress-track">
              <div className="wd-progress-fill" style={{ width: `${humidity ?? 0}%` }} />
            </div>
          </div>
        </div>

        <div className="wd-kpi-card">
          <div className="wd-kpi-top">
            <div className="wd-kpi-icon wd-kpi-icon--green"><Delivery size={22} /></div>
            <p className="wd-kpi-label">{tDashboard('dispatched')}</p>
            <p className="wd-kpi-value">{loading ? '—' : `${dispatchedKg.toLocaleString()} kg`}</p>
          </div>
          <div className="wd-kpi-body">
            <p className="wd-kpi-sub">{loading ? '—' : `${dispatchedCount} shipment${dispatchedCount !== 1 ? 's' : ''}`}</p>
          </div>
        </div>

      </section>

      {/* ── Main content: Storage map + table + sidebar ───────────────────── */}
      <div className="wd-content-grid">

        {/* Left column */}
        <div className="wd-content-main">

          {/* Storage map */}
          <div className="wd-card">
            <div className="wd-card-header">
              <InventoryManagement size={18} />
              <h2 className="wd-card-title">{tDashboard('storage_map')}</h2>
            </div>
            <div className="wd-card-body">
              <div className="wd-rack-grid">
                {Array.from({ length: 16 }).map((_, i) => {
                  const occupied = occupancySet.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Rack R${i + 1} — ${occupied ? 'Occupied' : 'Available'}`}
                      aria-pressed={occupied}
                      className={`wd-rack-cell ${occupied ? 'wd-rack-cell--occupied' : ''}`}
                    >
                      <span className="wd-rack-label">R{i + 1}</span>
                      {occupied && <span className="wd-rack-dot" />}
                    </button>
                  );
                })}
              </div>
              <div className="wd-rack-legend">
                <div className="wd-rack-legend-item">
                  <div className="wd-rack-swatch wd-rack-swatch--occupied" />
                  {tDashboard('storage_occupied')}
                </div>
                <div className="wd-rack-legend-item">
                  <div className="wd-rack-swatch" />
                  {tDashboard('storage_available')}
                </div>
              </div>
            </div>
          </div>

          {/* Inventory table */}
          <section className="wd-table-section" aria-labelledby="wd-ledger-title">
            <div className="wd-table-header">
              <div>
                <h2 id="wd-ledger-title" className="wd-table-title">{tDashboard('stock_management')}</h2>
                <p className="wd-table-desc">{tDashboard('stock_desc')}</p>
              </div>
              <span className="wd-table-count">{batches.length} {batches.length === 1 ? 'record' : 'records'}</span>
            </div>

            {error && (
              <div className="p-4">
                <InlineNotification kind="error" title="Failed to load batches" subtitle={error} lowContrast hideCloseButton />
              </div>
            )}

            {loading ? (
              <DataTableSkeleton columnCount={4} rowCount={4} />
            ) : batches.length === 0 ? (
              <div className="wd-empty">
                <div className="wd-empty-icon"><InventoryManagement size={32} /></div>
                <p className="wd-empty-title">No batches recorded</p>
                <p className="wd-empty-desc">Record an incoming batch using the button above.</p>
              </div>
            ) : (
              <div className="wd-table-scroll">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th scope="col">Batch</th>
                      <th scope="col">{tDashboard('status')}</th>
                      <th scope="col">{tDashboard('last_update')}</th>
                      <th scope="col">On-Chain TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => {
                      const sm = getStatus(b.status);
                      return (
                        <tr key={b.id}>
                          <td><span className="wd-batch-id">{b.batchId || b.id}</span></td>
                          <td><Tag type={sm.type} className="wd-status-tag">{sm.label}</Tag></td>
                          <td><span className="wd-date">{b.createdAt ? b.createdAt.slice(0, 10) : '—'}</span></td>
                          <td>
                            {b.onChainTxHash ? (
                              <OnChainTxLink
                                txHash={b.onChainTxHash}
                                label="Anchor"
                                compact
                              />
                            ) : (
                              <span className="wd-tx-pending">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="wd-content-side">

          {/* Geo stamp */}
          <div className="wd-geo-card">
            <div className="wd-geo-header">
              <Location size={16} />
              <span className="wd-geo-location">{tDashboard('map_location')}</span>
              <span className="wd-geo-dot wd-geo-dot--live" aria-label="GPS active" />
            </div>
            <div className="wd-geo-coords">
              <div>
                <span className="wd-geo-meta">Coordinates</span>
                <span className="wd-geo-val">23.1245° N, 79.9430° E</span>
              </div>
              <div className="wd-geo-ts">
                <Time size={12} />
                <span className="wd-geo-val" suppressHydrationWarning>{mapUtcTime} <strong>UTC</strong></span>
              </div>
            </div>
            <p className="wd-geo-footer">Geo-secured &amp; blockchain-stamped</p>
          </div>

          {/* Latest batch reference */}
          {latestBatch && (
            <div className="wd-latest-batch">
              <div className="wd-latest-icon"><QrCode size={28} /></div>
              <div className="wd-latest-info">
                <div className="wd-latest-header">
                  <span className="wd-latest-label">Latest Batch</span>
                  <span className="wd-latest-verified"><Blockchain size={11} /> Verified</span>
                </div>
                <p className="wd-latest-id">{latestBatch.batchId || latestBatch.id}</p>
                <p className="wd-latest-desc">Moisture: {latestBatch.moisturePct}% · {latestBatch.floraType}</p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="wd-actions-card">
            <h3 className="wd-actions-title">{tDashboard('inventory_ops')}</h3>
            <div className="wd-actions-body">
              <Button size="lg" kind="primary" className="w-full !max-w-none" renderIcon={Add}
                onClick={() => setIsIncomingModalOpen(true)}>
                {tDashboard('record_incoming')}
              </Button>
              <Button size="lg" kind="secondary" className="w-full !max-w-none" renderIcon={Connect}
                onClick={() => setIsDispatchModalOpen(true)}>
                {tDashboard('generate_pass')}
              </Button>
              {latestBatch && (
                <div className="wd-receipt-note">
                  <span className="wd-receipt-dot" />
                  <div>
                    <p className="wd-receipt-title">{tDashboard('receipt_ready')}</p>
                    <p className="wd-receipt-id">{tDashboard('receipt_desc', { id: latestBatch.batchId ?? latestBatch.id ?? '—' })}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}
