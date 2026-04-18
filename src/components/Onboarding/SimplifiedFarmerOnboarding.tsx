'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Tile,
  Stack,
  ProgressBar,
  FileUploader,
} from '@carbon/react';
import {
  CheckmarkFilled,
  Identification,
  Location as LocationIcon,
  Partnership,
  ArrowRight,
  Renew,
} from '@carbon/icons-react';
import { useTranslations } from 'next-intl';
import CopyableValue from '@/components/CopyableValue';

interface FarmerOnboardingProps {
  farmerName: string;
  onCompleteAction: () => void;
}

type GpsState = 'idle' | 'acquiring' | 'ok' | 'error';

interface GpsCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export default function SimplifiedFarmerOnboarding({
  farmerName,
  onCompleteAction,
}: FarmerOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Onboarding.farmer');

  /* ── GPS verification ────────────────────────────────────────────────── */
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const acquireGps = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Browsers REQUIRE a secure context (HTTPS or localhost) for the
    // Geolocation API. Surface this as a discrete, actionable failure
    // mode instead of falling through to a generic GPS error.
    if (!window.isSecureContext) {
      setGpsState('error');
      setGpsMsg(
        'Location verification requires a secure (HTTPS) connection. ' +
          'Please open this page over HTTPS or via http://localhost during local development.',
      );
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsState('error');
      setGpsMsg('Geolocation is not supported on this device or browser.');
      return;
    }

    setGpsState('acquiring');
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ?? null,
        });
        setGpsState('ok');
      },
      (err) => {
        setGpsState('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMsg(
            'Location permission was denied. Tap your browser\u2019s lock icon to allow location, then try again.',
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsMsg(
            'GPS signal is unavailable right now. Move outdoors with a clear sky view and retry.',
          );
        } else if (err.code === err.TIMEOUT) {
          setGpsMsg('GPS lock timed out. Try again \u2014 it can take a moment outdoors.');
        } else {
          setGpsMsg('We could not acquire a GPS lock. Move outdoors and try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }, []);

  // Auto-trigger on first render of step 1.
  useEffect(() => {
    if (step === 1 && gpsState === 'idle') acquireGps();
  }, [step, gpsState, acquireGps]);

  const nextStep = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step < 3) setStep(step + 1);
      else onCompleteAction();
    }, 900);
  };

  const stepLabel = t('stepLabel', { step });

  const statusText = (() => {
    if (gpsState === 'acquiring') return 'Acquiring satellite lock\u2026';
    if (gpsState === 'ok' && coords)
      return `GPS lock acquired (\u00B1${coords.accuracy?.toFixed(0) ?? '\u2014'}\u00A0m)`;
    if (gpsState === 'error') return 'GPS unavailable';
    return 'Waiting for GPS\u2026';
  })();

  return (
    <div className="fixed inset-0 z-[3000] bg-[#f6f8fb] flex flex-col">
      {/* ── Header bar — sized to match the dashboard page-header icon ── */}
      <header className="bg-white border-b border-[#e2e8f0] px-spacing-md py-spacing-sm flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="page-header-icon">
            <Partnership size={26} />
          </div>
          <div className="min-w-0">
            <span className="page-header-eyebrow">{stepLabel}</span>
            <h1 className="text-h3 truncate">{t('onboardingTitle')}</h1>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase text-[#0369a1] bg-[#e0f2fe] border border-[#bae6fd]"
          aria-label={`Step ${step} of 3`}
        >
          {step}/3
        </span>
      </header>

      <main className="flex-1 overflow-y-auto px-spacing-md py-spacing-lg">
        <div className="max-w-md mx-auto w-full">
          {step === 1 && (
            <Stack gap={6} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="onboard-step-intro text-center">
                <h2 className="text-h2 mb-1">{t('welcomeGreeting', { name: farmerName })}</h2>
                <p className="onboard-step-lede mx-auto" style={{ maxWidth: '40ch' }}>
                  {t('verifyFarmDesc')}
                </p>
              </div>

              {/* Verify-location card — centered hero treatment for the
                  single-step wizard. The .vloc--centered modifier handles
                  the alignment so this stays declarative. */}
              <div
                className="vloc vloc--centered"
                role="region"
                aria-live="polite"
                aria-label={t('verifyLocationLabel')}
              >
                <div className="vloc-head">
                  <div className="vloc-icon">
                    <LocationIcon size={26} />
                  </div>
                  <div>
                    <div className="vloc-title">{t('verifyLocationLabel')}</div>
                    <div className="vloc-sub">{t('verifyLocationDesc')}</div>
                  </div>
                </div>

                <div
                  className="vloc-status"
                  data-state={gpsState === 'idle' ? 'acquiring' : gpsState}
                >
                  <span
                    aria-hidden="true"
                    className={`vloc-status-dot vloc-status-dot--${
                      gpsState === 'idle' ? 'acquiring' : gpsState
                    }`}
                  />
                  <span className="flex-1">{statusText}</span>
                  {gpsState === 'ok' && <CheckmarkFilled size={16} aria-hidden="true" />}
                </div>

                {coords && (
                  <div className="vloc-coords">
                    <div>
                      <span className="vloc-coord-label">Latitude</span>
                      <span className="vloc-coord-value">{coords.latitude.toFixed(6)}&deg;</span>
                    </div>
                    <div>
                      <span className="vloc-coord-label">Longitude</span>
                      <span className="vloc-coord-value">{coords.longitude.toFixed(6)}&deg;</span>
                    </div>
                  </div>
                )}

                <div className="vloc-actions">
                  <button
                    type="button"
                    className="vloc-btn vloc-btn--ghost"
                    onClick={acquireGps}
                    disabled={gpsState === 'acquiring'}
                  >
                    <Renew size={16} aria-hidden="true" />
                    {gpsState === 'acquiring' ? 'Locating\u2026' : t('autoDetectGPS')}
                  </button>
                </div>

                {gpsMsg ? (
                  <p className="vloc-help vloc-help--error" role="alert">
                    {gpsMsg}
                  </p>
                ) : (
                  <p className="vloc-help">
                    Your coordinates are used only to verify your apiary location and
                    are cryptographically anchored on chain alongside each harvest.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="vloc-btn vloc-btn--primary vloc-btn--block"
                onClick={nextStep}
                disabled={loading || gpsState !== 'ok'}
              >
                {loading ? t('syncInProgress') : t('nextAction')}
                {!loading && <ArrowRight size={16} aria-hidden="true" />}
              </button>
            </Stack>
          )}

          {step === 2 && (
            <Stack gap={6} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="onboard-step-intro text-center">
                <div className="page-header-icon mx-auto mb-spacing-md">
                  <Identification size={22} />
                </div>
                <h2 className="text-h2 mb-1">{t('identityProofTitle')}</h2>
                <p className="onboard-step-lede mx-auto" style={{ maxWidth: '40ch' }}>
                  {t('identityProofDesc')}
                </p>
              </div>

              <Tile className="glass-panel rounded-[20px] p-spacing-lg">
                <Stack gap={5}>
                  <div className="onboard-upload-zone">
                    <Identification size={20} aria-hidden="true" />
                    {t('scanAadhar')}
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

              <button
                type="button"
                className="vloc-btn vloc-btn--primary vloc-btn--block"
                onClick={nextStep}
                disabled={loading}
              >
                {loading ? t('syncInProgress') : t('verifyAction')}
              </button>
              <button
                type="button"
                className="vloc-btn vloc-btn--ghost vloc-btn--block"
                onClick={() => setStep(1)}
              >
                {t('backAction')}
              </button>
            </Stack>
          )}

          {step === 3 && (
            <Stack
              gap={6}
              className="text-center animate-in zoom-in duration-500 py-spacing-xxl"
            >
              <div className="onboard-success-icon">
                <CheckmarkFilled size={40} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-h2">{t('successTitle')}</h2>
                <p className="onboard-step-lede mt-2">{t('successDesc')}</p>
              </div>

              <div className="vloc vloc--centered">
                <span className="page-header-eyebrow">{t('blockchainReceipt')}</span>
                <p className="text-xs font-mono break-all text-[#475569]" style={{ maxWidth: '40ch' }}>
                  0x882af7e3c4d91b2f6a8e05d43c7b9f1e2a6d8c4b5f3e7a9d1c6b8e2f4a7d3c9bf41
                </p>
                <CopyableValue
                  value="0x882af7e3c4d91b2f6a8e05d43c7b9f1e2a6d8c4b5f3e7a9d1c6b8e2f4a7d3c9bf41"
                  label="Copy TX ID"
                />
              </div>

              <button
                type="button"
                className="vloc-btn vloc-btn--primary vloc-btn--block"
                onClick={onCompleteAction}
              >
                {t('enterPortal')}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </Stack>
          )}
        </div>
      </main>

      <footer className="px-spacing-md py-spacing-sm border-t border-[#e2e8f0] bg-white text-center min-h-[52px] flex items-center justify-center">
        {loading ? (
          <ProgressBar
            label={t('syncInProgress')}
            value={undefined}
            className="w-full max-w-md"
          />
        ) : (
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#94a3b8]">
            {t('govPortal')}
          </p>
        )}
      </footer>
    </div>
  );
}
