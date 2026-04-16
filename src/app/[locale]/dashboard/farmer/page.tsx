'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Modal,
  TextInput,
  NumberInput,
  Stack,
  InlineNotification,
  DataTableSkeleton,
  Tag,
} from '@carbon/react';
import {
  Add,
  Sun,
  Growth,
  Location,
  Checkmark,
  Warning,
  Chemistry,
  Blockchain,
  QrCode,
  Time,
  DataTable as DataTableIcon,
} from '@carbon/icons-react';
import QRCodeGenerator from '@/components/Traceability/QRCodeGenerator';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBatches } from '@/hooks/useBatches';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { batchesApi, ApiError } from '@/lib/api';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import SimplifiedFarmerOnboarding from '@/components/Onboarding/SimplifiedFarmerOnboarding';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import CopyableValue from '@/components/CopyableValue';

/* ── Status helpers ─────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; type: 'green' | 'blue' | 'purple' | 'red' | 'gray' }> = {
  certified:    { label: 'Certified',     type: 'green'  },
  recalled:     { label: 'Recalled',      type: 'red'    },
  in_testing:   { label: 'In Testing',    type: 'purple' },
  in_warehouse: { label: 'In Warehouse',  type: 'blue'   },
};
const getStatus = (s: string) => STATUS_META[s] ?? { label: s.replace(/_/g, ' '), type: 'gray' as const };

/* ════════════════════════════════════════════════════════════════════════ */
export default function FarmerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const currentUser = useCurrentUser();
  const { profile, loading: profileLoading } = useUserProfile();
  const { locale }  = React.use(params);
  const t           = useTranslations('Dashboard.farmer');
  const tTour       = useTranslations('Onboarding.farmer');

  const { isTourOpen, isKYCOpen: isOnboardingOpen, completeKYC: completeOnboarding, completeTour, closeTour } =
    useOnboarding({ role: 'farmer', hasKYC: true });

  /* ── Data ─────────────────────────────────────────────────────────── */
  const { batches, loading, error: fetchError, refresh } = useBatches({ farmerId: currentUser.userId });
  const { notifications: syncNotifs, dismiss: dismissSync } = useOfflineSync();

  /* ── Modal / form ─────────────────────────────────────────────────── */
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [submitError, setSubmitError]             = useState<string | null>(null);
  const [floraType, setFloraType]                 = useState('');
  const [moistureValue, setMoistureValue]         = useState(18);
  const [formErrors, setFormErrors]               = useState<Record<string, string>>({});
  const [grade, setGrade]                         = useState<'A' | 'B'>('A');
  const [createdBatchId, setCreatedBatchId]       = useState<string | null>(null);
  const [weight, setWeight]                       = useState(100);

  /* ── GPS ──────────────────────────────────────────────────────────── */
  const [gpsReady,   setGpsReady]   = useState(false);
  const [gpsCoords,  setGpsCoords]  = useState('');
  const [gpsLat,     setGpsLat]     = useState('22.8465');
  const [gpsLng,     setGpsLng]     = useState('81.3340');
  const [gpsError,   setGpsError]   = useState('');

  /* ── Weather ──────────────────────────────────────────────────────── */
  const [weatherTemp,     setWeatherTemp]     = useState<number | null>(null);
  const [weatherHumidity, setWeatherHumidity] = useState<number | null>(null);
  const [weatherLoading,  setWeatherLoading]  = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        setGpsLat(lat); setGpsLng(lon);
        setGpsCoords(`${lat}° N, ${lon}° E`);
        setGpsReady(true); setGpsError('');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsCoords('22.8465° N, 81.3340° E (Demo)');
          setGpsReady(true);
        } else { setGpsError(err.message); }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!gpsReady) return;
    let cancelled = false;
    setWeatherLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${gpsLat}&longitude=${gpsLng}&current=temperature_2m,relative_humidity_2m`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ current?: { temperature_2m?: number; relative_humidity_2m?: number } }>;
      })
      .then((data) => {
        if (cancelled) return;
        setWeatherTemp(typeof data.current?.temperature_2m === 'number' ? data.current.temperature_2m : null);
        setWeatherHumidity(typeof data.current?.relative_humidity_2m === 'number' ? data.current.relative_humidity_2m : null);
      })
      .catch(() => { if (!cancelled) { setWeatherTemp(null); setWeatherHumidity(null); } })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [gpsReady, gpsLat, gpsLng]);

  /* ── Tour ─────────────────────────────────────────────────────────── */
  const tourSteps = [
    { label: tTour('step1_title'), title: tTour('step1_title'), description: tTour('step1_desc') },
    { label: tTour('step2_title'), title: tTour('step2_title'), description: tTour('step2_desc') },
    { label: tTour('step3_title'), title: tTour('step3_title'), description: tTour('step3_desc') },
  ];

  /* ── Validation ───────────────────────────────────────────────────── */
  const validateHarvestForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!floraType.trim())                             errors.floraType = 'Flora type is required';
    if (weight <= 0)                                   errors.weight    = 'Weight must be greater than 0';
    if (weight > 5000)                                 errors.weight    = 'Weight cannot exceed 5,000 kg';
    if (moistureValue < 10 || moistureValue > 25)      errors.moisture  = 'Moisture must be between 10% and 25%';
    if (!gpsReady)                                     errors.gps       = 'GPS lock required before submission';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleRecordSubmit = async () => {
    if (!validateHarvestForm()) return;
    setIsSubmitting(true); setSubmitError(null);
    try {
      const res = await batchesApi.create({
        farmerId: currentUser.userId, farmerName: currentUser.name,
        floraType, weightKg: weight, moisturePct: moistureValue,
        latitude: gpsLat, longitude: gpsLng, grade,
        harvestDate: new Date().toISOString().slice(0, 10),
      });
      refresh();
      setIsRecordModalOpen(false);
      setFloraType(''); setMoistureValue(18); setWeight(100); setFormErrors({});
      const newId = res?.data?.batchId ?? res?.data?.id;
      if (newId) setCreatedBatchId(String(newId));
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to record harvest. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  const openModal  = () => { setSubmitError(null); setFormErrors({}); setIsRecordModalOpen(true); };
  const closeModal = () => { setIsRecordModalOpen(false); setSubmitError(null); setFormErrors({}); };

  /* ── Derived values ───────────────────────────────────────────────── */
  const totalWeight    = batches.reduce((s, b) => s + b.weightKg, 0);
  const safeWeight     = isNaN(weight) || weight < 0 ? 0 : weight;
  const estimatedValue = (safeWeight * (grade === 'A' ? 450 : 380)).toLocaleString('en-IN');
  const latestBatch    = batches[0];
  const certifiedCount = batches.filter(b => b.status === 'certified').length;

  /* ── Page header ──────────────────────────────────────────────────── */
  const displayName = profile.name || currentUser.name || '…';
  const pageHeader = (
    <div className="fd-govid" role="region" aria-label="Farmer portal header">
      <div className="fd-govid-body">
        {/* Left — title + identity fields */}
        <div className="fd-govid-identity">
          <div className="fd-govid-info">
            <p className="fd-govid-role-tag">Persona: Farmer / Harvester</p>
            <h1 className="fd-govid-name">{displayName}&apos;s Harvest Portal</h1>
          </div>
          <div className="fd-govid-fields">
            <div className="fd-govid-field">
              <span className="fd-govid-field-label">Aadhaar:</span>
              <span className="fd-govid-field-val fd-govid-field-val--mono">
                {profileLoading
                  ? 'Loading…'
                  : profile.aadhaarMasked
                    ? profile.aadhaarMasked
                    : <span className="fd-govid-field-val--unverified">Not linked</span>
                }
                {profile.aadhaarVerified && (
                  <span className="fd-govid-verified-badge" aria-label="Aadhaar verified">
                    <Checkmark size={10} aria-hidden="true" /> Verified
                  </span>
                )}
              </span>
            </div>
            {profile.pmKisanId && (
              <div className="fd-govid-field">
                <span className="fd-govid-field-label">PM-KISAN:</span>
                <span className="fd-govid-field-val fd-govid-field-val--mono">{profile.pmKisanId}</span>
              </div>
            )}
            <span className={`fd-govid-kyc-badge ${currentUser.kycCompleted ? 'fd-govid-kyc-badge--ok' : 'fd-govid-kyc-badge--pending'}`}>
              KYC {currentUser.kycCompleted ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Right — CTA */}
        <div className="fd-govid-stats">
          <Button renderIcon={Add} size="md" onClick={openModal}>
            {t('record_harvest')}
          </Button>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <UnifiedDashboardLayout header={pageHeader}>
      {isOnboardingOpen && (
        <SimplifiedFarmerOnboarding farmerName={currentUser.name} onCompleteAction={completeOnboarding} />
      )}
      <GuidedTour steps={tourSteps} isOpen={isTourOpen} onClose={closeTour} onComplete={completeTour} />

      {/* Offline sync toasts */}
      {syncNotifs.map((n) => (
        <InlineNotification
          key={n.id}
          kind="success"
          title="Offline harvest synced."
          subtitle={n.message}
          onCloseButtonClick={() => dismissSync(n.id)}
        />
      ))}

      {/* ── Record Harvest Modal ─────────────────────────────────────── */}
      <Modal
        open={isRecordModalOpen}
        modalHeading={t('record_harvest')}
        primaryButtonText={isSubmitting ? t('recording') : t('submit_ledger')}
        secondaryButtonText={t('cancel')}
        onRequestClose={closeModal}
        onRequestSubmit={handleRecordSubmit}
        primaryButtonDisabled={isSubmitting}
        size="sm"
      >
        <Stack gap={6}>
          <p className="fd-modal-desc">{t('harvest_details')}</p>

          {submitError && (
            <InlineNotification
              kind="error"
              title="Submission failed."
              subtitle={submitError}
              onCloseButtonClick={() => setSubmitError(null)}
              lowContrast
            />
          )}

          {/* GPS status */}
          <div className={`fd-gps-status ${gpsError || formErrors.gps ? 'fd-gps-status--error' : gpsReady ? 'fd-gps-status--ok' : 'fd-gps-status--waiting'}`}>
            <Location size={16} aria-hidden="true" />
            <span>
              {gpsError
                ? gpsError
                : gpsReady
                  ? t('gpsLock', { coords: gpsCoords })
                  : t('acquiringGPS')}
            </span>
            {gpsReady && !gpsError && <Checkmark size={16} className="fd-gps-check" aria-label="GPS lock acquired" />}
            {(gpsError || formErrors.gps) && <Warning size={16} aria-label="GPS error" />}
          </div>
          {formErrors.gps && <p className="fd-field-error">{formErrors.gps}</p>}

          <TextInput
            id="origin-field"
            labelText={t('flora_type')}
            placeholder={locale === 'hi' ? 'जैसे: करंज, महुआ, बहुपुष्पीय' : 'e.g. Karanj, Mahua, Multiflora'}
            value={floraType}
            onChange={(e) => setFloraType(e.target.value)}
            invalid={!!formErrors.floraType}
            invalidText={formErrors.floraType}
          />

          <div className="fd-form-row">
            <NumberInput
              id="weight-field"
              label={t('weight_kg')}
              min={0} max={5000}
              value={weight}
              onChange={(_e, state: { value: string | number }) =>
                setWeight(typeof state?.value === 'number' ? state.value : Number(state?.value ?? 0))
              }
              invalid={!!formErrors.weight}
              invalidText={formErrors.weight}
            />
            <NumberInput
              id="moisture-content"
              label={t('moisture_content')}
              min={10} max={25}
              value={moistureValue}
              onChange={(_e, state: { value: string | number }) =>
                setMoistureValue(typeof state?.value === 'number' ? state.value : Number(state?.value ?? 18))
              }
              invalid={!!formErrors.moisture}
              invalidText={formErrors.moisture}
            />
          </div>

          {/* Grade selector */}
          <div className="fd-grade-selector">
            <span className="fd-grade-label">Honey Grade</span>
            <div className="fd-grade-options" role="group" aria-label="Select honey grade">
              <button
                type="button"
                className={`fd-grade-btn ${grade === 'A' ? 'fd-grade-btn--active' : ''}`}
                aria-pressed={grade === 'A'}
                onClick={() => setGrade('A')}
              >
                <span className="fd-grade-letter">A</span>
                <span className="fd-grade-desc">Premium · ₹450/kg</span>
              </button>
              <button
                type="button"
                className={`fd-grade-btn ${grade === 'B' ? 'fd-grade-btn--active' : ''}`}
                aria-pressed={grade === 'B'}
                onClick={() => setGrade('B')}
              >
                <span className="fd-grade-letter">B</span>
                <span className="fd-grade-desc">Standard · ₹380/kg</span>
              </button>
            </div>
          </div>

          {/* Estimated value preview */}
          {weight > 0 && (
            <div className="fd-value-preview">
              <span className="fd-value-preview-label">Estimated Value</span>
              <span className="fd-value-preview-amount">₹{estimatedValue}</span>
              <span className="fd-value-preview-note">at MSP for Grade {grade}</span>
            </div>
          )}
        </Stack>
      </Modal>

      {/* ── QR Code Modal ───────────────────────────────────────────── */}
      <Modal
        open={!!createdBatchId}
        modalHeading="Batch Registered — Product QR Code"
        passiveModal
        onRequestClose={() => setCreatedBatchId(null)}
      >
        <div className="fd-qr-modal">
          <p className="fd-qr-modal-desc">
            Your batch has been recorded on the blockchain. Print or download this QR
            code and attach it to the product jar — consumers can scan it with any
            phone camera to see the full traceability journey.
          </p>
          {createdBatchId && <QRCodeGenerator batchId={createdBatchId} />}
        </div>
      </Modal>

      {/* ── KPI Row + Side Panel ────────────────────────────────────── */}
      <section className="fd-kpi-grid" aria-label="Key performance indicators">

        {/* KPI Card — Weather */}
        <div className="fd-kpi-card fd-kpi-card--weather">
          <div className="fd-kpi-card-top">
            <div className="fd-kpi-card-icon" aria-hidden="true"><Sun size={24} /></div>
            <p className="fd-kpi-label">{t('weather_title')}</p>
            {weatherLoading ? (
              <p className="fd-kpi-loading">Fetching weather…</p>
            ) : weatherTemp != null ? (
              <p className="fd-kpi-value">{weatherTemp.toFixed(1)}°C</p>
            ) : (
              <p className="fd-kpi-value fd-kpi-value--muted">—</p>
            )}
          </div>
          <div className="fd-kpi-card-body">
            {weatherHumidity != null && (
              <p className="fd-kpi-sub">{weatherHumidity.toFixed(0)}% Relative Humidity</p>
            )}
            <span className="fd-kpi-badge fd-kpi-badge--amber">{t('weather_sunny')}</span>
            <span className="fd-kpi-badge fd-kpi-badge--green" style={{ marginTop: '0.25rem' }}>{t('weather_ideal')}</span>
          </div>
        </div>

        {/* KPI Card — MSP Calculator */}
        <div className="fd-kpi-card fd-kpi-card--msp">
          <div className="fd-kpi-card-top">
            <div className="fd-kpi-card-icon" aria-hidden="true"><Growth size={24} /></div>
            <p className="fd-kpi-label">{t('msp_calculator')}</p>
            <p className="fd-kpi-value fd-kpi-value--currency">₹{estimatedValue}</p>
          </div>
          <div className="fd-kpi-card-body">
            <p className="fd-kpi-sub">{grade === 'A' ? t('grade_a') : t('grade_b')}</p>
            <div className="fd-grade-toggle" role="group" aria-label="Grade for MSP calculation">
              <button
                type="button"
                className={`fd-grade-toggle-btn ${grade === 'A' ? 'active' : ''}`}
                aria-pressed={grade === 'A'}
                onClick={() => setGrade('A')}
              >
                Grade A
              </button>
              <button
                type="button"
                className={`fd-grade-toggle-btn ${grade === 'B' ? 'active' : ''}`}
                aria-pressed={grade === 'B'}
                onClick={() => setGrade('B')}
              >
                Grade B
              </button>
            </div>
          </div>
        </div>

        {/* KPI Card — Harvests */}
        <div className="fd-kpi-card fd-kpi-card--harvests">
          <div className="fd-kpi-card-top">
            <div className="fd-kpi-card-icon" aria-hidden="true"><Chemistry size={24} /></div>
            <p className="fd-kpi-label">{t('total_harvests')}</p>
            <p className="fd-kpi-value">{loading ? '—' : batches.length}</p>
          </div>
          <div className="fd-kpi-card-body">
            <p className="fd-kpi-sub">{certifiedCount} certified batches</p>
            <div className="fd-kpi-divider" />
            <div className="fd-kpi-row">
              <span className="fd-kpi-meta-label">{t('verified_weight')}</span>
              <span className="fd-kpi-meta-value">{loading ? '—' : `${(totalWeight / 1000).toFixed(2)} ${t('tons')}`}</span>
            </div>
          </div>
        </div>

        {/* Side: Location stamp + Latest batch */}
        <div className="fd-kpi-side">
          {/* Geo stamp */}
          <div className="fd-geo-card">
            <div className="fd-geo-header">
              <Location size={16} aria-hidden="true" />
              <span className="fd-geo-location">Dindori Forest, MP</span>
              <span className={`fd-geo-dot ${gpsReady ? 'fd-geo-dot--live' : 'fd-geo-dot--wait'}`} aria-label={gpsReady ? 'GPS active' : 'Acquiring GPS'} />
            </div>
            <div className="fd-geo-coords">
              <div>
                <span className="fd-geo-meta">Coordinates</span>
                <span className="fd-geo-val">{gpsLat}° N, {gpsLng}° E</span>
              </div>
              <div className="fd-geo-ts">
                <Time size={12} aria-hidden="true" />
                <span className="fd-geo-val" suppressHydrationWarning>
                  {new Date().toISOString().slice(11, 19)} <strong>UTC</strong>
                </span>
              </div>
            </div>
            <p className="fd-geo-footer">Geo-secured &amp; blockchain-stamped</p>
          </div>

          {/* Latest batch QR reference */}
          {latestBatch && (
            <div className="fd-latest-batch">
              <div className="fd-latest-batch-icon" aria-hidden="true">
                <QrCode size={32} />
              </div>
              <div className="fd-latest-batch-info">
                <div className="fd-latest-batch-header">
                  <span className="fd-latest-batch-label">{t('prior_step_name')}</span>
                  <span className="fd-latest-batch-verified">
                    <Blockchain size={12} aria-hidden="true" />
                    Verified
                  </span>
                </div>
                <p className="fd-latest-batch-id">{latestBatch.batchId || latestBatch.id}</p>
                <p className="fd-latest-batch-desc">{t('prior_step_desc')}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Harvest Ledger Table ─────────────────────────────────────── */}
      <section className="fd-table-section" aria-labelledby="ledger-title">
        <div className="fd-table-header">
          <div>
            <h2 id="ledger-title" className="fd-table-title">{t('recent_ledger')}</h2>
            <p className="fd-table-desc">{t('recentLedgerDesc')}</p>
          </div>
          <span className="fd-table-count" aria-label={`${batches.length} records`}>
            {batches.length} {batches.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {fetchError && (
          <div className="fd-table-error">
            <InlineNotification kind="error" title="Could not load batches." subtitle={fetchError} hideCloseButton lowContrast />
          </div>
        )}

        {loading ? (
          <DataTableSkeleton columnCount={5} rowCount={4} />
        ) : batches.length === 0 ? (
          <div className="fd-empty-state">
            <div className="fd-empty-icon" aria-hidden="true"><DataTableIcon size={40} /></div>
            <p className="fd-empty-title">No harvest records yet</p>
            <p className="fd-empty-desc">Submit your first harvest using the &quot;Record New Harvest&quot; button above.</p>
            <Button size="sm" renderIcon={Add} onClick={openModal}>Record Your First Harvest</Button>
          </div>
        ) : (
          <div className="fd-table-scroll">
            <table className="fd-table">
              <thead>
                <tr>
                  <th scope="col">{t('batchId')}</th>
                  <th scope="col">{t('harvestDate')}</th>
                  <th scope="col">{t('weight_kg')}</th>
                  <th scope="col">{t('status')}</th>
                  <th scope="col">On-Chain TX</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const statusMeta = getStatus(batch.status);
                  return (
                    <tr key={batch.id}>
                      <td>
                        <span className="fd-batch-id">{batch.batchId}</span>
                      </td>
                      <td>
                        <span className="fd-date">{batch.harvestDate}</span>
                      </td>
                      <td>
                        <span className="fd-weight">
                          <Chemistry size={14} aria-hidden="true" />
                          {batch.weightKg.toLocaleString('en-IN')} kg
                        </span>
                      </td>
                      <td>
                        <Tag type={statusMeta.type} className="fd-status-tag">
                          {statusMeta.label}
                        </Tag>
                      </td>
                      <td>
                        {batch.onChainTxHash ? (
                          <span className="fd-tx-hash">
                            <span className="fd-tx-hash-text">{batch.onChainTxHash}</span>
                            <CopyableValue value={batch.onChainTxHash} label="Copy" className="min-h-0 h-6 px-1" />
                          </span>
                        ) : (
                          <span className="fd-tx-pending">Pending</span>
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
    </UnifiedDashboardLayout>
  );
}
