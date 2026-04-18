'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  InlineNotification,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  SelectItem,
  TextArea,
  SkeletonText,
} from '@carbon/react';
import { Add, ShoppingCart, Renew } from '@carbon/icons-react';

import UnifiedDashboardLayout from '@/components/Navigation/UnifiedDashboardLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { batchesApi, marketplaceApi, ApiError, type MarketplaceListing } from '@/lib/api';
import type { Batch } from '@/types';
import ListingCard from '@/components/Marketplace/ListingCard';
import { formatPaiseToINR } from '@/components/Marketplace/format';

type TabKey = 'live' | 'mine' | 'settled';

const ELIGIBLE_BATCH_STATUSES = new Set(['certified', 'approved', 'in_warehouse', 'stored']);

export default function MarketplacePage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();

  const initialTab: TabKey = (() => {
    const t = searchParams?.get('tab');
    return t === 'settled' || t === 'mine' || t === 'live' ? (t as TabKey) : 'live';
  })();
  const [activeTab, setActiveTabState] = useState<TabKey>(initialTab);
  const setActiveTab = useCallback(
    (next: TabKey) => {
      setActiveTabState(next);
      const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (next === 'live') sp.delete('tab');
      else sp.set('tab', next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  // If the URL changes (e.g., via deep-link), keep our state in sync.
  useEffect(() => {
    const t = searchParams?.get('tab');
    const desired: TabKey = t === 'settled' || t === 'mine' || t === 'live' ? (t as TabKey) : 'live';
    setActiveTabState((prev) => (prev === desired ? prev : desired));
  }, [searchParams]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create-listing state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [eligibleBatches, setEligibleBatches] = useState<Batch[]>([]);
  const [createBatchId, setCreateBatchId] = useState('');
  const [createReserveRupees, setCreateReserveRupees] = useState<number>(5000);
  const [createIncrementRupees, setCreateIncrementRupees] = useState<number>(100);
  const [createDurationMin, setCreateDurationMin] = useState<number>(15);
  const [createNotes, setCreateNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isFarmer = user.role === 'farmer';
  const canBid = user.role === 'enterprise' || user.role === 'consumer' || user.role === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: 'live' | 'settled'; scope?: 'mine' } = {};
      if (activeTab === 'live') params.status = 'live';
      if (activeTab === 'settled') params.status = 'settled';
      if (activeTab === 'mine') params.scope = 'mine';
      const res = await marketplaceApi.list(params);
      setListings(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live polling on the live tab
  useEffect(() => {
    if (activeTab !== 'live') return;
    const id = window.setInterval(refresh, 7000);
    return () => window.clearInterval(id);
  }, [activeTab, refresh]);

  // Pre-load eligible batches when farmer opens "create listing"
  useEffect(() => {
    if (!isCreateOpen || !isFarmer || !user.userId) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await batchesApi.list({ farmerId: user.userId });
        const eligible = (Array.isArray(all) ? all : []).filter(
          (b) => ELIGIBLE_BATCH_STATUSES.has(String(b.status))
        );
        if (!cancelled) setEligibleBatches(eligible);
      } catch {
        if (!cancelled) setEligibleBatches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreateOpen, isFarmer, user.userId]);

  const handleCreateListing = async () => {
    if (!createBatchId) {
      setCreateError('Pick a batch.');
      return;
    }
    if (!Number.isFinite(createReserveRupees) || createReserveRupees <= 0) {
      setCreateError('Reserve price must be greater than zero.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await marketplaceApi.create({
        batchId: createBatchId,
        reservePricePaise: Math.round(createReserveRupees * 100),
        bidIncrementPaise: Math.max(100, Math.round(createIncrementRupees * 100)),
        durationMinutes: Math.max(1, Math.floor(createDurationMin)),
        notes: createNotes.trim() || undefined,
      });
      setIsCreateOpen(false);
      setCreateBatchId('');
      setCreateNotes('');
      setActiveTab('live');
      await refresh();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create listing');
    } finally {
      setCreateLoading(false);
    }
  };

  const stats = useMemo(() => {
    const live = listings.filter((l) => l.status === 'live');
    const totalKg = listings.reduce((s, l) => s + l.weightKg, 0);
    const totalValuePaise = listings.reduce(
      (s, l) => s + (l.bidCount > 0 ? l.currentPricePaise : l.reservePricePaise),
      0
    );
    const totalBids = listings.reduce((s, l) => s + l.bidCount, 0);
    return { liveCount: live.length, totalKg, totalValuePaise, totalBids };
  }, [listings]);

  const pageHeader = (
    <div className="page-header">
      <div className="page-header-lead">
        <div className="page-header-icon">
          <ShoppingCart size={26} />
        </div>
        <div className="page-header-text">
          <span className="page-header-eyebrow">Marketplace</span>
          <h1 className="page-header-title">Honey Marketplace</h1>
          <p className="page-header-subtitle">
            Live English auctions for certified honey batches. Storage cost is computed dynamically
            and deducted at settlement; the auction is anchored on Base Sepolia when it closes.
          </p>
        </div>
      </div>
      <div className="page-header-actions">
        <Button kind="ghost" size="md" renderIcon={Renew} onClick={refresh}>
          Refresh
        </Button>
        {isFarmer && (
          <Button
            kind="primary"
            size="md"
            renderIcon={Add}
            onClick={() => setIsCreateOpen(true)}
            data-testid="create-listing-button"
          >
            List a batch
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <UnifiedDashboardLayout header={pageHeader}>
      {error && (
        <InlineNotification kind="error" lowContrast title="Failed to load marketplace" subtitle={error} />
      )}

      {/* KPI strip — uses the unified .kpi-card / .kpi-card-* tokens. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-spacing-md">
        <div className="kpi-card kpi-card--accent-honey">
          <div className="kpi-card-body">
            <p className="kpi-card-label">Live auctions</p>
            <p className="kpi-card-value">{loading ? '—' : stats.liveCount}</p>
            <p className="kpi-card-meta">Real-time bidding</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <p className="kpi-card-label">Total bids</p>
            <p className="kpi-card-value">{loading ? '—' : stats.totalBids}</p>
            <p className="kpi-card-meta">Across visible listings</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <p className="kpi-card-label">Volume on offer</p>
            <p className="kpi-card-value">{loading ? '—' : `${stats.totalKg.toFixed(1)} kg`}</p>
            <p className="kpi-card-meta">Honey under hammer</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <p className="kpi-card-label">Indicative value</p>
            <p className="kpi-card-value">{loading ? '—' : formatPaiseToINR(stats.totalValuePaise)}</p>
            <p className="kpi-card-meta">Reserve + current bids</p>
          </div>
        </div>
      </div>

      <Tabs
        selectedIndex={activeTab === 'live' ? 0 : activeTab === 'mine' ? 1 : 2}
        onChange={({ selectedIndex }) =>
          setActiveTab(selectedIndex === 0 ? 'live' : selectedIndex === 1 ? 'mine' : 'settled')
        }
      >
        <TabList aria-label="Marketplace views" contained>
          <Tab>Live auctions</Tab>
          <Tab>{isFarmer ? 'My listings' : canBid ? 'My bids' : 'Mine'}</Tab>
          <Tab>Settled</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {activeTab === 'live' ? (
              <ListingsGrid listings={listings} loading={loading} locale={locale} emptyText="No live auctions yet — check back soon." />
            ) : null}
          </TabPanel>
          <TabPanel>
            {activeTab === 'mine' ? (
              <ListingsGrid
                listings={listings}
                loading={loading}
                locale={locale}
                emptyText={isFarmer ? 'You have not listed any batches yet.' : 'You have not bid on any listings yet.'}
              />
            ) : null}
          </TabPanel>
          <TabPanel>
            {activeTab === 'settled' ? (
              <ListingsGrid listings={listings} loading={loading} locale={locale} emptyText="No settled auctions yet." />
            ) : null}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        open={isCreateOpen}
        modalHeading="List a certified batch"
        modalLabel="Marketplace"
        primaryButtonText={createLoading ? 'Listing…' : 'Open auction'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createLoading}
        onRequestClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        onRequestSubmit={handleCreateListing}
        size="md"
      >
        <Stack gap={5}>
          <p className="cds-modal-desc">
            Choose one of your certified or warehouse-stored batches. Bidding starts immediately and runs for the duration you set.
          </p>
          <Select
            id="create-batch"
            data-testid="create-batch-select"
            labelText="Batch"
            value={createBatchId}
            onChange={(e) => setCreateBatchId(e.target.value)}
          >
            <SelectItem value="" text={eligibleBatches.length === 0 ? 'No eligible batches' : 'Select a batch'} />
            {eligibleBatches.map((b) => (
              <SelectItem
                key={b.batchId ?? b.id}
                value={b.batchId ?? b.id}
                text={`${b.batchId ?? b.id} · ${b.weightKg.toFixed(1)} kg · Grade ${b.grade} · ${b.floraType}`}
              />
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-spacing-md">
            <NumberInput
              id="create-reserve"
              data-testid="create-reserve"
              label="Reserve price (₹)"
              helperText="Minimum opening bid"
              min={1}
              step={50}
              value={createReserveRupees}
              onChange={(_e, { value }) => setCreateReserveRupees(Number(value ?? 0))}
            />
            <NumberInput
              id="create-increment"
              data-testid="create-increment"
              label="Bid increment (₹)"
              helperText="Minimum step between bids"
              min={1}
              step={10}
              value={createIncrementRupees}
              onChange={(_e, { value }) => setCreateIncrementRupees(Number(value ?? 0))}
            />
          </div>

          <NumberInput
            id="create-duration"
            data-testid="create-duration"
            label="Auction duration (minutes)"
            helperText="1 minute – 7 days. Anti-snipe extension adds 60s if a bid arrives in the final minute."
            min={1}
            max={60 * 24 * 7}
            step={5}
            value={createDurationMin}
            onChange={(_e, { value }) => setCreateDurationMin(Number(value ?? 0))}
          />

          <TextArea
            id="create-notes"
            data-testid="create-notes"
            labelText="Notes for buyers (optional)"
            placeholder="e.g. Cold-stored at 18°C, certified by Lab T-4521."
            value={createNotes}
            onChange={(e) => setCreateNotes(e.target.value)}
            rows={3}
          />

          {createError && (
            <InlineNotification kind="error" lowContrast title="Listing failed" subtitle={createError} hideCloseButton />
          )}
        </Stack>
      </Modal>
    </UnifiedDashboardLayout>
  );
}

function ListingsGrid({
  listings,
  loading,
  locale,
  emptyText,
}: {
  listings: MarketplaceListing[];
  loading: boolean;
  locale: string;
  emptyText: string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-spacing-md mt-spacing-md">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-card-body">
              <SkeletonText paragraph lineCount={4} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (listings.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-spacing-md mt-spacing-md" data-testid="listings-grid">
      {listings.map((listing) => (
        <ListingCard key={listing.listingId} listing={listing} locale={locale} />
      ))}
    </div>
  );
}
