'use client';

import React, { useState } from 'react';
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
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!isOpen) return null;

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="gt-panel">
        {/* Header */}
        <div className="gt-header">
          <div className="gt-step-num">
            {String(currentStep + 1).padStart(2, '0')}
          </div>
          <div className="gt-header-text">
            <p className="gt-step-label">
              {tc('tour_step_of', { current: currentStep + 1, total: steps.length })}
            </p>
            <h2 id="tour-title" className="gt-title">{step.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="gt-close"
            aria-label={tc('close')}
          >
            <Close size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="gt-body">
          <p className="gt-desc">{step.description}</p>
        </div>

        {/* Step dots */}
        <div className="gt-dots">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`gt-dot ${i === currentStep ? 'gt-dot--active' : ''}`}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="gt-footer">
          <button
            className="gt-btn gt-btn--ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            {tc('tour_back')}
          </button>
          <button
            className="gt-btn gt-btn--primary"
            onClick={handleNext}
          >
            {isLast ? (
              <><CheckmarkFilled size={16} />{tc('tour_finish')}</>
            ) : (
              <>{tc('tour_next')}<ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
