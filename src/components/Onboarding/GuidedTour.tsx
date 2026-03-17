'use client';

import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { useTranslations } from 'next-intl';
import { Close, ArrowRight, CheckmarkFilled } from '@carbon/icons-react';

interface TourStep {
  label: string;
  description: string;
  title: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEP_NUMBERS = ['01', '02', '03', '04', '05'];

export default function GuidedTour({ steps, isOpen, onClose, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const tc = useTranslations('common');

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(0);
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Brand Header */}
        <div className="bg-primary px-spacing-xl pt-spacing-xl pb-spacing-lg relative overflow-hidden">
          <div className="absolute right-[-24px] top-[-24px] opacity-10">
            <div className="w-32 h-32 rounded-full border-[20px] border-white" />
          </div>
          <div className="absolute right-12 bottom-[-16px] opacity-10">
            <div className="w-20 h-20 rounded-full border-[14px] border-white" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-spacing-md right-spacing-md text-white/60 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
            aria-label={tc('close')}
          >
            <Close size={20} />
          </button>

          <div className="flex items-end gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-2xl tracking-tighter shrink-0">
              {STEP_NUMBERS[currentStep] ?? String(currentStep + 1).padStart(2, '0')}
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                {tc('tour_step_of', { current: currentStep + 1, total: steps.length })}
              </p>
              <h2 className="text-white font-bold text-xl leading-tight">{step.title}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-spacing-xl py-spacing-lg">
          <p className="text-slate-600 leading-relaxed text-[15px]">{step.description}</p>
        </div>

        {/* Step Dots */}
        <div className="flex justify-center gap-2 pb-spacing-md">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`transition-all rounded-full ${i === currentStep ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-spacing-xl pb-spacing-xl">
          <Button
            kind="ghost"
            size="lg"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex-1 h-12 !rounded-xl border border-slate-100"
          >
            <span className="font-bold">{tc('tour_back')}</span>
          </Button>
          <Button
            kind="primary"
            size="lg"
            onClick={handleNext}
            renderIcon={isLast ? CheckmarkFilled : ArrowRight}
            className="flex-1 h-12 !rounded-xl shadow-xl"
          >
            <span className="font-bold">{isLast ? tc('tour_finish') : tc('tour_next')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
