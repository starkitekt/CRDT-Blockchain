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
  Modal,
  TextInput,
  NumberInput,
  Stack,
  InlineNotification,
  DataTableSkeleton,
} from '@carbon/react';
import { Add, Sun, Chemistry, Growth, Location } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBatches } from '@/hooks/useBatches';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { batchesApi, ApiError } from '@/lib/api';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import SimplifiedFarmerOnboarding from '@/components/Onboarding/SimplifiedFarmerOnboarding';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import EmptyState from '@/components/EmptyState';


export default function FarmerDashboard({
  params }: { params: Promise<{ locale: string }> }) {
  const currentUser = useCurrentUser();
  const { locale } = React.use(params);
  const t = useTranslations('Dashboard.farmer');
  const tTour = useTranslations('Onboarding.farmer');
  const { isTourOpen, isKYCOpen: isOnboardingOpen, completeKYC: completeOnboarding, completeTour, closeTour } = useOnboarding({ role: 'farmer', hasKYC: true });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { batches, loading, error: fetchError, refresh } = useBatches({ farmerId:   currentUser.userId });
  const { notifications: syncNotifs, dismiss: dismissSync } = useOfflineSync();

  // ── Modal / form state ────────────────────────────────────────────────────
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [floraType, setFloraType] = useState('');
  const [moistureValue, setMoistureValue] = useState(18);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<'A' | 'B'>('A');
  const [weight, setWeight] = useState(100);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsCoords, setGpsCoords] = useState('');
  const [gpsLat, setGpsLat] = useState('22.8465');
  const [gpsLng, setGpsLng] = useState('81.3340');
  const [gpsError, setGpsError] = useState('');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherHumidity, setWeatherHumidity] = useState<number | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        setGpsLat(lat);
        setGpsLng(lon);
        setGpsCoords(`${lat}° N, ${lon}° E`);
        setGpsReady(true);
        setGpsError('');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsCoords('22.8465° N, 81.3340° E (Demo)');
          setGpsReady(true);
        } else {
          setGpsError(err.message);
        }
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
        if (!res.ok) throw new Error('Failed to fetch weather');
        return res.json() as Promise<{
          current?: {
            temperature_2m?: number;
            relative_humidity_2m?: number;
          };
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setWeatherTemp(typeof data.current?.temperature_2m === 'number' ? data.current.temperature_2m : null);
        setWeatherHumidity(typeof data.current?.relative_humidity_2m === 'number' ? data.current.relative_humidity_2m : null);
      })
      .catch(() => {
        if (cancelled) return;
        setWeatherTemp(null);
        setWeatherHumidity(null);
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });

    return () => { cancelled = true; };
  }, [gpsReady, gpsLat, gpsLng]);

  // ── Tour ──────────────────────────────────────────────────────────────────
  const tourSteps = [
    { label: tTour('step1_title'), title: tTour('step1_title'), description: tTour('step1_desc') },
    { label: tTour('step2_title'), title: tTour('step2_title'), description: tTour('step2_desc') },
    { label: tTour('step3_title'), title: tTour('step3_title'), description: tTour('step3_desc') },
  ];

  // ── Form validation ───────────────────────────────────────────────────────
  const validateHarvestForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!floraType.trim()) errors.floraType = 'Flora type is required';
    if (weight <= 0)     errors.weight = 'Weight must be greater than 0';
    if (weight > 5000)   errors.weight = 'Weight cannot exceed 5,000 kg';
    if (moistureValue < 10 || moistureValue > 25) errors.moisture = 'Moisture must be 10–25%';
    if (!gpsReady)       errors.gps = 'GPS lock required before submission';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit → POST /api/batches ────────────────────────────────────────────
  const handleRecordSubmit = async () => {
    if (!validateHarvestForm()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await batchesApi.create({
        farmerId:   currentUser.userId,
        farmerName: currentUser.name,
        floraType,
        weightKg:   weight,
        moisturePct: moistureValue,
        latitude:   gpsLat,
        longitude:  gpsLng,
        grade,
        harvestDate: new Date().toISOString().slice(0, 10),
      });
      refresh();
      setIsRecordModalOpen(false);
      setFloraType('');
      setMoistureValue(18);
      setWeight(100);
      setFormErrors({});
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Failed to record harvest. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const totalWeight = batches.reduce((s, b) => s + b.weightKg, 0);
  const safeWeight  = isNaN(weight) || weight < 0 ? 0 : weight;
  const estimatedValue = (safeWeight * (grade === 'A' ? 450 : 380)).toLocaleString('en-IN');
  const latestBatch = batches[0];

  const statusTagType = (status: string) => {
    if (status === 'certified')   return 'green';
    if (status === 'recalled')    return 'red';
    if (status === 'in_testing')  return 'purple';
    if (status === 'in_warehouse')return 'blue';
    return 'gray';
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1">{t('portalTitle')}</h1>
        <p className="text-body mt-spacing-xs max-w-lg">{t('portalSubtitle')}</p>
      </div>
      <div className="shrink-0">
        <Button renderIcon={Add} size="md" onClick={() => setIsRecordModalOpen(true)}>
          {t('record_harvest')}
        </Button>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      {isOnboardingOpen && (
        <SimplifiedFarmerOnboarding
          farmerName={currentUser.name}
          onCompleteAction={completeOnboarding}
        />
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

      {/* Harvest Record Modal */}
      <Modal
        open={isRecordModalOpen}
        modalHeading={t('record_harvest')}
        primaryButtonText={isSubmitting ? t('recording') : t('submit_ledger')}
        secondaryButtonText={t('cancel')}
        onRequestClose={() => { setIsRecordModalOpen(false); setSubmitError(null); setFormErrors({}); }}
        onRequestSubmit={handleRecordSubmit}
        primaryButtonDisabled={isSubmitting}
      >
        <Stack gap={7}>
          <p className="text-body mb-spacing-md">{t('harvest_details')}</p>

          {submitError && (
            <InlineNotification
              kind="error"
              title="Submission failed."
              subtitle={submitError}
              onCloseButtonClick={() => setSubmitError(null)}
              lowContrast
            />
          )}

          <div className={`flex items-center gap-2 p-spacing-sm rounded text-xs font-bold border mono-data ${gpsError || formErrors.gps ? 'bg-error/5 text-error border-error/15' : 'bg-primary/5 text-primary border-primary/15'}`}>
            <Location size={16} />
            {gpsError ? gpsError : gpsReady ? t('gpsLock', { coords: gpsCoords }) : t('acquiringGPS')}
          </div>
          {formErrors.gps && <p className="text-error text-xs mt-1">{formErrors.gps}</p>}

          <TextInput
            id="origin-field"
            labelText={t('flora_type')}
            placeholder={locale === 'hi' ? 'जैसे: करंज, महुआ, बहुपुष्पीय' : 'e.g. Karanj, Mahua, Multiflora'}
            value={floraType}
            onChange={(e) => setFloraType(e.target.value)}
            invalid={!!formErrors.floraType}
            invalidText={formErrors.floraType}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-spacing-md">
            <NumberInput
              id="weight-field"
              label={t('weight_kg')}
              min={0}
              max={5000}
              value={weight}
              onChange={(_e, state: { value: string | number }) => {
                setWeight(typeof state?.value === 'number' ? state.value : Number(state?.value ?? 0));
              }}
              invalid={!!formErrors.weight}
              invalidText={formErrors.weight}
            />
            <NumberInput
              id="moisture-content"
              label={t('moisture_content')}
              min={10}
              max={25}
              value={moistureValue}
              onChange={(_e, state: { value: string | number }) => {
                setMoistureValue(typeof state?.value === 'number' ? state.value : Number(state?.value ?? 18));
              }}
              invalid={!!formErrors.moisture}
              invalidText={formErrors.moisture}
            />
          </div>
        </Stack>
      </Modal>

      {/* Stats + Map Stamp */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-lg">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">
          <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <Sun size={120} />
            </div>
            <p className="text-caption mb-spacing-md">{t('weather_title')}</p>
            <h3 className="text-h2">
              {weatherLoading ? '…' : weatherTemp == null || weatherHumidity == null ? '— / —' : `${weatherTemp.toFixed(1)}°C / ${weatherHumidity.toFixed(0)}% RH`}
            </h3>
            <div className="mt-spacing-lg">
              <Tag type="green" className="!m-0 px-3 font-bold uppercase tracking-widest text-[10px]">{t('weather_sunny')}</Tag>
              <p className="text-[10px] font-bold text-success uppercase mt-2">{t('weather_ideal')}</p>
            </div>
          </Tile>

          <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
              <Growth size={120} />
            </div>
            <p className="text-caption mb-spacing-md">{t('msp_calculator')}</p>
            <div className="flex justify-between items-center mb-spacing-md">
              <span className="text-[10px] font-bold uppercase text-slate-400">{t('selectGrade')}</span>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button type="button" aria-pressed={grade === 'A'} onClick={() => setGrade('A')} className={`px-3 py-1 text-[10px] rounded-md font-bold transition-all ${grade === 'A' ? 'bg-primary text-white shadow-md scale-105' : 'text-slate-500 hover:bg-white'}`}>A</button>
                <button type="button" aria-pressed={grade === 'B'} onClick={() => setGrade('B')} className={`px-3 py-1 text-[10px] rounded-md font-bold transition-all ${grade === 'B' ? 'bg-primary text-white shadow-md scale-105' : 'text-slate-500 hover:bg-white'}`}>B</button>
              </div>
            </div>
            <h3 className="text-h2 font-mono text-gradient">₹{estimatedValue}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">({grade === 'A' ? t('grade_a') : t('grade_b')})</p>
          </Tile>

          <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden">
            <p className="text-caption mb-spacing-md">{t('total_harvests')}</p>
            <h3 className="text-h1 text-gradient">{loading ? '—' : batches.length}</h3>
            <div className="mt-spacing-lg p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <span className="text-caption !text-[10px] !text-slate-500">{t('verified_weight')}</span>
              <span className="text-h3 mono-data">{loading ? '—' : `${(totalWeight / 1000).toFixed(1)} ${t('tons')}`}</span>
            </div>
          </Tile>
        </div>

        <div className="flex flex-col gap-spacing-md">
          <BlockchainMapStamp
            locationName="Dindori Forest, MP"
            latitude={`${gpsLat}° N`}
            longitude={`${gpsLng}° E`}
            utcTime={new Date().toISOString().slice(11, 19)}
          />
          <PriorStepQR
            stepName={t('prior_step_name')}
            batchId={latestBatch?.batchId || latestBatch?.id || '--'}
            details={t('prior_step_desc')}
          />
        </div>
      </div>

      {/* Harvest Table */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden">
        {fetchError && (
          <div className="p-4">
            <InlineNotification kind="error" title="Could not load batches." subtitle={fetchError} hideCloseButton lowContrast />
          </div>
        )}
        {loading ? (
          <DataTableSkeleton columnCount={4} rowCount={3} className="p-spacing-lg" />
        ) : (
          <div className="overflow-x-auto">
            <TableContainer
              title={<span className="text-h2">{t('recent_ledger')}</span>}
              description={t('recentLedgerDesc')}
              className="!border-none !p-spacing-lg"
            >
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-100">
                    <TableHeader className="!bg-transparent !text-caption !text-[10px]">{t('batchId')}</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px]">{t('harvestDate')}</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px]">{t('weight_kg')}</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px]">{t('status')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.length === 0 && (
                    <EmptyState title="No harvest records yet" description="Submit your first harvest using the 'Record New Harvest' button above." />
                  )}
                  {batches.map((batch) => (
                    <TableRow key={batch.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="mono-data text-primary font-bold group-hover:pl-4 transition-all">{batch.id}</TableCell>
                      <TableCell className="text-slate-500 font-medium">{batch.harvestDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-slate-900 font-mono">
                          <Chemistry size={16} className="text-primary" />
                          {batch.weightKg.toLocaleString('en-IN')} kg
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tag
                          type={statusTagType(batch.status)}
                          className="!rounded-md !px-3 font-bold uppercase tracking-widest text-[10px] border-none"
                        >
                          {batch.status.replace(/_/g, ' ')}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </div>
    </UnifiedDashboardLayout>
  );
}

