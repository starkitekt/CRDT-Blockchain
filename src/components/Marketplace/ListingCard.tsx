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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {listing.listingId}
          </p>
          <h3 className="mt-1 font-bold truncate text-[15px] leading-tight text-slate-900">
            {listing.floraType} Honey
          </h3>
          <p className="text-[11px] mt-1 text-slate-500 truncate">
            {listing.weightKg.toFixed(1)} kg · Grade {listing.grade} · {listing.warehouseName}
          </p>
        </div>
        <div className="shrink-0">{statusTag}</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {listing.bidCount > 0 ? 'Highest bid' : 'Reserve'}
          </p>
          <p className={styles['price-display']}>
            {formatPaiseToINR(
              listing.bidCount > 0 ? listing.currentPricePaise : listing.reservePricePaise
            )}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {listing.bidCount} {listing.bidCount === 1 ? 'bid' : 'bids'}
            {listing.highestBidderName ? ` · ${listing.highestBidderName}` : ''}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {isLive ? 'Time remaining' : 'Closed'}
          </p>
          {isLive ? (
            <p className={`${styles['countdown']} ${ending ? styles['ending'] : ''}`}>
              <Time size={14} className="inline-block mr-1.5 -mt-0.5 opacity-60" aria-hidden />
              {remainingText}
            </p>
          ) : (
            <p className={styles['closed-date']}>
              <Time size={14} className="inline-block mr-1.5 -mt-0.5 opacity-60" aria-hidden />
              {closedDateText}
            </p>
          )}
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Storage: <strong className="text-slate-700">{formatPaiseToINR(listing.storageCostPaiseLive)}</strong>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <p className="text-[11px] text-slate-500 flex items-center gap-1 min-w-0">
          <Locked size={11} className="opacity-50 shrink-0" aria-hidden />
          <span className="font-mono text-slate-700 truncate">{listing.batchId}</span>
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
