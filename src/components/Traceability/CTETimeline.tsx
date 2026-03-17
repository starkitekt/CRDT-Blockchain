'use client';

import React from 'react';
import { CheckmarkFilled, CircleDash, Time } from '@carbon/icons-react';

/**
 * Critical Tracking Events aligned to GS1 EPCIS 2.0 vocabulary.
 * BizSteps use URN identifiers from CBV (Core Business Vocabulary).
 */
export type CTEStatus = 'completed' | 'active' | 'pending';

export interface CTEEvent {
  /** EPCIS BizStep URN e.g. urn:epcglobal:cbv:bizstep:harvesting */
  bizStep: string;
  /** Human-readable step label */
  label: string;
  /** Location (GLN or descriptive) */
  location: string;
  /** ISO 8601 UTC timestamp */
  eventTime?: string;
  /** Step status */
  status: CTEStatus;
  /** EPCIS disposition e.g. active, in_transit, conformant */
  disposition?: string;
  /** Actor who performed the event */
  actor?: string;
}

interface CTETimelineProps {
  batchId: string;
  events: CTEEvent[];
}

const DISPOSITION_COLORS: Record<string, string> = {
  active: 'text-success',
  in_transit: 'text-primary',
  conformant: 'text-success',
  non_conformant: 'text-error',
  in_progress: 'text-warning',
};

export default function CTETimeline({ batchId, events }: CTETimelineProps) {
  return (
    <div className="glass-panel rounded-2xl shadow-xl elevation-premium overflow-hidden border border-slate-100">
      <div className="p-spacing-lg border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">GS1 EPCIS 2.0 · Chain of Custody</p>
            <h3 className="text-h3">Traceability Timeline</h3>
          </div>
          <div className="font-mono text-[10px] text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-lg">
            {batchId}
          </div>
        </div>
      </div>

      <div className="p-spacing-lg">
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-100" />

          <div className="flex flex-col gap-0">
            {events.map((event, index) => (
              <div key={index} className="relative flex gap-4 pb-spacing-lg last:pb-0">
                {/* Step icon */}
                <div className="relative z-10 shrink-0">
                  {event.status === 'completed' ? (
                    <div className="w-10 h-10 rounded-full bg-success/10 border-2 border-success flex items-center justify-center text-success">
                      <CheckmarkFilled size={20} />
                    </div>
                  ) : event.status === 'active' ? (
                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary animate-pulse">
                      <Time size={18} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400">
                      <CircleDash size={18} />
                    </div>
                  )}
                </div>

                {/* Event details */}
                <div className={`flex-1 pt-1.5 ${event.status === 'pending' ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{event.label}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{event.bizStep}</p>
                    </div>
                    {event.disposition && (
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 ${DISPOSITION_COLORS[event.disposition] ?? 'text-slate-500'}`}>
                        {event.disposition.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-spacing-md mt-spacing-xs">
                    <span className="text-[11px] text-slate-500 font-medium">{event.location}</span>
                    {event.actor && <span className="text-[11px] text-primary font-medium">· {event.actor}</span>}
                    {event.eventTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        · {new Date(event.eventTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
