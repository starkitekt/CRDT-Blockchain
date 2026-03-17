'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  Tile,
  Button,
  TextInput,
  Stack,
  ProgressBar,
  Tag,
  InlineNotification,
} from '@carbon/react';
import { QrCode, CheckmarkFilled, Delivery, Location, View, Search, Flash, Tree, IbmCloudSecurityComplianceCenter as Security } from '@carbon/icons-react';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import BlockchainCertificate from '@/components/Traceability/BlockchainCertificate';
import CTETimeline, { CTEEvent } from '@/components/Traceability/CTETimeline';
import Image from 'next/image';
import { batchesApi, labApi, ApiError } from '@/lib/api';

export default function ConsumerPortal() {
  const tOnboarding = useTranslations('Onboarding.consumer');
  const tDashboard = useTranslations('Dashboard.consumer');
  const tc = useTranslations('common');
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [labWarning, setLabWarning] = useState<string | null>(null);
  const { isTourOpen, completeTour, closeTour } = useOnboarding({ role: 'consumer' });

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setLabWarning(null);
    setShowResult(false);

    try {
      // Fetch batch — throws ApiError with status 404 if not found
      await batchesApi.get(searchId);

      // Fetch lab result — 404 means not yet published, handle gracefully
      try {
        await labApi.getByBatch(searchId);
      } catch (labErr) {
        if (labErr instanceof ApiError && labErr.status === 404) {
          setLabWarning('Lab results are not yet available for this batch.');
        } else {
          // Non-404 lab errors are non-fatal; surface as warning
          setLabWarning('Lab results could not be loaded at this time.');
        }
      }

      setShowResult(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSearchError(`Batch "${searchId}" was not found. Please check the ID and try again.`);
      } else if (err instanceof ApiError) {
        setSearchError(err.message);
      } else {
        setSearchError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const cteEvents: CTEEvent[] = [
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:harvesting',
      label: 'Harvesting',
      location: 'Siwan Mustard Fields, Bihar (GLN: 8901234567890)',
      eventTime: '2024-03-10T06:30:00Z',
      status: 'completed',
      disposition: 'active',
      actor: 'Ramesh Kumar (Farmer ID: NBHM-2024-881)',
    },
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:storing',
      label: 'Cold Storage Receipt',
      location: 'Siwan Regional Godown #4 (GLN: 8901234567891)',
      eventTime: '2024-03-10T14:15:00Z',
      status: 'completed',
      disposition: 'in_transit',
      actor: 'Warehouse Node #WH-442',
    },
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:sampling',
      label: 'Lab Sampling',
      location: 'NABL Regional Lab #04, Jabalpur (GLN: 8901234567892)',
      eventTime: '2024-03-11T09:00:00Z',
      status: 'completed',
      disposition: 'in_progress',
      actor: 'Lab Node #L-401',
    },
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:inspecting',
      label: 'Government Quality Certification',
      location: 'State Audit Secretariat, Bhopal (GLN: 8901234567893)',
      eventTime: '2024-03-12T11:30:00Z',
      status: 'completed',
      disposition: 'conformant',
      actor: 'GOVT-OFC-04',
    },
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:shipping',
      label: 'Enterprise Dispatch',
      location: 'Regional Distribution Hub, Delhi (GLN: 8901234567894)',
      eventTime: '2024-03-13T08:00:00Z',
      status: 'completed',
      disposition: 'in_transit',
      actor: 'GreenChain Logistics',
    },
    {
      bizStep: 'urn:epcglobal:cbv:bizstep:retail_selling',
      label: 'Consumer Sale',
      location: 'End Consumer',
      status: 'active',
      disposition: 'active',
    },
  ];

  const pageHeader = (
    <div className="text-center max-w-2xl mx-auto py-spacing-xl animate-fade-in">
      <div className="w-20 h-20 glass-panel rounded-3xl flex items-center justify-center mx-auto mb-spacing-lg text-primary shadow-2xl elevation-premium ring-1 ring-white/50">
        <Security size={40} />
      </div>
      <h1 className="text-h1 mb-spacing-xs">HoneyTrace</h1>
      <p className="text-body max-w-lg mx-auto">{tDashboard('portal_subtitle')}</p>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      <BlockchainCertificate
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        batchId={searchId}
        stakeholders={['Farmer: Ramesh Kumar', 'Warehouse: Siwan Regional', 'Lab: Bihar State Quality', 'Logistics: GreenChain']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-md items-start">
        {/* Left Column: Purity & Journey */}
        <div className="lg:col-span-2 space-y-spacing-lg">
          {/* Main Purity Card */}
          <Tile className="p-spacing-xl glass-panel border-t-4 border-primary rounded-2xl shadow-2xl relative overflow-hidden group elevation-premium">
             <div className="absolute right-[-40px] top-[-40px] opacity-5 group-hover:rotate-12 transition-transform duration-700">
                <Security size={200} />
             </div>

             <div className="flex justify-between items-start mb-spacing-xl">
                <div>
                  <h2 className="text-h1 mb-1">98.2%</h2>
                  <p className="text-caption">{tDashboard('natural_purity')}</p>
                </div>
                <div className="text-right">
                   <Tag type="green" className="m-0 ring-4 ring-success/10 border-none px-4 py-2 font-bold uppercase tracking-widest text-[10px]">{tc('blockchain_verified')}</Tag>
                   <p className="text-[10px] mt-2 font-mono text-slate-400 uppercase tracking-widest leading-none">ID: {searchId}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-spacing-md mb-spacing-lg">
                <div className="p-spacing-sm bg-white rounded border border-slate-100 shadow-sm">
                   <p className="text-caption text-slate-400 uppercase tracking-tighter mb-1">{tDashboard('pollen_purity')}</p>
                   <p className="text-body font-bold text-slate-900">94.5%</p>
                </div>
                <div className="p-spacing-sm bg-white rounded border border-slate-100 shadow-sm">
                   <p className="text-caption text-slate-400 uppercase tracking-tighter mb-1">{tDashboard('moisture_label')}</p>
                   <p className="text-body font-bold text-slate-900">17.2%</p>
                </div>
                <div className="p-spacing-sm bg-white rounded border border-slate-100 shadow-sm">
                   <p className="text-caption text-slate-400 uppercase tracking-tighter mb-1">{tDashboard('diastase_label')}</p>
                   <p className="text-body font-bold text-slate-900">Active</p>
                </div>
                <div className="p-spacing-sm bg-white rounded border border-slate-100 shadow-sm">
                   <p className="text-caption text-slate-400 uppercase tracking-tighter mb-1">{tDashboard('hmf_label')}</p>
                   <p className="text-body font-bold text-slate-900">8.4 mg/kg</p>
                </div>
             </div>

             <Button
                kind="primary"
                onClick={() => setIsCertificateOpen(true)}
                renderIcon={Flash}
                className="w-full shadow-2xl h-14 !rounded-xl"
             >
                <span className="font-bold tracking-tight">{tDashboard('view_certificate')}</span>
             </Button>
          </Tile>

          {/* EPCIS 2.0 Chain of Custody Timeline */}
          <CTETimeline batchId={searchId} events={cteEvents} />

          {/* Interactive Journey Timeline */}
          <Tile className="p-spacing-xl glass-panel border-l-4 border-primary rounded-2xl shadow-xl elevation-premium">
             <div className="flex items-center gap-4 mb-spacing-xl">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Delivery size={28} />
                </div>
                <h3 className="text-h2">{tDashboard('know_origin')}</h3>
             </div>

             <div className="relative pl-spacing-xl space-y-spacing-xl border-l-[3px] border-slate-100 ml-4">
                {/* Harvest */}
                <div className="relative">
                   <div className="absolute left-[-47px] top-0 p-2.5 bg-amber-500 text-white rounded-2xl ring-8 ring-white shadow-2xl">
                      <Tree size={20} />
                   </div>
                   <div className="flex flex-col md:flex-row gap-spacing-lg">
                      <div className="flex-1">
                         <p className="text-caption text-amber-600 mb-2">{tDashboard('harvested_label')}</p>
                         <p className="text-h3 mb-1">Siwan Mustard Fields</p>
                         <p className="text-body italic text-slate-400">"Traditional heritage beekeeping."</p>
                      </div>
                      <PriorStepQR
                        stepName="Harvest Unit"
                        batchId="HNV-2024-001"
                        details="Mustard Flower | Raw Unprocessed"
                      />
                   </div>
                </div>

                {/* Processing */}
                <div className="relative">
                   <div className="absolute left-[-47px] top-0 p-2.5 bg-primary text-white rounded-2xl ring-8 ring-white shadow-2xl">
                      <Flash size={20} />
                   </div>
                   <div className="flex flex-col md:flex-row gap-spacing-lg">
                      <div className="flex-1">
                         <p className="text-caption text-primary mb-2">{tDashboard('verified_processed_label')}</p>
                         <p className="text-h3 mb-1">Siwan Central Hub</p>
                         <p className="text-body text-slate-400">Multistage cold filtration process.</p>
                      </div>
                      <BlockchainMapStamp
                        latitude="25.9067 N"
                        longitude="84.3600 E"
                        locationName="Siwan Hub"
                        utcTime="2024-03-12 08:30"
                      />
                   </div>
                </div>
             </div>
          </Tile>
        </div>

        {/* Right Column: Search, Story & Impact */}
        <div className="space-y-spacing-lg">
          {/* Purity Hub / Search */}
          <Tile className="p-spacing-xl glass-panel border-b-4 border-success rounded-2xl shadow-xl elevation-premium">
             <div className="flex items-center gap-3 mb-spacing-lg">
                <QrCode size={28} className="text-success" />
                <h4 className="text-caption text-success">{tDashboard('purity_hub')}</h4>
             </div>

             <div className="space-y-6">
                <div className="flex flex-col gap-4">
                   <TextInput
                      id="batch-search"
                      labelText=""
                      placeholder={tDashboard('search_placeholder')}
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      size="lg"
                      className="!bg-slate-50 !border-slate-100 focus:!border-primary transition-all !rounded-xl"
                   />
                   <div className="flex gap-3">
                      <Button
                        kind="primary"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="flex-1 h-14 !rounded-xl"
                        size="lg"
                      >
                        <span className="font-bold">{isSearching ? tDashboard('searching') : tDashboard('search_label')}</span>
                      </Button>
                      <Button
                        hasIconOnly
                        renderIcon={QrCode}
                        iconDescription={tc('scan_qr')}
                        kind="secondary"
                        size="lg"
                        className="h-14 !rounded-xl"
                      />
                   </div>
                   {searchError && (
                     <InlineNotification kind="error" title="Batch not found" subtitle={searchError} lowContrast hideCloseButton />
                   )}
                   {labWarning && !searchError && (
                     <InlineNotification kind="warning" title="Lab results pending" subtitle={labWarning} lowContrast hideCloseButton />
                   )}
                </div>
             </div>
          </Tile>

          {/* Farmer Story */}
          <Tile className="!p-0 overflow-hidden shadow-2xl group rounded-2xl border-none elevation-premium">
             <div className="relative h-64 overflow-hidden bg-slate-200">
                <Image
                  src="/honey_harvest_premium.png"
                  alt="Farmer Ramesh Kumar harvesting honey in Siwan, Bihar"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-spacing-lg">
                   <div>
                      <h3 className="text-white font-bold text-2xl mb-1">Ramesh Kumar</h3>
                      <p className="text-primary text-[10px] uppercase font-extrabold tracking-[0.2em]">Siwan, Bihar</p>
                   </div>
                </div>
             </div>
             <div className="p-spacing-lg bg-slate-950">
                <p className="text-body text-slate-400 italic mb-spacing-lg leading-relaxed">
                   "Harvested from the deep mustard fields of Siwan. This batch supported 12 local beekeeping families."
                </p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-primary uppercase tracking-widest">
                   <Location size={16} />
                   {tDashboard('verified_farm_origin')}
                </div>
             </div>
          </Tile>

          {/* Sustainability Impact */}
          <Tile className="p-spacing-xl glass-panel border-l-4 border-primary rounded-2xl shadow-xl elevation-premium">
             <div className="flex items-center gap-4 mb-spacing-lg">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Tree size={28} />
                </div>
                <h4 className="text-caption text-primary">{tDashboard('sustainability')}</h4>
             </div>
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between items-end mb-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tDashboard('carbon_offset')}</p>
                      <p className="text-h2 text-slate-900">2.4kg</p>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[65%] rounded-full shadow-[0_0_8px_rgba(15,98,254,0.4)]" />
                   </div>
                </div>
                <p className="text-[11px] text-slate-400 italic leading-relaxed">{tDashboard('impact_desc')}</p>
             </div>
          </Tile>
        </div>
      </div>

        <footer className="text-center text-caption py-spacing-xl" style={{ color: 'var(--text-secondary)' }}>
          {tDashboard('footer_powered')}
        </footer>
    </UnifiedDashboardLayout>
  );
}
