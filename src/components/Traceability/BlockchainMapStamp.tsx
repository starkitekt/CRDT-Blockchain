'use client';

import React from 'react';
import { Tile } from '@carbon/react';
import { useTranslations } from 'next-intl';
import { Location, Time, Information } from '@carbon/icons-react';

interface BlockchainMapStampProps {
  locationName: string;
  latitude: string;
  longitude: string;
  utcTime: string;
}

/**
 * BlockchainMapStamp - A professional, "stamped" verification component
 * used to display immutable geospatial and temporal data.
 */
export default function BlockchainMapStamp({ 
  locationName, 
  latitude, 
  longitude, 
  utcTime 
}: BlockchainMapStampProps) {
  const tCommon = useTranslations('common');
  return (
    <Tile className="bg-background border-dashed border border-border-strong p-spacing-sm rounded-lg overflow-hidden max-w-full">
      <div className="flex flex-col gap-spacing-xs">
        <div className="flex items-center justify-between border-b border-border-subtle pb-spacing-xs mb-spacing-xs">
          <div className="flex items-center gap-spacing-xs">
            <Location size={16} className="text-primary" />
            <span className="text-caption !text-[10px]">{locationName}</span>
          </div>
          <Information size={14} className="text-text-secondary cursor-help" aria-label="Geo-spatial verification timestamp" title="Geo-spatial verification timestamp" />
        </div>
        
        <div className="grid grid-cols-2 gap-spacing-sm">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-tighter text-text-secondary font-bold">{tCommon('coordinates')}</span>
            <span className="text-xs font-mono leading-tight tracking-tighter truncate">
              {latitude}, {longitude}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[11px] uppercase tracking-tighter text-text-secondary font-bold">{tCommon('timestamp')}</span>
            <div className="flex items-center justify-end gap-1">
              <Time size={12} className="text-text-secondary" />
              <span className="text-xs font-mono leading-tight tracking-tighter" suppressHydrationWarning>
                {utcTime} <span className="text-primary font-bold">UTC</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-spacing-xs pt-spacing-xs border-t border-border-subtle flex justify-between items-center">
          <span className="text-[11px] italic text-text-secondary">{tCommon('geo_secured')}</span>
          <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_4px_rgba(36,161,72,0.5)]" />
        </div>
      </div>
    </Tile>
  );
}
