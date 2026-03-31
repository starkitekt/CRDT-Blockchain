'use client';

import React, { useState } from 'react';
import { 
  Tile, 
  Button, 
  Stack, 
  ProgressBar,
  InlineNotification,
  FileUploader
} from '@carbon/react';
import { 
  CheckmarkFilled, 
  Identification, 
  Location, 
  Partnership 
} from '@carbon/icons-react';
import { useTranslations } from 'next-intl';
import CopyableValue from '@/components/CopyableValue';

interface FarmerOnboardingProps {
  farmerName: string;
  onCompleteAction: () => void;
}

export default function SimplifiedFarmerOnboarding({
  farmerName,
  onCompleteAction
}: FarmerOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Onboarding.farmer');

  const nextStep = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step < 3) setStep(step + 1);
      else onCompleteAction();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-white flex flex-col">
      {/* Mobile-First Header */}
      <div className="p-spacing-md border-b border-border-subtle flex items-center justify-between bg-primary text-white">
        <h1 className="text-lg font-bold">{t('onboardingTitle')}</h1>
        <div className="text-xs opacity-80 uppercase tracking-widest">{t('stepLabel', { step })}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-spacing-lg max-w-md mx-auto w-full">
        {step === 1 && (
          <Stack gap={6} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center py-spacing-xl">
               <Partnership size={64} className="text-primary mx-auto mb-spacing-md" />
               <h2 className="text-2xl font-bold mb-2">{t('welcomeGreeting', { name: farmerName })}</h2>
               <p className="text-text-secondary">{t('verifyFarmDesc')}</p>
            </div>
            
            <Tile className="p-spacing-md bg-primary/5 border border-primary/20">
               <Stack gap={4}>
                  <div className="flex items-center gap-2 font-bold text-primary">
                     <Location size={20} /> {t('verifyLocationLabel')}
                  </div>
                  <p className="text-sm">{t('verifyLocationDesc')}</p>
                  <Button kind="secondary" size="md">{t('autoDetectGPS')}</Button>
               </Stack>
            </Tile>

            <Button className="w-full mt-spacing-xl" size="lg" onClick={nextStep} disabled={loading}>
              {loading ? t('syncInProgress') : t('nextAction')}
            </Button>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={6} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-spacing-lg">
               <Identification size={48} className="text-primary mb-spacing-md" />
               <h2 className="text-2xl font-bold">{t('identityProofTitle')}</h2>
               <p className="text-text-secondary">{t('identityProofDesc')}</p>
            </div>

            <Tile className="p-spacing-lg standard-tile">
               <Stack gap={5}>
                  <div className="p-spacing-md bg-background border rounded flex items-center justify-center border-dashed text-text-secondary text-sm">
                     <Identification size={24} className="mr-2" /> {t('scanAadhar')}
                  </div>
                  <FileUploader
                    labelTitle=""
                    buttonLabel={t('takePhoto')}
                    buttonKind="primary"
                    size="md"
                    filenameStatus="edit"
                    accept={['.jpg']}
                    multiple={false}
                  />
               </Stack>
            </Tile>

            <Button className="w-full mt-spacing-xl" size="lg" onClick={nextStep} disabled={loading}>
              {loading ? t('syncInProgress') : t('verifyAction')}
            </Button>
            <Button kind="ghost" className="w-full" onClick={() => setStep(1)}>{t('backAction')}</Button>
          </Stack>
        )}

        {step === 3 && (
          <Stack gap={6} className="text-center animate-in zoom-in duration-500 py-spacing-xxl">
            <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto mb-spacing-lg text-white shadow-xl shadow-success/20">
               <CheckmarkFilled size={48} />
            </div>
            <h2 className="text-3xl font-bold">{t('successTitle')}</h2>
            <p className="text-lg text-text-secondary">{t('successDesc')}</p>
            
            <div className="p-spacing-md bg-slate-50 border border-slate-100 rounded text-left mt-spacing-xl">
               <p className="text-[10px] text-text-secondary uppercase font-bold mb-2">{t('blockchainReceipt')}</p>
              <p className="text-xs font-mono break-all opacity-60">TX_ID: 0x882a...bf41</p>
              <CopyableValue value="0x882a...bf41" label="Copy TX ID" className="mt-2 min-h-0 h-7 px-2" />
            </div>

            <Button className="w-full mt-spacing-xl" size="lg" onClick={onCompleteAction}>{t('enterPortal')}</Button>
          </Stack>
        )}
      </div>

      <div className="p-spacing-md border-t border-border-subtle text-center min-h-[56px] flex items-center justify-center">
        {loading
          ? <ProgressBar label={t('syncInProgress')} value={undefined} className="w-full" />
          : <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">{t('govPortal')}</p>
        }
      </div>
    </div>
  );
}
