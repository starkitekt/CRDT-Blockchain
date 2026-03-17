'use client';

import React from 'react';
import { Tile, Tag } from '@carbon/react';
import { useTranslations } from 'next-intl';
import { QrCode, Blockchain } from '@carbon/icons-react';

interface PriorStepQRProps {
  stepName: string;
  batchId: string;
  details: string;
}

export default function PriorStepQR({ stepName, batchId, details }: PriorStepQRProps) {
  const tCommon = useTranslations('common');
  return (
    <Tile className="bg-surface border-dashed border border-border-strong p-spacing-sm rounded-lg overflow-hidden">
      <div className="flex gap-spacing-md items-center">
        <div className="bg-background p-spacing-sm border border-border-subtle rounded shadow-sm flex items-center justify-center">
          <QrCode size={32} className="text-text-primary" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start mb-spacing-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary truncate">{stepName}</h4>
            <div className="flex items-center gap-1 shrink-0 ml-2">
               <Blockchain size={12} className="text-primary" />
               <span className="text-[11px] font-bold text-primary uppercase tracking-tight">{tCommon('verified')}</span>
            </div>
          </div>
          <p className="text-sm font-bold text-text-primary mb-1 mono-data truncate">{batchId}</p>
          <p className="text-[11px] text-text-secondary truncate leading-tight uppercase tracking-wider font-medium opacity-70 w-full">{details}</p>
        </div>
      </div>
    </Tile>
  );
}
