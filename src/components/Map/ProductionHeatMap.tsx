'use client';

/**
 * ProductionHeatMap — dynamic wrapper that loads LeafletMap with ssr: false.
 *
 * Leaflet manipulates the DOM at import time and cannot run in Node.js
 * (Next.js SSR). This wrapper ensures it only loads in the browser.
 *
 * Usage:
 *   import ProductionHeatMap from '@/components/Map/ProductionHeatMap';
 *   <ProductionHeatMap clusters={...} center={[25.5, 80.0]} />
 */

import dynamic from 'next/dynamic';
import React from 'react';
import type { ProductionCluster } from '@/types';

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', color: '#da1e28', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', gap: 8 }}>
          Map failed to load — please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fc',
        color: '#8d8d8d',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      Loading map…
    </div>
  ),
});

interface ProductionHeatMapProps {
  clusters: ProductionCluster[];
  center?: [number, number];
  zoom?: number;
}

export default function ProductionHeatMap({
  clusters,
  center = [24.5, 81.0],   // Geographic centre of major honey belts (UP/Bihar/MP)
  zoom = 6,
}: ProductionHeatMapProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <MapErrorBoundary>
        <LeafletMap clusters={clusters} center={center} zoom={zoom} />
      </MapErrorBoundary>
    </div>
  );
}
