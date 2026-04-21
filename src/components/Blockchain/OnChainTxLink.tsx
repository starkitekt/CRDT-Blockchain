'use client';

/**
 * OnChainTxLink — the canonical UI for surfacing a Base Sepolia tx hash.
 *
 * Three jobs:
 *  1. Show the truncated hash in DM Mono (per the typography spec) so it
 *     reads as a ledger value, not a paragraph.
 *  2. Offer two actions side-by-side: "Copy" and "View on BaseScan"
 *     (opens https://sepolia.basescan.org/tx/<hash> in a new tab).
 *  3. Let the user expand an inline panel with the actual on-chain receipt
 *     (block, confirmations, gas, fee, status) fetched from
 *     /api/onchain/tx/[hash] — no need to leave the app to verify.
 *
 * Designed to be a drop-in replacement for `<CopyableValue value={txHash} />`
 * everywhere we currently surface a tx hash.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, InlineLoading, Tag } from '@carbon/react';
import {
  Copy,
  Launch,
  ChevronDown,
  ChevronUp,
  CheckmarkFilled,
  WarningAlt,
  Time,
} from '@carbon/icons-react';
import { explorerTxUrl, networkLabel, shortHash, DEFAULT_CHAIN_ID } from '@/lib/explorer';

interface OnChainTxLinkProps {
  /** 32-byte transaction hash (0x… 64 hex chars). */
  txHash: string | null | undefined;
  /** Optional label shown in front of the hash, e.g. "Settlement tx". */
  label?: string;
  /** When true, fetches /api/onchain/tx/[hash] eagerly so confirmations
   *  appear without the user expanding the panel. Costs one round-trip. */
  prefetchDetails?: boolean;
  /** Force-hide the expandable detail panel (only show actions + hash). */
  compact?: boolean;
  className?: string;
}

interface OnChainReceipt {
  ok: boolean;
  hash: string;
  network: string;
  chainId: number;
  explorerUrl: string | null;
  status?: 'success' | 'failed' | 'pending';
  blockNumber?: number;
  blockTimestampIso?: string | null;
  confirmations?: number;
  gasUsed?: string | null;
  feeEth?: string | null;
  from?: string | null;
  to?: string | null;
  message?: string;
}

async function copyToClipboard(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function OnChainTxLink({
  txHash,
  label = 'Tx hash',
  prefetchDetails = false,
  compact = false,
  className = '',
}: OnChainTxLinkProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<OnChainReceipt | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const explorerUrl = txHash ? explorerTxUrl(txHash) : null;

  const fetchDetails = useCallback(async () => {
    if (!txHash || details || loadingDetails) return;
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const res = await fetch(`/api/onchain/tx/${txHash}`, { cache: 'no-store' });
      const json = (await res.json()) as OnChainReceipt;
      if (!res.ok || !json.ok) throw new Error(json.message ?? 'Failed to fetch');
      setDetails(json);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load on-chain details');
    } finally {
      setLoadingDetails(false);
    }
  }, [txHash, details, loadingDetails]);

  useEffect(() => {
    if (prefetchDetails && txHash) void fetchDetails();
  }, [prefetchDetails, txHash, fetchDetails]);

  const handleCopy = async () => {
    if (!txHash) return;
    await copyToClipboard(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleToggle = () => {
    setExpanded((v) => !v);
    if (!details) void fetchDetails();
  };

  if (!txHash) {
    return (
      <p className={`text-small text-slate-400 ${className}`}>
        Not yet anchored on-chain.
      </p>
    );
  }

  return (
    <div
      className={`inline-flex flex-col w-full max-w-full gap-2 ${className}`}
      data-testid="onchain-tx-link"
    >
      {/* Hash row — DM Mono via .ledger-num, with a copy hint underneath. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-eyebrow text-slate-500 shrink-0">{label}</span>
        <code
          className="ledger-num text-[13px] text-slate-900 break-all bg-slate-50 px-2 py-1 rounded-md border border-slate-200"
          title={txHash}
          data-testid="onchain-tx-hash"
        >
          {shortHash(txHash, 10, 8)}
        </code>
        <Tag
          type="cool-gray"
          className="!rounded-md text-eyebrow !min-h-0 !py-0.5 !px-1.5 border-none"
        >
          {networkLabel(DEFAULT_CHAIN_ID)}
        </Tag>
      </div>

      {/* Actions row — copy + open in basescan + expand. */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Copy}
          onClick={() => { void handleCopy(); }}
          className="!min-h-0 !h-7 !px-2"
          iconDescription={copied ? 'Copied' : 'Copy hash'}
          data-testid="onchain-copy-button"
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {explorerUrl && (
          <Button
            size="sm"
            kind="ghost"
            renderIcon={Launch}
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="!min-h-0 !h-7 !px-2"
            iconDescription="Open in BaseScan"
            as="a"
            data-testid="onchain-explorer-button"
          >
            View on BaseScan
          </Button>
        )}
        {!compact && (
          <Button
            size="sm"
            kind="ghost"
            renderIcon={expanded ? ChevronUp : ChevronDown}
            onClick={handleToggle}
            className="!min-h-0 !h-7 !px-2"
            iconDescription={expanded ? 'Hide on-chain details' : 'Show on-chain details'}
            data-testid="onchain-expand-button"
          >
            {expanded ? 'Hide details' : 'On-chain details'}
          </Button>
        )}
      </div>

      {/* Expanded receipt panel */}
      {expanded && (
        <div
          className="mt-1 p-3 rounded-md bg-slate-50 border border-slate-200 text-small space-y-1.5"
          data-testid="onchain-details-panel"
        >
          {loadingDetails && (
            <InlineLoading description="Reading Base Sepolia receipt…" />
          )}
          {detailsError && (
            <p className="text-rose-600 flex items-center gap-1.5">
              <WarningAlt size={14} />
              {detailsError}
            </p>
          )}
          {details && details.status === 'pending' && (
            <p className="text-amber-700 flex items-center gap-1.5">
              <Time size={14} />
              {details.message ?? 'Transaction is pending.'}
            </p>
          )}
          {details && details.status === 'success' && (
            <>
              <DetailRow label="Status">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckmarkFilled size={14} /> Success
                </span>
              </DetailRow>
              <DetailRow label="Block">
                <span className="ledger-num">{details.blockNumber?.toLocaleString('en-US')}</span>
                {' · '}
                <span className="ledger-num">{details.confirmations?.toLocaleString('en-US')} confirmations</span>
              </DetailRow>
              {details.blockTimestampIso && (
                <DetailRow label="Mined at">
                  <span className="ledger-num">
                    {new Date(details.blockTimestampIso).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </span>
                </DetailRow>
              )}
              {details.from && (
                <DetailRow label="From">
                  <span className="ledger-num text-slate-700">{shortHash(details.from, 8, 6)}</span>
                </DetailRow>
              )}
              {details.to && (
                <DetailRow label="Contract">
                  <span className="ledger-num text-slate-700">{shortHash(details.to, 8, 6)}</span>
                </DetailRow>
              )}
              {details.gasUsed && (
                <DetailRow label="Gas used">
                  <span className="ledger-num">{Number(details.gasUsed).toLocaleString('en-US')}</span>
                </DetailRow>
              )}
              {details.feeEth && (
                <DetailRow label="Fee">
                  <span className="ledger-num">{Number(details.feeEth).toFixed(8)}</span>
                  <span className="text-slate-500 ml-1">ETH</span>
                </DetailRow>
              )}
            </>
          )}
          {details && details.status === 'failed' && (
            <p className="text-rose-700 flex items-center gap-1.5 font-semibold">
              <WarningAlt size={14} /> Transaction reverted on-chain.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
      <span className="text-eyebrow text-slate-500">{label}</span>
      <span className="text-slate-900">{children}</span>
    </div>
  );
}
