'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag, Button } from '@carbon/react';
import { ArrowRight, Time, Locked, ShoppingCart, CheckmarkFilled } from '@carbon/icons-react';
import type { MarketplaceListing } from '@/lib/api';
import { formatPaiseToINR, formatRemaining } from './format';
import styles from './marketplace.module.css';

interface Props {
  listing: MarketplaceListing;
  locale: string;
  highlight?: boolean;
}

export default function ListingCard({ listing, locale, highlight }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (listing.status !== 'live') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [listing.status]);

  const remainingMs =
    listing.status === 'live'
      ? Math.max(0, new Date(listing.endsAt).getTime() - now)
      : 0;
  const { text: remainingText, ending } = formatRemaining(remainingMs);

  const statusTag =
    listing.status === 'live'
      ? <span className={styles['live-pulse']}>LIVE</span>
      : listing.status === 'settled'
        ? <Tag type="green" renderIcon={CheckmarkFilled} className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Settled</Tag>
        : listing.status === 'cancelled'
          ? <Tag type="warm-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Cancelled</Tag>
          : <Tag type="cool-gray" className="!rounded-md font-bold uppercase tracking-widest text-[10px] border-none">Unsold</Tag>;

  const isLive = listing.status === 'live';
  const closedAt = listing.settledAt ?? listing.endsAt;
  const closedDateText = new Date(closedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className={`${styles['listing-card']} ${styles[listing.status]}`}
      data-listing-id={listing.listingId}
      data-testid="listing-card"
      style={highlight ? { boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.6)' } : undefined}
    >
      <div className="!flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow text-slate-400 ledger-num">
            {listing.listingId}
          </p>
          <h3 className="text-h3 mt-1.5 truncate text-slate-900 !tracking-tight">
            {listing.floraType} Honey
          </h3>
          <p className="text-small text-slate-500 truncate mt-1">
            <span className="ledger-num">{listing.weightKg.toFixed(1)} kg</span>
            {' · Grade '}
            <span className="ledger-num">{listing.grade}</span>
            {` · ${listing.warehouseName}`}
          </p>
        </div>
        <div className="shrink-0">{statusTag}</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5 gap-y-1">
        <p className="text-eyebrow text-slate-400">
          {listing.bidCount > 0 ? 'Highest bid' : 'Reserve'}
        </p>
        <p className="text-eyebrow text-slate-400">
          {isLive ? 'Time remaining' : 'Closed'}
        </p>
        <p className={styles['price-display']}>
          {formatPaiseToINR(
            listing.bidCount > 0 ? listing.currentPricePaise : listing.reservePricePaise
          )}
        </p>
        {isLive ? (
          <p className={`${styles['countdown']} ${ending ? styles['ending'] : ''} flex items-center gap-1.5`}>
            <Time size={14} className="opacity-60 shrink-0" aria-hidden />
            {remainingText}
          </p>
        ) : (
          <p className={`${styles['closed-date']} flex items-center gap-1.5`}>
            <Time size={14} className="opacity-60 shrink-0" aria-hidden />
            {closedDateText}
          </p>
        )}
        <p className="text-small text-slate-500 truncate mt-0.5">
          <span className="ledger-num">{listing.bidCount}</span>
          {` ${listing.bidCount === 1 ? 'bid' : 'bids'}`}
          {listing.highestBidderName ? ` · ${listing.highestBidderName}` : ''}
        </p>
        <p className="text-small text-slate-500 truncate mt-0.5">
          Storage:{' '}
          <span className="text-slate-700 ledger-num">
            {formatPaiseToINR(listing.storageCostPaiseLive)}
          </span>
        </p>
      </div>

      <div className="!flex flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <p className="text-small text-slate-500 flex items-center gap-1.5 min-w-0">
          <Locked size={11} className="opacity-50 shrink-0" aria-hidden />
          <span className="ledger-num text-slate-700 truncate">{listing.batchId}</span>
        </p>
        <Link href={`/${locale}/dashboard/marketplace/${listing.listingId}`} className="!no-underline shrink-0">
          <Button size="sm" kind="primary" renderIcon={isLive ? ShoppingCart : ArrowRight}>
            {isLive ? 'Bid now' : 'View'}
          </Button>
        </Link>
      </div>
    </article>
  );
}
