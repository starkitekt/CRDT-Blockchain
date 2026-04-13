'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Tile,
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
  DataTableSkeleton,
} from '@carbon/react';
import { Chemistry, DataAnalytics, Certificate, Information, Add, Warning } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBatches } from '@/hooks/useBatches';
import { useLabResults } from '@/hooks/useLabResults';
import { labApi, ApiError } from '@/lib/api';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import EmptyState from '@/components/EmptyState';
import CopyableValue from '@/components/CopyableValue';

interface LabFormValues {
  moisture: string;
  hmf: string;
  pollen: string;
  acidity: string;
  diastase: string;
  sucrose: string;
  reducingSugars: string;
  conductivity: string;
  nmr: string;
  antibiotic: string;
  heavyMetals: string;
  pesticide: string;
  fssaiLicense: string;
  nablCert: string;
}

const EMPTY_FORM: LabFormValues = {
  moisture: '', hmf: '', pollen: '', acidity: '',
  diastase: '', sucrose: '', reducingSugars: '', conductivity: '',
  nmr: '', antibiotic: '', heavyMetals: '', pesticide: '',
  fssaiLicense: '', nablCert: '',
};

function validateLabForm(v: LabFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  const n = (s: string) => parseFloat(s);
  if (!v.moisture || isNaN(n(v.moisture)) || n(v.moisture) > 20) e.moisture = 'Required. Codex limit ≤ 20%';
  if (!v.hmf || isNaN(n(v.hmf)) || n(v.hmf) > 40) e.hmf = 'Required. Codex limit ≤ 40 mg/kg';
  if (!v.pollen || isNaN(n(v.pollen))) e.pollen = 'Required. Enter count per 10g';
  if (!v.acidity || isNaN(n(v.acidity)) || n(v.acidity) > 50) e.acidity = 'Required. Codex limit ≤ 50 meq/kg';
  if (!v.diastase || isNaN(n(v.diastase)) || n(v.diastase) < 8) e.diastase = 'Required. Codex minimum ≥ 8 DN';
  if (!v.sucrose || isNaN(n(v.sucrose)) || n(v.sucrose) > 5) e.sucrose = 'Required. Codex limit ≤ 5 g/100g';
  if (!v.reducingSugars || isNaN(n(v.reducingSugars)) || n(v.reducingSugars) < 60) e.reducingSugars = 'Required. Codex minimum ≥ 60 g/100g';
  if (!v.conductivity || isNaN(n(v.conductivity))) e.conductivity = 'Required.';
  if (!v.fssaiLicense || v.fssaiLicense.length < 14) e.fssaiLicense = 'FSSAI license must be 14 digits';
  if (!v.nablCert || !v.nablCert.trim()) e.nablCert = 'NABL certificate is required';
  return e;
}

export default function LabDashboard() {
  const currentUser = useCurrentUser();
  const tOnboarding = useTranslations('Onboarding.lab');
  const tDashboard = useTranslations('Dashboard.lab');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'lab', hasKYC: true });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { batches: pendingBatches, loading: batchesLoading, refresh: refreshBatches } = useBatches();
  const { results: publishedResults, loading: resultsLoading, refresh: refreshResults } = useLabResults();

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [form, setForm] = useState<LabFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [serverViolations, setServerViolations] = useState<string[]>([]);
  const formRootRef = React.useRef<HTMLDivElement | null>(null);

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  // Derive queue rows from real batch data
  const queueRows = pendingBatches.map(b => ({
    id:       b.id,
    batch:    `${b.floraType} — ${b.farmerName}`,
    status:   b.status.replace(/_/g, ' '),
    received: b.harvestDate,
  }));

  const queueHeaders = [
    { key: 'id',       header: tDashboard('labId') },
    { key: 'batch',    header: tDashboard('sampleBatch') },
    { key: 'status',   header: tDashboard('status') },
    { key: 'received', header: tDashboard('received') },
  ];

  // KPIs from real data
  const pendingCount   = pendingBatches.filter(b => b.status !== 'certified' && b.status !== 'recalled').length;
  const certifiedCount = publishedResults.length;
  const alertCount     = pendingBatches.filter(b => b.status === 'recalled').length;

  const setField = (key: keyof LabFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const alreadyPublished = (batchId: string) => publishedResults.some(r => r.batchId === batchId);

  const handlePublish = async () => {
    const errors = validateLabForm(form);
    if (!selectedBatchId) errors.batchId = 'Select a batch to analyse';
    if (!currentUser.userId) errors.batchId = 'Session not ready. Please wait a moment and retry.';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsPublishing(true);
    setPublishError(null);
    setServerViolations([]);

    try {
      await labApi.publish({
        batchId:        selectedBatchId,
        sampleId:       `LAB-${Date.now()}`,
        labId:          currentUser.userId,
        fssaiLicense:   form.fssaiLicense,
        nablCert:       form.nablCert,
        moisture:       parseFloat(form.moisture),
        hmf:            parseFloat(form.hmf),
        pollenCount:    parseFloat(form.pollen),
        acidity:        parseFloat(form.acidity),
        diastase:       parseFloat(form.diastase),
        sucrose:        parseFloat(form.sucrose),
        reducingSugars: parseFloat(form.reducingSugars),
        conductivity:   parseFloat(form.conductivity),
        nmrScore:       form.nmr       ? parseFloat(form.nmr)         : undefined,
        antibioticPpb:  form.antibiotic? parseFloat(form.antibiotic)  : undefined,
        heavyMetalsMgKg:form.heavyMetals?parseFloat(form.heavyMetals) : undefined,
        pesticideMgKg:  form.pesticide ? parseFloat(form.pesticide)   : undefined,
      });
      refreshBatches();
      refreshResults();
      setForm(EMPTY_FORM);
      setFormErrors({});
      setSelectedBatchId('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.violations?.length) {
          setServerViolations(err.violations);
        } else {
          setPublishError(err.message);
        }
      } else {
        setPublishError('Failed to publish. Please try again.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNewSample = () => {
    const firstPending = pendingBatches.find((b) => !alreadyPublished(b.batchId));
    setSelectedBatchId(firstPending?.batchId ?? '');
    setForm(EMPTY_FORM);
    setFormErrors({});
    setPublishError(null);
    setServerViolations([]);
    formRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const headerActions = (
    <Button kind="primary" renderIcon={Add} onClick={handleNewSample}>{tDashboard('new_sample')}</Button>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1">{tDashboard('lab_header')}</h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('lab_description')}</p>
      </div>
      <div className="shrink-0">{headerActions}</div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <IdentityVerificationModal isOpen={isKYCOpen} role="lab" onCompleteAction={completeKYC} />
      <GuidedTour steps={tourSteps} isOpen={isTourOpen} onClose={closeTour} onComplete={completeTour} />

      {/* Lab Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Chemistry size={120} />
          </div>
          <div className="flex items-center gap-spacing-md">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Chemistry size={24} /></div>
            <div>
              <p className="text-caption">{tDashboard('pending_samples')}</p>
              <h2 className="text-h1 text-gradient">{batchesLoading ? '—' : pendingCount}</h2>
            </div>
          </div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-success">
            <Certificate size={120} />
          </div>
          <div className="flex items-center gap-spacing-md">
            <div className="p-3 bg-success/10 rounded-xl text-success"><Certificate size={24} /></div>
            <div>
              <p className="text-caption">{tDashboard('certs_issued')}</p>
              <h2 className="text-h1 text-gradient">{resultsLoading ? '—' : certifiedCount}</h2>
            </div>
          </div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-[-12deg] transition-transform duration-700 text-error">
            <Information size={120} />
          </div>
          <div className="flex items-center gap-spacing-md">
            <div className="p-3 bg-error/10 rounded-xl text-error"><Information size={24} /></div>
            <div>
              <p className="text-caption">{tDashboard('alerts_rejections')}</p>
              <h2 className="text-h1 text-gradient">{batchesLoading ? '—' : alertCount}</h2>
            </div>
          </div>
        </Tile>
      </div>

      {/* Lab Workflow */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-spacing-lg">
        <div className="flex flex-col gap-spacing-lg">
          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium" ref={formRootRef}>
            <h3 className="text-h3 flex items-center gap-4 mb-spacing-lg">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><DataAnalytics size={24} /></div>
              {tDashboard('analysis_hub')}
            </h3>

            {/* Batch selector */}
            <div className="mb-spacing-lg">
              <Select
                id="batch-select"
                labelText="Batch under analysis"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                invalid={!!formErrors.batchId}
                invalidText={formErrors.batchId}
              >
                <SelectItem value="" text="Select a batch…" />
                {pendingBatches.filter(b => !alreadyPublished(b.batchId)).map(b => (
                  <SelectItem key={b.id} value={b.batchId} text={`${b.batchId} — ${b.floraType} (${b.farmerName})`} />
                ))}
              </Select>
            </div>

            {/* FSSAI & Accreditation */}
            <div className="mb-spacing-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-spacing-md">{tDashboard('section_fssai')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-spacing-md">
                <TextInput id="fssai" labelText={tDashboard('fssai_license')} placeholder={tDashboard('fssai_placeholder')}
                  value={form.fssaiLicense} onChange={setField('fssaiLicense')}
                  invalid={!!formErrors.fssaiLicense} invalidText={formErrors.fssaiLicense} />
                <TextInput id="nabl-cert" labelText={tDashboard('nabl_certificate')} placeholder={tDashboard('nabl_cert_placeholder')}
                  value={form.nablCert} onChange={setField('nablCert')}
                  invalid={!!formErrors.nablCert} invalidText={formErrors.nablCert} />
              </div>
            </div>

            {/* Core Codex Parameters */}
            <div className="mb-spacing-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-spacing-md">{tDashboard('section_core_params')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-spacing-md">
                <TextInput id="moisture" labelText={tDashboard('test_moisture')} placeholder={tDashboard('moisture_placeholder')} helperText={tDashboard('moisture_limit')}
                  value={form.moisture} onChange={setField('moisture')} invalid={!!formErrors.moisture} invalidText={formErrors.moisture} />
                <TextInput id="hmf" labelText={tDashboard('test_hmf')} placeholder={tDashboard('hmf_placeholder')} helperText={tDashboard('hmf_limit')}
                  value={form.hmf} onChange={setField('hmf')} invalid={!!formErrors.hmf} invalidText={formErrors.hmf} />
                <TextInput id="pollen" labelText={tDashboard('test_pollen')} placeholder={tDashboard('pollen_placeholder')}
                  value={form.pollen} onChange={setField('pollen')} invalid={!!formErrors.pollen} invalidText={formErrors.pollen} />
                <TextInput id="acidity" labelText={tDashboard('test_acidity')} placeholder={tDashboard('acidity_placeholder')}
                  value={form.acidity} onChange={setField('acidity')} invalid={!!formErrors.acidity} invalidText={formErrors.acidity} />
                <TextInput id="diastase" labelText={tDashboard('test_diastase')} placeholder={tDashboard('diastase_placeholder')} helperText={tDashboard('diastase_limit')}
                  value={form.diastase} onChange={setField('diastase')} invalid={!!formErrors.diastase} invalidText={formErrors.diastase} />
                <TextInput id="sucrose" labelText={tDashboard('test_sucrose')} placeholder={tDashboard('sucrose_placeholder')} helperText={tDashboard('sucrose_limit')}
                  value={form.sucrose} onChange={setField('sucrose')} invalid={!!formErrors.sucrose} invalidText={formErrors.sucrose} />
                <TextInput id="reducing-sugars" labelText={tDashboard('test_reducing_sugars')} placeholder={tDashboard('reducing_sugars_placeholder')} helperText={tDashboard('reducing_sugars_limit')}
                  value={form.reducingSugars} onChange={setField('reducingSugars')} invalid={!!formErrors.reducingSugars} invalidText={formErrors.reducingSugars} />
                <TextInput id="conductivity" labelText={tDashboard('test_conductivity')} placeholder={tDashboard('conductivity_placeholder')} helperText={tDashboard('conductivity_limit')}
                  value={form.conductivity} onChange={setField('conductivity')} invalid={!!formErrors.conductivity} invalidText={formErrors.conductivity} />
              </div>
            </div>

            {/* Advanced & Regulatory */}
            <div className="mb-spacing-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-spacing-md">{tDashboard('section_advanced_params')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-spacing-md">
                <TextInput id="nmr" labelText={tDashboard('test_nmr')} placeholder={tDashboard('nmr_placeholder')} helperText={tDashboard('nmr_limit')}
                  value={form.nmr} onChange={setField('nmr')} />
                <TextInput id="antibiotic" labelText={tDashboard('test_antibiotic')} placeholder={tDashboard('antibiotic_placeholder')} helperText={tDashboard('antibiotic_limit')}
                  value={form.antibiotic} onChange={setField('antibiotic')} />
                <TextInput id="heavy-metals" labelText={tDashboard('test_heavy_metals')} placeholder={tDashboard('heavy_metals_placeholder')} helperText={tDashboard('heavy_metals_limit')}
                  value={form.heavyMetals} onChange={setField('heavyMetals')} />
                <TextInput id="pesticide" labelText={tDashboard('test_pesticide')} placeholder={tDashboard('pesticide_placeholder')} helperText={tDashboard('pesticide_limit')}
                  value={form.pesticide} onChange={setField('pesticide')} />
              </div>
            </div>

            {Object.keys(formErrors).length > 0 && (
              <InlineNotification kind="error" title="Validation errors" subtitle="Please correct the highlighted fields before publishing." className="mb-spacing-md" />
            )}
            {publishError && (
              <InlineNotification kind="error" title="Publish failed." subtitle={publishError} onCloseButtonClick={() => setPublishError(null)} className="mb-spacing-md" />
            )}
            {serverViolations.length > 0 && (
              <InlineNotification
                kind="error"
                title="Codex Stan 12-1981 violations detected"
                subtitle={serverViolations.join(' · ')}
                onCloseButtonClick={() => setServerViolations([])}
                className="mb-spacing-md"
              />
            )}

            <div className="p-spacing-md bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-[11px] text-amber-700 font-medium mb-spacing-md">
              <Warning size={16} className="shrink-0 mt-0.5 text-amber-600" />
              {tDashboard('publish_warning')}
            </div>

            <Button size="lg" kind="primary" className="w-full !max-w-none shadow-md h-14 !rounded-xl" renderIcon={DataAnalytics}
              onClick={handlePublish} disabled={isPublishing || (!!selectedBatchId && alreadyPublished(selectedBatchId))}>
              <span className="font-bold">
                {isPublishing ? 'Publishing...' : (selectedBatchId && alreadyPublished(selectedBatchId)) ? '✓ Published to Ledger' : tDashboard('publish_ledger')}
              </span>
            </Button>

            <div className="overflow-x-auto rounded-xl border border-slate-100 mt-spacing-lg">
              {batchesLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={3} className="p-spacing-lg" />
              ) : (
                <DataTable rows={queueRows} headers={queueHeaders}>
                  {({ rows: tableRows, headers: tableHeaders, getTableProps }) => (
                    <TableContainer title={<span className="text-h3">{tDashboard('sampleQueue')}</span>} description={tDashboard('tech_verification')} className="!border-none !p-spacing-lg !bg-white">
                      <Table {...getTableProps()}>
                        <TableHead>
                          <TableRow className="!border-b-2 !border-slate-50">
                            {tableHeaders.map((header) => (
                              <TableHeader key={header.key} className="!bg-transparent !text-caption !text-[10px]">{header.header}</TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tableRows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={tableHeaders.length}>
                                <EmptyState title="No samples in queue" description="All batches have been certified or no batches exist yet." />
                              </TableCell>
                            </TableRow>
                          )}
                          {tableRows.map((row) => (
                            <TableRow key={row.id} className="hover:!bg-slate-50 transition-colors border-none group">
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id} className="!border-none !p-4">
                                  {cell.info.header === 'status' ? (
                                    <Tag
                                      type={cell.value === 'certified' ? 'green' : cell.value === 'recalled' ? 'red' : 'blue'}
                                      className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none"
                                    >
                                      {cell.value}
                                    </Tag>
                                  ) : (
                                    <span className={cell.id.includes('id') ? 'mono-data font-bold text-primary' : 'text-slate-600 font-medium'}>
                                      {cell.value}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DataTable>
              )}
            </div>
          </Tile>
        </div>

        <div className="flex flex-col gap-spacing-lg">
          <PriorStepQR stepName="Warehouse Manager" batchId={selectedBatchId || '--'} details="Custody transfer verified" />
          <BlockchainMapStamp locationName="NABL Regional Lab #04" latitude="24.5765° N" longitude="80.2210° E" utcTime={new Date().toISOString().substring(11,19)} />
          <Tile className="glass-panel bg-slate-950 text-white p-spacing-xl rounded-3xl shadow-2xl relative overflow-hidden group elevation-premium border-none">
            <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover:rotate-12 transition-transform duration-[2000ms] text-primary">
              <Certificate size={240} />
            </div>
            <h3 className="text-caption text-primary/80 mb-spacing-lg italic tracking-[0.2em]">
              {tDashboard('certificate_preview')}
            </h3>
            <div className="border border-white/5 p-spacing-xl rounded-2xl relative z-10 bg-white/5 backdrop-blur-xl ring-1 ring-white/10">
              <div className="flex justify-between items-start mb-spacing-xl">
                <div>
                  <h4 className="text-h2 !text-white !tracking-normal">{tDashboard('certOfPurity')}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-primary font-mono tracking-[0.1em] break-all">
                      {tDashboard('hash')}: {(() => { const b = pendingBatches.find(x => x.batchId === selectedBatchId || x.id === selectedBatchId); return b?.onChainTxHash || b?.onChainDataHash || '--'; })()}
                    </p>
                    <CopyableValue
                      value={(() => { const b = pendingBatches.find(x => x.batchId === selectedBatchId || x.id === selectedBatchId); return b?.onChainTxHash || b?.onChainDataHash || '--'; })()}
                      label="Copy Hash"
                      className="text-primary min-h-0 h-6 px-2"
                    />
                  </div>
                </div>
                <Tag type="green" className="!bg-success !text-white !rounded-md font-bold border-none px-4 py-2 ring-4 ring-success/20">{tDashboard('nablCompliant')}</Tag>
              </div>
              <div className="grid grid-cols-2 gap-spacing-md mb-spacing-lg">
                <div className="border-l-2 border-primary/40 pl-spacing-md">
                  <p className="text-primary/60 uppercase tracking-widest text-[11px] mb-1">{tDashboard('moisture')}</p>
                  <p className="font-bold text-2xl text-white tracking-tighter">{form.moisture || '--'}%</p>
                </div>
                <div className="border-l-2 border-primary/40 pl-spacing-md">
                  <p className="text-primary/60 uppercase tracking-widest text-[11px] mb-1">{tDashboard('hmf')}</p>
                  <p className="font-bold text-2xl text-white tracking-tighter">{form.hmf || '--'} mg/kg</p>
                </div>
                <div className="border-l-2 border-primary/40 pl-spacing-md">
                  <p className="text-primary/60 uppercase tracking-widest text-[11px] mb-1">{tDashboard('test_diastase')}</p>
                  <p className="font-bold text-2xl text-white tracking-tighter">{form.diastase || '—'} DN</p>
                </div>
                <div className="border-l-2 border-primary/40 pl-spacing-md">
                  <p className="text-primary/60 uppercase tracking-widest text-[11px] mb-1">{tDashboard('test_nmr')}</p>
                  <p className="font-bold text-2xl text-white tracking-tighter">{form.nmr || '—'}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-spacing-md bg-white/5 rounded-xl italic text-[10px] text-primary/80 ring-1 ring-white/5">
                <Information size={18} />
                {tDashboard('cryptSigned')}
              </div>
            </div>
            <Button size="lg" kind="ghost" className="mt-spacing-xl text-primary border border-primary/30 w-full hover:bg-primary/10 h-14 !rounded-xl">
              <span className="font-bold">{tDashboard('viewTraceMap')}</span>
            </Button>
          </Tile>
        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}

