'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tile,
  Button,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  Tag,
  Modal,
  ToastNotification,
  Toggle,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  DataTableSkeleton,
} from '@carbon/react';
import { IbmCloudSecurityComplianceCenter as Audit, Download, Settings, Information } from '@carbon/icons-react';
import GuidedTour from '@/components/Onboarding/GuidedTour';
import IdentityVerificationModal from '@/components/Onboarding/IdentityVerificationModal';
import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import RecallManagementModal from '@/components/Traceability/RecallManagementModal';
import { WarningAltFilled } from '@carbon/icons-react';
import { useRecalls } from '@/hooks/useRecalls';
import type { RecallEvent } from '@/types';

export default function AdminDashboard() {
  const t = useTranslations('Dashboard.admin');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const { recalls, loading: recallsLoading, error: recallsError, refresh: refreshRecalls } = useRecalls();

  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('admin_tour_seen');
    const hasCompletedKYC = localStorage.getItem('admin_kyc_completed');

    if (!hasCompletedKYC) {
      setIsKYCOpen(true);
    } else if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, []);

  const tourSteps = [
    {
      label: 'Audit Overview',
      title: t('page_title'),
      description: t('page_subtitle'),
    },
    {
      label: 'Batch Inspection',
      title: 'Batch Inspection',
      description: 'Review harvested batches and their blockchain verification status.'
    },
    {
      label: 'Network Health',
      title: 'Network Health',
      description: 'Check connectivity of all nodes across the supply chain.'
    },
  ];

  const handleSettingsSave = () => {
    setIsSettingsOpen(false);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  const recallTierTag = (tier: RecallEvent['tier']) => {
    if (tier === 1) return <Tag type="red" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class I</Tag>;
    if (tier === 2) return <Tag type="warm-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class II</Tag>;
    return <Tag type="blue" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">Class III</Tag>;
  };

  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-spacing-sm w-full md:w-auto mt-spacing-md md:mt-0">
      <Button
        renderIcon={Audit}
        kind="secondary"
        onClick={() => setIsTourOpen(true)}
        className="w-full sm:w-auto flex justify-center"
      >
        {t('audit_tour')}
      </Button>
      <Button
        renderIcon={WarningAltFilled}
        kind="danger--ghost"
        onClick={() => setIsRecallOpen(true)}
        className="w-full sm:w-auto flex justify-center"
      >
        Initiate Recall
      </Button>
      <Button
        renderIcon={Download}
        className="w-full sm:w-auto flex justify-center"
      >
        {t('export_ledger')}
      </Button>
    </div>
  );

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-spacing-lg py-spacing-xl animate-fade-in">
      <div>
        <h1 className="text-h1">{t('page_title')}</h1>
        <p className="text-body mt-spacing-xs max-w-lg">{t('page_subtitle')}</p>
      </div>
      <div className="shrink-0">
        {headerActions}
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      <RecallManagementModal
        isOpen={isRecallOpen}
        onClose={() => setIsRecallOpen(false)}
        onRecallCreated={refreshRecalls}
      />
      <IdentityVerificationModal
        isOpen={isKYCOpen}
        role="admin"
        onCompleteAction={() => {
          setIsKYCOpen(false);
          localStorage.setItem('admin_kyc_completed', 'true');
          setIsTourOpen(true);
        }}
      />
      <GuidedTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => setIsTourOpen(false)}
      />

      {showNotification && (
        <div className="fixed top-20 right-8 z-[1001]">
          <ToastNotification
            kind="success"
            title={t('config_updated')}
            subtitle={t('config_propagated')}
            caption={new Date().toLocaleTimeString()}
          />
        </div>
      )}

      <Modal
        open={isSettingsOpen}
        modalHeading={t('modal_heading')}
        primaryButtonText={t('modal_save')}
        secondaryButtonText={t('modal_cancel')}
        onRequestClose={() => setIsSettingsOpen(false)}
        onRequestSubmit={handleSettingsSave}
      >
        <Stack gap={7}>
          <p className="text-body text-text-secondary mb-spacing-md">{t('modal_desc')}</p>
          <Toggle
            id="sync-toggle"
            labelA={t('sync_manual')}
            labelB={t('sync_auto')}
            labelText={t('sync_mode')}
            defaultToggled
          />
          <Toggle
            id="audit-toggle"
            labelA={t('audit_internal')}
            labelB={t('audit_global')}
            labelText={t('audit_visibility')}
          />
        </Stack>
      </Modal>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-spacing-lg">
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-primary relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Audit size={120} />
          </div>
          <p className="text-caption mb-spacing-md">{t('nodes_active')}</p>
          <h2 className="text-h1 text-gradient">1,024</h2>
          <div className="mt-spacing-md">
            <Tag type="green" className="!m-0 px-3 font-bold uppercase tracking-widest text-[10px]">{t('node_healthy')}</Tag>
          </div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-primary relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700 text-primary">
            <Settings size={120} />
          </div>
          <p className="text-caption mb-spacing-md">{t('integrity_score')}</p>
          <h2 className="text-h1 text-gradient">100.0%</h2>
          <div className="mt-spacing-md text-[10px] font-bold text-primary uppercase">{t('last_audit')}</div>
        </Tile>
        <Tile className="glass-panel p-spacing-lg rounded-2xl shadow-xl elevation-premium border-b-4 border-success relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-[-12deg] transition-transform duration-700 text-success">
            <Download size={120} />
          </div>
          <p className="text-caption mb-spacing-md">{t('network_throughput')}</p>
          <h2 className="text-h1 text-gradient">12.5 ops/sec</h2>
          <div className="mt-spacing-md flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-success uppercase">{t('realtime_sync')}</span>
          </div>
        </Tile>
      </div>

      {/* Node Management */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden">
        <div className="p-spacing-lg border-b border-slate-100 bg-slate-50 shadow-inner">
          <h3 className="text-h3">{t('node_management')}</h3>
          <p className="text-body mt-1">{t('node_management_desc')}</p>
        </div>
        <div className="overflow-x-auto w-full">
          <StructuredListWrapper className="min-w-[700px] md:min-w-full !m-0 !border-none">
            <StructuredListHead className="!border-b !border-slate-100">
              <StructuredListRow head>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_node_location')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_last_sync')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_block_height')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_status')}</StructuredListCell>
                <StructuredListCell head className="!text-caption !text-[10px] !p-spacing-lg !bg-transparent">{t('col_actions')}</StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              <StructuredListRow className="hover:!bg-slate-50 transition-colors group">
                <StructuredListCell className="!p-spacing-lg !border-none group-hover:pl-spacing-xl transition-all font-bold">Himalayan Valley #4</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none text-slate-500 font-medium">2 mins ago</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none mono-data text-primary">#452,109</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none">
                  <Tag type="green" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">{t('node_synced')}</Tag>
                </StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none">
                  <div className="flex gap-2">
                     <Button hasIconOnly renderIcon={Settings} size="md" kind="ghost" iconDescription={t('modal_heading')} onClick={() => setIsSettingsOpen(true)} className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                     <Button hasIconOnly renderIcon={Information} size="md" kind="ghost" iconDescription="Info" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                  </div>
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow className="hover:!bg-slate-50 transition-colors group">
                <StructuredListCell className="!p-spacing-lg !border-none group-hover:pl-spacing-xl transition-all font-bold">Central Processing Hub</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none text-slate-500 font-medium">15s ago</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none mono-data text-primary">#452,112</StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none">
                  <Tag type="green" className="!rounded-md font-bold uppercase tracking-widest text-[10px]">{t('node_synced')}</Tag>
                </StructuredListCell>
                <StructuredListCell className="!p-spacing-lg !border-none">
                  <div className="flex gap-2">
                     <Button hasIconOnly renderIcon={Settings} size="md" kind="ghost" iconDescription={t('modal_heading')} onClick={() => setIsSettingsOpen(true)} className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                     <Button hasIconOnly renderIcon={Information} size="md" kind="ghost" iconDescription="Info" className="!rounded-lg hover:!bg-white shadow-sm ring-1 ring-slate-100" />
                  </div>
                </StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      </div>

      {/* Recalls Table */}
      <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
        <div className="p-spacing-lg border-b border-slate-100 bg-slate-50 shadow-inner flex items-center justify-between">
          <div>
            <h3 className="text-h3 flex items-center gap-3">
              <WarningAltFilled size={20} className="text-red-500" />
              Recent Recalls
            </h3>
            <p className="text-body mt-1">
              {recallsLoading ? '…' : `${recalls.length} recall event${recalls.length !== 1 ? 's' : ''} on record`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          {recallsLoading ? (
            <DataTableSkeleton columnCount={5} rowCount={3} />
          ) : recalls.length === 0 ? (
            <div className="p-spacing-xl text-center text-slate-400 text-sm font-medium">
              No recall events recorded.
            </div>
          ) : (
            <TableContainer className="!border-none !bg-white">
              <Table>
                <TableHead>
                  <TableRow className="!border-b-2 !border-slate-50">
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Recall ID</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Batch ID</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Tier</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Reason</TableHeader>
                    <TableHeader className="!bg-transparent !text-caption !text-[10px] !p-4">Initiated At</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recalls.map((recall) => (
                    <TableRow key={recall.id} className="hover:!bg-slate-50 transition-colors border-none group">
                      <TableCell className="!p-4 !border-none mono-data font-bold text-slate-900 group-hover:pl-6 transition-all">{recall.id}</TableCell>
                      <TableCell className="!p-4 !border-none mono-data text-primary font-bold">{recall.batchId}</TableCell>
                      <TableCell className="!p-4 !border-none">{recallTierTag(recall.tier)}</TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium max-w-xs">
                        <span className="line-clamp-1 block" title={recall.reason}>{recall.reason}</span>
                      </TableCell>
                      <TableCell className="!p-4 !border-none text-slate-500 font-medium">
                        {recall.initiatedAt ? new Date(recall.initiatedAt).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </UnifiedDashboardLayout>
  );
}
