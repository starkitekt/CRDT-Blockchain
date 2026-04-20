'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  InlineNotification,
  Tag,
  SkeletonText,
  NumberInput,
  Modal,
} from '@carbon/react';
import {
  ArrowLeft,
  CheckmarkFilled,
  Close,
  Locked,
  Time,
  TrophyFilled,
  Blockchain,
  WarningAlt,
} from '@carbon/icons-react';

import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { marketplaceApi, ApiError, type MarketplaceListing, type MarketplaceBid } from '@/lib/api';
import OnChainTxLink from '@/components/Blockchain/OnChainTxLink';
import {
  formatPaiseToINR,
  formatRemaining,
  timeAgo,
} from '@/components/Marketplace/format';
import styles from '@/components/Marketplace/marketplace.module.css';

const POLL_MS = 5_000;

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; listingId: string }>();
  const locale = params?.locale ?? 'en';
  const listingId = params?.listingId ?? '';
  const user = useCurrentUser();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [bids, setBids] = useState<MarketplaceBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [bidRupees, setBidRupees] = useState<number>(0);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!listingId) return;
    try {
      const [l, b] = await Promise.all([
        marketplaceApi.get(listingId),
        marketplaceApi.bids(listingId).catch(() => [] as MarketplaceBid[]),
      ]);
      setListing(l);
      setBids(Array.isArray(b) ? b : []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live polling + ticker
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    if (!listing || listing.status !== 'live') return;
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [listing, refresh]);

  // Default the bid input to the minimum next bid
  useEffect(() => {
    if (!listing) return;
    setBidRupees((prev) => {
      const minRupees = Math.ceil(listing.minNextBidPaise / 100);
      return prev < minRupees ? minRupees : prev;
    });
  }, [listing]);

  const remainingMs = listing
    ? Math.max(0, new Date(listing.endsAt).getTime() - now)
    : 0;
  const remaining = formatRemaining(remainingMs);

  const isOwner = listing && String(listing.farmerId) === String(user.userId);
  const canBid =
    listing &&
    listing.status === 'live' &&
    !isOwner &&
    (user.role === 'enterprise' || user.role === 'consumer' || user.role === 'admin');
  const canCancel =
    listing && listing.status === 'live' && (isOwner || user.role === 'admin');
  const canSettle =
    listing && listing.status === 'live' && remainingMs <= 0;

  const handleBid = async () => {
    if (!listing) return;
    setBidError(null);
    setBidSuccess(null);
    const amountPaise = Math.round(bidRupees * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      setBidError('Enter a positive amount.');
      return;
    }
    setBidLoading(true);
    try {
      const res = await marketplaceApi.bid(listing.listingId, amountPaise);
      setListing(res.data.listing);
      setBidSuccess(`Bid of ${formatPaiseToINR(amountPaise)} placed.`);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setBidError(err.message);
      } else {
        setBidError('Failed to place bid.');
      }
    } finally {
      setBidLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!listing) return;
    setConfirmCancelOpen(false);
    try {
      const res = await marketplaceApi.cancel(listing.listingId);
      setListing(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel listing');
    }
  };

  const handleSettle = async () => {
    if (!listing) return;
    setSettleLoading(true);
    try {
      const res = await marketplaceApi.settle(listing.listingId);
      setListing(res.data);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to settle');
    } finally {
      setSettleLoading(false);
    }
  };

  const breadcrumbs = useMemo(
    () => (
      <Link
        href={`/${locale}/dashboard/marketplace`}
        className="text-caption text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 !no-underline"
      >
        <ArrowLeft size={14} /> Back to marketplace
      </Link>
    ),
    [locale]
  );

  if (loading) {
    return (
      <UnifiedDashboardLayout header={breadcrumbs}>
        <div className="glass-panel rounded-2xl p-spacing-lg">
          <SkeletonText paragraph lineCount={6} />
        </div>
      </UnifiedDashboardLayout>
    );
  }

  if (!listing) {
    return (
      <UnifiedDashboardLayout header={breadcrumbs}>
        <InlineNotification kind="error" lowContrast title="Listing not found" subtitle={error ?? `No listing with id ${listingId}`} />
        <Button kind="ghost" onClick={() => router.push(`/${locale}/dashboard/marketplace`)} renderIcon={ArrowLeft}>
          Back
        </Button>
      </UnifiedDashboardLayout>
    );
  }

  const finalPriceLabel =
    listing.status === 'settled'
      ? 'Final price'
      : listing.bidCount > 0
        ? 'Highest bid'
        : 'Reserve price';

  const headerStatus =
    listing.status === 'live'
      ? <span className={styles['live-pulse']} data-testid="status-live">LIVE AUCTION</span>
      : listing.status === 'settled'
        ? <Tag type="green" renderIcon={CheckmarkFilled} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Settled</Tag>
        : listing.status === 'cancelled'
          ? <Tag type="warm-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Cancelled</Tag>
          : <Tag type="cool-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Unsold</Tag>;

  return (
    <UnifiedDashboardLayout header={breadcrumbs}>
      {error && (
        <InlineNotification kind="error" lowContrast title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-xl">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-spacing-lg">
          <section className="listing-detail-main glass-panel rounded-2xl shadow-xl elevation-premium" style={{ padding: '2.25rem 2.5rem' }}>
            <div className="!flex flex-row items-start justify-between gap-spacing-lg mb-spacing-xl">
              <div className="min-w-0 flex-1">
                <p className="text-eyebrow text-slate-400">
                  Listing <span className="ledger-num">{listing.listingId}</span>
                </p>
                <h1 className="listing-detail-title mt-2.5">{listing.floraType} Honey</h1>
                <p className="text-body mt-spacing-sm text-slate-600">
                  <span className="ledger-num">{listing.weightKg.toFixed(1)} kg</span>
                  {' · Grade '}<span className="ledger-num">{listing.grade}</span>
                  {' · Harvested by '}{listing.farmerName}
                </p>
              </div>
              <div className="shrink-0 pt-1">{headerStatus}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
              <div className="rounded-2xl bg-slate-50 border border-slate-200/70" style={{ padding: '1.5rem 1.75rem' }}>
                <p className="text-eyebrow text-slate-500" style={{ marginBottom: '0.75rem' }}>
                  {finalPriceLabel}
                </p>
                <p className={styles['price-display-lg']} data-testid="current-price">
                  {formatPaiseToINR(
                    listing.bidCount > 0 ? listing.currentPricePaise : listing.reservePricePaise
                  )}
                </p>
                {listing.highestBidderName && (
                  <p className="text-small text-slate-500" style={{ marginTop: '0.625rem' }}>
                    Leader: <strong className="text-slate-800">{listing.highestBidderName}</strong>
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200/70" style={{ padding: '1.5rem 1.75rem' }}>
                <p className="text-eyebrow text-slate-500" style={{ marginBottom: '0.75rem' }}>
                  {listing.status === 'live' ? 'Time remaining' : listing.status === 'settled' ? 'Settled at' : 'Closed at'}
                </p>
                <p className={`${styles['countdown-lg']} ${remaining.ending ? styles['ending'] : ''} !flex flex-row items-center gap-2`} data-testid="countdown">
                  <Time size={18} className="opacity-60 shrink-0" />
                  <span className="truncate">
                    {listing.status === 'live'
                      ? remaining.text
                      : new Date(listing.settledAt ?? listing.endsAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                  </span>
                </p>
                {listing.status === 'live' && (
                  <p className="text-small text-slate-500" style={{ marginTop: '0.625rem' }}>
                    Anti-snipe: bids in the last
                    {' '}<span className="ledger-num">{listing.antiSnipeWindowSec}s</span>
                    {' extend the close by '}
                    <span className="ledger-num">{listing.antiSnipeExtendSec}s</span>.
                  </p>
                )}
              </div>
            </div>

            <div className="listing-detail-metrics border-t border-slate-100"
                 style={{ marginTop: '2rem', paddingTop: '2rem' }}>
              <KV label="Batch" value={<Link href={`/${locale}/trace/${listing.batchId}`} className="text-primary font-mono">{listing.batchId}</Link>} />
              <KV label="Warehouse" value={listing.warehouseName} />
              <KV label="Bids placed" value={<span className="ledger-num">{listing.bidCount}</span>} />
              <KV label="Reserve" value={<span className="ledger-num">{formatPaiseToINR(listing.reservePricePaise)}</span>} />
              <KV label="Bid increment" value={<span className="ledger-num">{formatPaiseToINR(listing.bidIncrementPaise)}</span>} />
              <KV
                label="Storage tariff"
                value={<span className="ledger-num">{`${formatPaiseToINR(listing.storageRatePerKgPerDayPaise)}/kg/day`}</span>}
              />
              <KV
                label="Storage cost so far"
                value={<span className="ledger-num" data-testid="storage-cost">{formatPaiseToINR(listing.storageCostPaiseLive)}</span>}
              />
              <KV
                label="Net to farmer (projected)"
                value={
                  <span className="ledger-num" data-testid="projected-net">
                    {formatPaiseToINR(listing.projectedNetToFarmerPaise)}
                  </span>
                }
              />
            </div>

            {listing.notes && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl"
                   style={{ marginTop: '2rem', padding: '1.5rem 1.75rem' }}>
                <p className="text-eyebrow text-amber-700" style={{ marginBottom: '0.625rem' }}>
                  Seller notes
                </p>
                <p className="text-body text-amber-900 leading-relaxed" style={{ marginBottom: 0 }}>
                  {listing.notes}
                </p>
              </div>
            )}

            {listing.status === 'settled' && listing.settlementTxHash && (
              <div
                className="bg-emerald-50/70 border border-emerald-100 rounded-2xl"
                style={{ marginTop: '2rem', padding: '1.5rem 1.75rem' }}
                data-testid="settlement-anchor"
              >
                <div className="!flex flex-row items-center gap-2" style={{ marginBottom: '1rem' }}>
                  <Blockchain size={18} className="text-emerald-700" />
                  <p className="text-eyebrow text-emerald-800" style={{ marginBottom: 0 }}>
                    Auction settlement anchored on chain
                  </p>
                </div>
                <OnChainTxLink
                  txHash={listing.settlementTxHash}
                  label="Settlement tx"
                  prefetchDetails
                />
                <p className="text-small text-emerald-900/80 leading-relaxed" style={{ marginTop: '1rem' }}>
                  This receipt is permanent and publicly verifiable. &ldquo;View on
                  BaseScan&rdquo; opens the transaction in the Base Sepolia
                  explorer; &ldquo;On-chain details&rdquo; reveals the block, gas
                  used, and confirmations without leaving the app.
                </p>
              </div>
            )}
          </section>

          {/* Bid history */}
          <section className="glass-panel rounded-2xl p-spacing-lg shadow-xl elevation-premium">
            <div className="flex items-center justify-between mb-spacing-md">
              <h2 className="text-h3">Bid history</h2>
              <span className="text-caption text-slate-400">{bids.length} {bids.length === 1 ? 'bid' : 'bids'}</span>
            </div>
            {bids.length === 0 ? (
              <p className="text-caption text-slate-400 py-spacing-md">No bids yet — be the first.</p>
            ) : (
              <div className="space-y-2" data-testid="bid-history">
                {bids.map((bid) => (
                  <div key={bid.id} className={`${styles['bid-row']} ${bid.isWinning ? styles['winning'] : ''}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                        {bid.isWinning && <TrophyFilled size={14} className="text-emerald-600" />}
                        {bid.bidderName}
                      </p>
                      <p className="text-caption text-slate-400 capitalize">{bid.bidderRole}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatPaiseToINR(bid.amountPaise)}
                    </span>
                    <span className="text-caption text-slate-400 whitespace-nowrap">
                      {timeAgo(bid.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side column */}
        <aside className="space-y-spacing-lg">
          {canBid && (
            <section className="glass-panel rounded-2xl p-spacing-lg shadow-xl elevation-premium">
              <h2 className="text-h3 mb-spacing-md">Place a bid</h2>
              <NumberInput
                id="bid-amount"
                data-testid="bid-amount-input"
                label="Your bid (₹)"
                helperText={`Minimum next bid: ${formatPaiseToINR(listing.minNextBidPaise)}`}
                min={Math.ceil(listing.minNextBidPaise / 100)}
                step={Math.max(1, Math.ceil(listing.bidIncrementPaise / 100))}
                value={bidRupees}
                onChange={(_e, { value }) => setBidRupees(Number(value ?? 0))}
              />
              <Button
                kind="primary"
                size="lg"
                className="!max-w-none w-full mt-spacing-md"
                onClick={handleBid}
                disabled={bidLoading}
                renderIcon={Locked}
                data-testid="submit-bid-button"
              >
                {bidLoading ? 'Placing bid…' : 'Place bid'}
              </Button>
              {user.role === 'consumer' && (
                <p className="text-caption text-amber-700 mt-2 flex items-start gap-1">
                  <WarningAlt size={12} className="mt-0.5 shrink-0" />
                  Consumer bids are capped at ₹50,000 per listing.
                </p>
              )}
              {bidError && (
                <InlineNotification kind="error" lowContrast title="Bid rejected" subtitle={bidError} hideCloseButton className="!mt-spacing-md" />
              )}
              {bidSuccess && (
                <InlineNotification kind="success" lowContrast title="Bid placed" subtitle={bidSuccess} hideCloseButton className="!mt-spacing-md" />
              )}
            </section>
          )}

          {!canBid && listing.status === 'live' && (
            <section className="glass-panel rounded-2xl p-spacing-lg shadow-xl elevation-premium">
              <h2 className="text-h3">{isOwner ? 'You own this listing' : 'Bidding restricted'}</h2>
              <p className="text-caption text-slate-500 mt-2">
                {isOwner
                  ? 'You cannot bid on your own auction. Watch live bids stream in here.'
                  : 'Only enterprise and consumer accounts can place bids.'}
              </p>
            </section>
          )}

          {canCancel && (
            <Button
              kind="danger--ghost"
              renderIcon={Close}
              onClick={() => setConfirmCancelOpen(true)}
              className="!max-w-none w-full"
              data-testid="cancel-listing-button"
              disabled={listing.bidCount > 0 && user.role !== 'admin'}
            >
              {listing.bidCount > 0 ? 'Cancel disabled (bids exist)' : 'Cancel listing'}
            </Button>
          )}

          {canSettle && (
            <Button
              kind="primary"
              onClick={handleSettle}
              disabled={settleLoading}
              className="!max-w-none w-full"
              data-testid="settle-listing-button"
              renderIcon={CheckmarkFilled}
            >
              {settleLoading ? 'Settling…' : 'Settle auction'}
            </Button>
          )}

          <section className="glass-panel rounded-2xl p-spacing-lg shadow-xl elevation-premium">
            <h2 className="text-h3 mb-2">How it works</h2>
            <ol className="space-y-2 list-decimal pl-5 text-caption text-slate-600">
              <li>Farmer lists a certified batch with a reserve price.</li>
              <li>Bidders place ascending bids respecting the increment.</li>
              <li>Bids in the final {listing.antiSnipeWindowSec}s extend the close by {listing.antiSnipeExtendSec}s.</li>
              <li>At close, storage cost is deducted and the settlement is anchored on chain.</li>
            </ol>
          </section>
        </aside>
      </div>

      <Modal
        open={confirmCancelOpen}
        modalHeading="Cancel listing?"
        primaryButtonText="Yes, cancel"
        secondaryButtonText="Keep live"
        danger
        onRequestClose={() => setConfirmCancelOpen(false)}
        onRequestSubmit={handleCancel}
      >
        <p className="text-body">
          Cancelling will close the auction immediately. {listing.bidCount > 0 ? 'Existing bidders will be notified.' : 'No bids have been placed yet.'}
        </p>
      </Modal>
    </UnifiedDashboardLayout>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 !flex flex-col" style={{ gap: '0.5rem' }}>
      <p className="text-eyebrow text-slate-500" style={{ marginBottom: 0 }}>{label}</p>
      <p className="text-body text-slate-900 truncate font-medium" style={{ marginTop: 0 }}>{value}</p>
    </div>
  );
}
