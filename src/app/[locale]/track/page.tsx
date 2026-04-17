'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tile,
  Button,
  TextInput,
  Stack,
  InlineNotification,
  Tag,
} from '@carbon/react';
import {
  QrCode,
  Search,
  Scan,
  ArrowRight,
  Checkmark,
  DataCheck,
  Security,
  Locked,
} from '@carbon/icons-react';
import QRScanner from '@/components/Traceability/QRScanner';

const MOCK_BATCH_IDS = ['HT-20260417-018', 'HT-20260417-019'];

const HOW_IT_WORKS = [
  { Icon: Search,    title: 'Enter Batch ID',     desc: 'Find the ID on product packaging or scan the QR code.' },
  { Icon: Locked,    title: 'Blockchain Lookup',  desc: 'We verify against immutable, tamper-proof records.' },
  { Icon: DataCheck, title: 'View Full Journey',  desc: 'See harvest, testing, certification and delivery history.' },
];

function extractBatchId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/HT-\d{8}-\d{3}/i);
  return (match?.[0] ?? trimmed).toUpperCase();
}

export default function PublicTrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = React.use(params);
  const currentLocale = locale ?? 'en';
  const router = useRouter();
  const [batchInput, setBatchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleTraceById = () => {
    setError(null);
    const batchId = extractBatchId(batchInput);
    if (!batchId) {
      setError('Please enter a valid Batch ID or trace URL.');
      return;
    }
    router.push(`/${currentLocale}/trace/${encodeURIComponent(batchId)}`);
  };

  const handleQrResult = (batchId: string) => {
    setShowScanner(false);
    router.push(`/${currentLocale}/trace/${encodeURIComponent(batchId)}`);
  };

  return (
    <div className="dashboard-container">
      <Stack gap={6}>

        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--interactive)', color: '#fff' }}
            >
              <Security size={24} />
            </div>
            <div>
              <h1 className="text-h1" style={{ fontSize: '1.75rem' }}>Public Batch Verification</h1>
              <p className="text-body mt-1">
                Verify honey traceability without logging in — no account required.
              </p>
            </div>
          </div>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => router.push(`/${currentLocale}/dashboard/consumer`)}
          >
            Consumer Portal <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>

        {/* ── How it works ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ Icon, title, desc }, i) => (
            <Tile key={title} className="standard-tile">
              <div className="flex items-start gap-3 p-1">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--interactive)', color: '#fff' }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p
                    className="text-caption mb-1"
                    style={{ color: 'var(--interactive)' }}
                  >
                    STEP {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
              </div>
            </Tile>
          ))}
        </div>

        {/* ── Lookup by Batch ID ── */}
        <Tile className="glass-panel">
          <Stack gap={5}>
            <div className="flex items-center gap-3">
              <QrCode size={22} style={{ color: 'var(--interactive)' }} />
              <h2 className="text-h2" style={{ fontSize: '1.25rem' }}>Lookup by Batch ID</h2>
            </div>

            <p className="text-body" style={{ fontSize: '0.875rem' }}>
              Paste a full trace URL or a batch ID like{' '}
              <code
                className="mono-data rounded px-1.5 py-0.5 text-xs"
                style={{ background: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                HT-20260417-018
              </code>
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextInput
                  id="public-batch-id"
                  labelText="Batch ID or Trace URL"
                  placeholder="HT-YYYYMMDD-NNN"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTraceById()}
                />
              </div>
              <Button
                renderIcon={Search}
                onClick={handleTraceById}
                disabled={!batchInput.trim()}
              >
                View Journey
              </Button>
            </div>

            <div>
              <p className="text-caption mb-2">Try demo IDs</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_BATCH_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBatchInput(id)}
                    className="mono-data cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      background: 'var(--border-subtle)',
                      color: 'var(--interactive)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <InlineNotification
                kind="error"
                title="Invalid input."
                subtitle={error}
                onCloseButtonClick={() => setError(null)}
                lowContrast
              />
            )}
          </Stack>
        </Tile>

        {/* ── QR Scanner ── */}
        <Tile className="glass-panel">
          <Stack gap={4}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Scan size={22} style={{ color: 'var(--interactive)' }} />
                <div>
                  <h2 className="text-h2" style={{ fontSize: '1.25rem' }}>Scan Product QR Code</h2>
                  <p className="text-body" style={{ fontSize: '0.875rem' }}>
                    Point your camera at the product QR to open the trace page instantly.
                  </p>
                </div>
              </div>
              <Button
                kind={showScanner ? 'danger--ghost' : 'secondary'}
                size="sm"
                onClick={() => setShowScanner((v) => !v)}
              >
                {showScanner ? 'Close Scanner' : 'Open Scanner'}
              </Button>
            </div>

            {showScanner ? (
              <div
                className="overflow-hidden rounded-lg"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <QRScanner onResult={handleQrResult} onError={(msg) => setError(msg)} />
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-lg py-10"
                style={{
                  border: '2px dashed var(--border-subtle)',
                  background: 'var(--background)',
                }}
              >
                <QrCode size={40} style={{ color: 'var(--border-strong)', opacity: 0.5 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Scanner not active
                </p>
                <p className="text-xs" style={{ color: 'var(--border-strong)' }}>
                  Click &quot;Open Scanner&quot; to activate
                </p>
              </div>
            )}
          </Stack>
        </Tile>

        {/* ── Trust strip ── */}
        <Tile className="standard-tile">
          <div className="flex flex-wrap items-center justify-center gap-6 py-1">
            {[
              { Icon: Checkmark, text: 'No login required' },
              { Icon: Locked,    text: 'Blockchain-secured records' },
              { Icon: Security,  text: 'Government of India initiative' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={16} style={{ color: 'var(--success)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </Tile>

      </Stack>
    </div>
  );
}
