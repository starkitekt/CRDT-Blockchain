'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile,
  Button,
  Tag,
  Stack,
  ProgressBar,
} from '@carbon/react';
import { DataAnalytics, Policy, Money, Report, Map as MapIcon, ChevronRight } from '@carbon/icons-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import ProductionHeatMap from '@/components/Map/ProductionHeatMap';
import type { ProductionCluster } from '@/types';

export default function SecretaryDashboard() {
  const tOnboarding = useTranslations('Onboarding.secretary');
  const tDashboard = useTranslations('Dashboard.secretary');
  const { isTourOpen, completeTour, closeTour } = useOnboarding({ role: 'secretary' });

  const tourSteps = [
    { label: tOnboarding('step1_title'), title: tOnboarding('step1_title'), description: tOnboarding('step1_desc') },
    { label: tOnboarding('step2_title'), title: tOnboarding('step2_title'), description: tOnboarding('step2_desc') },
    { label: tOnboarding('step3_title'), title: tOnboarding('step3_title'), description: tOnboarding('step3_desc') },
  ];
  const productionClusters: ProductionCluster[] = [
    { id: 'siwan',    name: 'Siwan Cluster, Bihar',        lat: 26.22, lng: 84.36, farmerCount: 142, productionKg: 18400, growthPercent: 14.2, floraType: 'Mustard/Lychee' },
    { id: 'dindori',  name: 'Dindori Hub, Madhya Pradesh', lat: 22.94, lng: 81.08, farmerCount: 88,  productionKg: 11200, growthPercent: 9.7,  floraType: 'Forest/Mahua' },
    { id: 'sunderban',name: 'Sundarban Belt, WB',          lat: 21.95, lng: 88.92, farmerCount: 210, productionKg: 27600, growthPercent: 18.5, floraType: 'Mangrove' },
    { id: 'karnataka',name: 'Nilgiri Zone, Karnataka',     lat: 11.41, lng: 76.69, farmerCount: 64,  productionKg: 8900,  growthPercent: 6.1,  floraType: 'Coffee/Eucalyptus' },
    { id: 'rajasthan',name: 'Ajmer Belt, Rajasthan',       lat: 26.45, lng: 74.63, farmerCount: 97,  productionKg: 13100, growthPercent: -2.3, floraType: 'Mustard/Acacia' },
    { id: 'himachal', name: 'Kullu Valley, Himachal',      lat: 31.96, lng: 77.10, farmerCount: 53,  productionKg: 7200,  growthPercent: 22.4, floraType: 'Apple Blossom' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  const stats = [
    { label: tDashboard('total_state_production'), value: `450.2 ${tDashboard('tons')}`, trend: '+12%', color: 'blue' },
    { label: tDashboard('farmers_benefited'), value: '1,24,500', trend: '+8,200', color: 'green' },
    { label: tDashboard('active_msp'), value: `₹348/${tDashboard('kg')}`, trend: 'Regulated', color: 'orange' },
    { label: tDashboard('export_revenue'), value: `₹24.8 ${tDashboard('crore')}`, trend: '+22%', color: 'purple' },
  ];

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
            <Policy size={32} />
          </div>
          {tDashboard('strategic_overview')}
        </h1>
        <p className="text-body mt-spacing-xs max-w-lg">{tDashboard('ops_description')}</p>
      </div>
      <div className="flex gap-spacing-sm shrink-0">
        <Button kind="secondary" renderIcon={Report} size="lg" className="!rounded-xl shadow-lg border-slate-100">{tDashboard('export_mis')}</Button>
        <Button kind="primary" renderIcon={Money} size="lg" className="!rounded-xl shadow-xl">{tDashboard('update_msp')}</Button>
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>

        {/* Macro Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-spacing-lg">
          {stats.map((stat, i) => (
            <Tile key={i} className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium relative overflow-hidden group">
              <div className={`absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700 text-${stat.color}-600`}>
                {i === 0 && <DataAnalytics size={100} />}
                {i === 1 && <Policy size={100} />}
                {i === 2 && <Money size={100} />}
                {i === 3 && <Report size={100} />}
              </div>
                <span className="text-caption mb-spacing-md tracking-widest uppercase !text-slate-400">{stat.label}</span>
                <span className="text-h2 text-gradient block">{stat.value}</span>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${colorClasses[stat.color]}`}>{stat.trend}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{tDashboard('vs_last_month')}</span>
                </div>
            </Tile>
          ))}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-lg">
          <Tile className="lg:col-span-2 min-h-[500px] flex flex-col glass-panel rounded-2xl shadow-xl elevation-premium p-0 overflow-hidden group border border-slate-100">
            <div className="p-spacing-lg border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
               <h3 className="text-h3 flex items-center gap-4">
                 <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MapIcon size={24} />
                 </div>
                 {tDashboard('gis_insights')}
               </h3>
               <Button size="lg" kind="ghost" renderIcon={DataAnalytics} className="!rounded-xl hover:!bg-white shadow-sm ring-1 ring-slate-100 font-bold">{tDashboard('view_gis_map')}</Button>
            </div>
            <div className="flex-1 relative overflow-hidden" style={{ minHeight: 400 }}>
              <ProductionHeatMap clusters={productionClusters} center={[24.5, 81.0]} zoom={5} />
              {/* Map legend */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 shadow-lg px-3 py-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#24a148]" />High growth</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#f5a623]" />Stable</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-[#da1e28]" />Declining</span>
              </div>
            </div>
          </Tile>
          
          <div className="flex flex-col gap-spacing-lg">
            <Tile className="glass-panel bg-slate-950 text-white p-spacing-xl rounded-3xl shadow-2xl relative overflow-hidden group elevation-premium border-none">
               <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-[2000ms] text-primary">
                  <Money size={240} />
               </div>
               <h3 className="text-caption text-primary/80 mb-spacing-lg italic tracking-[0.2em]">
                 {tDashboard('subsidy_tracker')}
               </h3>
               <div className="bg-white/5 backdrop-blur-xl p-spacing-xl border border-white/10 rounded-2xl relative z-10 ring-1 ring-white/10">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <p className="text-[10px] font-bold text-primary/80 mb-2 uppercase tracking-[0.2em]">{tDashboard('subsidy_batch')}</p>
                        <p className="text-h2 !text-white leading-none">CYCLE-2024-Q1</p>
                     </div>
                     <Tag type="green" className="!rounded-md font-bold uppercase tracking-widest text-[10px] px-3 border-none bg-success/20 text-success shadow-lg">{tDashboard('audit_pass')}</Tag>
                  </div>
                  <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-xs items-center">
                         <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">{tDashboard('pending_subsidies')}</span>
                         <span className="font-bold text-lg text-primary tracking-tighter">₹4.2 {tDashboard('crore')}</span>
                      </div>
                      <ProgressBar label={tDashboard('pending_subsidies')} hideLabel value={82} status="finished" size="small" className="!mb-0" />
                      <p className="text-[11px] text-slate-500 text-right font-bold uppercase tracking-widest">{tDashboard('disbursement_verified', { percent: 82 })}</p>
                  </div>
                   <div className="p-4 bg-black/40 rounded-xl font-mono text-[11px] text-primary/60 ring-1 ring-white/5 shadow-inner mb-8">
                      {tDashboard('block_payload')}
                   </div>
                  <Button size="lg" kind="primary" className="w-full !max-w-none h-14 !rounded-xl shadow-2xl" renderIcon={Money}>
                     <span className="font-bold group-hover:mr-2 transition-all">{tDashboard('disburse_funds')}</span>
                  </Button>
               </div>
                <div className="flex items-center gap-3 text-xs text-success font-bold px-2 mt-spacing-xl justify-center uppercase tracking-widest">
                   <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse ring-4 ring-success/20" />
                   {tDashboard('audit_verification_complete')}
                </div>
            </Tile>

            <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl elevation-premium border border-slate-100">
               <h3 className="text-caption mb-spacing-xl tracking-widest uppercase !text-slate-400">{tDashboard('district_performance')}</h3>
               <Stack gap={6}>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 group cursor-pointer hover:px-2 transition-all">
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{tDashboard('siwan_cluster')}</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-1">{tDashboard('cluster_growth')}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-success">+14.2%</span>
                        <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 group cursor-pointer hover:px-2 transition-all">
                     <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-900">{tDashboard('dindori_hub')}</span>
                         <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-1">{tDashboard('yield_efficiency')}</span>
                      </div>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{tDashboard('high')}</span>
                        <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                  </div>
                   <Button size="lg" kind="ghost" className="w-full h-14 !rounded-xl border border-slate-100 hover:bg-slate-50 shadow-sm" renderIcon={DataAnalytics}>
                      <span className="font-bold">{tDashboard('regional_report')}</span>
                   </Button>
               </Stack>
            </Tile>
          </div>
        </div>
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </UnifiedDashboardLayout>
  );
}
