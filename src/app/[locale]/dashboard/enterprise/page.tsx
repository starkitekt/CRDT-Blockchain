'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  Search,
  Stack,
  Modal,
  DataTableSkeleton,
  InlineNotification,
} from '@carbon/react';
import { ShoppingCart, Enterprise, View } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import PriorStepQR from '@/components/Traceability/PriorStepQR';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import BlockchainMapStamp from '@/components/Traceability/BlockchainMapStamp';
import { useBatches } from '@/hooks/useBatches';
import { batchesApi, ApiError } from '@/lib/api';

export default function EnterpriseDashboard() {
  const tOnboarding = useTranslations('Onboarding.enterprise');
  const tDashboard = useTranslations('Dashboard.enterprise');
  const { isTourOpen, isKYCOpen, completeKYC, completeTour, closeTour } = useOnboarding({ role: 'enterprise', hasKYC: true });
  const [isSignConfirmOpen, setIsSignConfirmOpen] = React.useState(false);
  const [signedBatches, setSignedBatches] = React.useState<string[]>([]);
  const [actionBatch, setActionBatch] = React.useState<string>('B-22');
  const [signError, setSignError] = React.useState<string | null>(null);
  const [signLoading, setSignLoading] = React.useState(false);

  const { batches, loading, error } = useBatches({ status: 'certified' });

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];

  // Map certified batches to table row structure
  const rows = batches.map((b) => ({
    id: b.id,
    origin: b.farmerName,
    honey: b.floraType,
    weight: `${b.weightKg.toLocaleString()} kg`,
    grade: b.grade === 'A' ? 'Grade A' : 'Grade B',
    price: '—',
  }));

  // Derive Active Contracts KPI: certified batches not yet signed
  const activeContracts = batches.filter((b) => !signedBatches.includes(b.id)).length;

  const headers = [
    { key: 'origin', header: tDashboard('table_origin') },
    { key: 'honey', header: tDashboard('table_variety') },
    { key: 'weight', header: tDashboard('table_volume') },
    { key: 'grade', header: tDashboard('table_quality') },
    { key: 'price', header: tDashboard('table_quote') },
  ];

  const handleSignSubmit = async () => {
    setSignLoading(true);
    setSignError(null);
    try {
      await batchesApi.patch(actionBatch, { status: 'dispatched' });
      setSignedBatches((p) => [...p, actionBatch]);
      setIsSignConfirmOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSignError(err.message);
      } else {
        setSignError('Failed to sign agreement');
      }
    } finally {
      setSignLoading(false);
    }
  };

  const headerActions = (
    <Button kind="secondary" renderIcon={ShoppingCart} size="md">{tDashboard('view_orders')}</Button>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
            <Enterprise size={32} />
          </div>
          {tDashboard('header_title')}
        </h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('header_desc')}</p>
      </div>
      <div className="shrink-0">
        {headerActions}
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <Modal
        open={isSignConfirmOpen}
        modalHeading={tDashboard('sign_agreement')}
        primaryButtonText={signLoading ? 'Signing…' : tDashboard('sign_agreement')}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={signLoading}
        onRequestClose={() => { setIsSignConfirmOpen(false); setSignError(null); }}
        onRequestSubmit={handleSignSubmit}
      >
        <p className="text-body mb-spacing-md">
          You are about to digitally sign a procurement agreement for <strong>BATCH {actionBatch} — Dindori Forest (Premium)</strong> at ₹225/kg. This action is immutable on the blockchain and legally binding.
        </p>
        <div className="p-spacing-md bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600">
          IMMUTABLE_SIGNATURE_PAYLOAD: 0x22F...B921 · ENTITY: ENT-880 · {new Date().toISOString()}
        </div>
        {signError && (
          <div className="mt-spacing-md">
            <InlineNotification kind="error" title="Error" subtitle={signError} lowContrast hideCloseButton />
          </div>
        )}
      </Modal>
      <IdentityVerificationModal
        isOpen={isKYCOpen}
        role="enterprise"
        onCompleteAction={completeKYC}
      />
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('active_contracts')}</p>
          <h2 className="text-h1 text-gradient">{loading ? '…' : activeContracts}</h2>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span className="text-[10px] font-bold text-success uppercase">{tDashboard('all_compliant')}</span>
          </div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('sourced_quarter')}</p>
          <h2 className="text-h1 text-gradient">45.2 Tons</h2>
          <div className="mt-4 text-[10px] font-bold text-primary uppercase">{tDashboard('quarter_growth')}</div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{tDashboard('supplier_diversity')}</p>
          <h2 className="text-h1 text-gradient">182 SHGs</h2>
          <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase">{tDashboard('national_network')}</div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-success relative overflow-hidden group">
          <p className="text-caption mb-spacing-md tracking-widest uppercase !text-success/70">{tDashboard('compliance_score')}</p>
          <h2 className="text-h1 !text-success">99.2%</h2>
          <div className="mt-4 flex items-center gap-1">
             {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 bg-success rounded-full" />)}
          </div>
        </Tile>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-md">
        <div className="lg:col-span-2 flex flex-col gap-spacing-lg">
          {/* Comparison Cards */}
          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium">
             <h3 className="text-h3 flex items-center gap-4 mb-spacing-xl">
               <div className="p-2 bg-primary/10 rounded-lg text-primary">
                 <ShoppingCart size={24} />
               </div>
               {tDashboard('comparison_engine')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-lg mb-spacing-xl">
                <div className="p-spacing-lg rounded-2xl border-2 border-primary bg-primary/5 relative shadow-inner ring-4 ring-primary/5 group hover:scale-[1.02] transition-transform">
                   <Tag type="blue" className="absolute right-spacing-md top-spacing-md !rounded-md font-bold uppercase tracking-widest text-[10px] border-none shadow-md">{tDashboard('best_value')}</Tag>
                   <p className="text-[10px] font-bold text-primary mb-2 uppercase tracking-[0.2em]">BATCH B-22</p>
                   <p className="text-h2 mb-6 tracking-normal">Dindori Forest (Premium)</p>
                   <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center text-slate-500"><span>HMF Content:</span><span className="font-bold text-success text-sm">12 mg/kg</span></div>
                      <div className="flex justify-between items-center text-slate-500"><span>Pollen Count:</span><span className="font-bold text-slate-900 text-sm">45k/10g</span></div>
                      <div className="flex justify-between items-center border-t border-slate-200/50 pt-4 mt-4">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Landed Quote:</span>
                        <span className="font-bold text-2xl text-primary tracking-tighter">₹225/kg</span>
                      </div>
                   </div>
                </div>
                <div className="p-spacing-lg rounded-2xl border border-slate-100 bg-white relative opacity-90 hover:opacity-100 transition-all hover:shadow-xl hover:scale-[1.02] group">
                   <Tag type="teal" className="absolute right-spacing-md top-spacing-md !rounded-md font-bold uppercase tracking-widest text-[10px] border-none shadow-md">{tDashboard('high_purity')}</Tag>
                   <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-[0.2em]">BATCH B-25</p>
                   <p className="text-h2 mb-6 tracking-normal">Siwan Collective (Grade A)</p>
                   <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center text-slate-500"><span>HMF Content:</span><span className="font-bold text-slate-900 text-sm">18 mg/kg</span></div>
                      <div className="flex justify-between items-center text-slate-500"><span>Pollen Count:</span><span className="font-bold text-primary text-sm">55k/10g</span></div>
                      <div className="flex justify-between items-center border-t border-slate-200/50 pt-4 mt-4">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Landed Quote:</span>
                        <span className="font-bold text-2xl text-slate-900 tracking-tighter">₹210/kg</span>
                      </div>
                   </div>
                </div>
             </div>
             <Button size="lg" kind="ghost" className="w-full h-14 !rounded-xl border border-slate-100 hover:bg-slate-50 shadow-sm" renderIcon={View}>
                <span className="font-bold">{tDashboard('compare_batches')}</span>
             </Button>
          </Tile>

          {/* Table Container */}
          <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
            {error && (
              <div className="p-spacing-md">
                <InlineNotification kind="error" title="Failed to load batches" subtitle={error} lowContrast hideCloseButton />
              </div>
            )}
            {loading ? (
              <DataTableSkeleton columnCount={headers.length + 1} rowCount={4} />
            ) : (
            <TableContainer title={<span className="text-h3">{tDashboard('procurement_portal')}</span>} description={tDashboard('source_queue_desc')} className="!border-none !p-spacing-lg !bg-white">
              <div className="px-spacing-md mb-spacing-xl">
                <Search size="lg" labelText={tDashboard('search_label')} placeholder={tDashboard('search_placeholder')} className="!bg-slate-50 !rounded-xl !border-none ring-1 ring-slate-100" />
              </div>
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-50">
                    {headers.map((header) => (
                      <TableHeader key={header.key} className="!bg-transparent !text-caption !text-[10px] !p-4">{header.header}</TableHeader>
                    ))}
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">{tDashboard('table_actions')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="!p-4 !border-none group-hover:pl-6 transition-all font-bold text-slate-900">{row.origin}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">{row.honey}</TableCell>
                      <TableCell className="!p-4 !border-none mono-data font-bold text-primary">{row.weight}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">
                        <Tag
                          type={row.grade === 'Grade A' ? 'teal' : 'magenta'}
                          className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none"
                        >
                          {row.grade}
                        </Tag>
                      </TableCell>
                      <TableCell className="!p-4 !border-none font-bold text-slate-900 font-mono text-sm">{row.price}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">
                        <Button size="sm" kind="ghost" renderIcon={View} className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100 font-bold">{tDashboard('view_stories')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-spacing-lg">
          <PriorStepQR
            stepName="Govt Quality Check Officer"
            batchId="CERT-UP-4401"
            details="NABL Grade A Verified. Compliant with export standards."
          />
          <BlockchainMapStamp
            locationName="Regional Sourcing Hub"
            latitude="28.6139° N"
            longitude="77.2090° E"
            utcTime="09:15:30"
          />
          <Tile className="glass-panel bg-slate-950 text-white p-spacing-xl rounded-3xl shadow-2xl relative overflow-hidden group elevation-premium border-none">
             <div className="absolute left-[-40px] bottom-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-[2000ms] text-primary">
                <ShoppingCart size={240} />
             </div>
             <h3 className="text-caption text-primary/80 mb-spacing-lg italic tracking-[0.2em]">
               {tDashboard('contract_signing')}
             </h3>
             <div className="bg-white/5 backdrop-blur-xl p-spacing-xl border border-white/10 rounded-2xl relative z-10 ring-1 ring-white/10">
                <p className="text-[10px] font-bold text-primary/80 mb-2 uppercase tracking-[0.2em]">Agreement Node: #E-880</p>
                <p className="text-h2 !text-white mb-6">Master Sourcing Agreement</p>
                <div className="space-y-6 text-xs text-slate-400 border-t border-white/5 pt-6 mb-8">
                   <p className="leading-relaxed">I, as authorized representative, hereby initiate the immutable procurement of <span className="text-white font-bold tracking-tight">BATCH B-22</span> at the verified landing price of ₹225/kg.</p>
                   <div className="p-4 bg-black/40 rounded-xl font-mono text-[10px] text-primary/60 ring-1 ring-white/5 shadow-inner">
                      IMMUTABLE_SIGNATURE_PAYLOAD: 0x22F...B921
                   </div>
                </div>
                <Stack gap={4}>
                   <Button size="lg" kind="primary" className="w-full !max-w-none h-14 !rounded-xl shadow-2xl" renderIcon={ShoppingCart} onClick={() => { setActionBatch('B-22'); setIsSignConfirmOpen(true); }} disabled={signedBatches.includes('B-22')}>
                      <span className="font-bold group-hover:mr-2 transition-all">{signedBatches.includes('B-22') ? '✓ Signed' : tDashboard('sign_agreement')}</span>
                   </Button>
                   <Button size="lg" kind="ghost" className="w-full h-14 !rounded-xl text-primary hover:bg-white/5 border border-primary/30">
                      <span className="font-bold">{tDashboard('direct_sourcing')}</span>
                   </Button>
                </Stack>
             </div>
             <div className="flex items-center gap-3 text-xs text-success font-bold px-2 mt-spacing-xl justify-center uppercase tracking-widest">
                <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse ring-4 ring-success/20" />
                {tDashboard('procurement_ready')}
             </div>
          </Tile>
        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}
