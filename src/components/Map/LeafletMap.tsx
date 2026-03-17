'use client';

/**
 * LeafletMap — inner component loaded only client-side (no SSR).
 *
 * Renders an OpenStreetMap tile layer with production cluster markers
 * for the Secretary GIS dashboard panel.
 *
 * Import via ProductionHeatMap (dynamic loader with ssr: false) — never
 * import this file directly in server components.
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import type { ProductionCluster } from '@/types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path issue in webpack bundlers
import L from 'leaflet';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LeafletMapProps {
  clusters: ProductionCluster[];
  /** Map center [lat, lng] */
  center: [number, number];
  zoom?: number;
}

/** Scale circle radius by production volume (min 12px, max 40px) */
function clusterRadius(productionKg: number, maxKg: number): number {
  const ratio = Math.sqrt(productionKg / maxKg);
  return 12 + ratio * 28;
}

/** Color scale: green (high) → amber (medium) → red (low) growth */
function clusterColor(growthPercent: number): string {
  if (growthPercent >= 15) return '#24a148';  // Carbon green-60
  if (growthPercent >= 5)  return '#f5a623';  // Honey amber
  return '#da1e28';                            // Carbon red-60
}

export default function LeafletMap({ clusters, center, zoom = 6 }: LeafletMapProps) {
  const maxKg = Math.max(...clusters.map((c) => c.productionKg), 1);

  // Suppress SSR hydration warnings from Leaflet injecting dynamic styles
  useEffect(() => {}, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      style={{ width: '100%', height: '100%', borderRadius: 0, background: '#f8f9fc' }}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />
      <ZoomControl position="bottomright" />
      {clusters.map((cluster) => {
        const radius  = clusterRadius(cluster.productionKg, maxKg);
        const color   = clusterColor(cluster.growthPercent);
        const growthSign = cluster.growthPercent > 0 ? '+' : '';
        return (
          <CircleMarker
            key={cluster.id}
            center={[cluster.lat, cluster.lng]}
            radius={radius}
            pathOptions={{
              fillColor:   color,
              fillOpacity: 0.75,
              color:       '#ffffff',
              weight:      2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'IBM Plex Sans, sans-serif' }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>{cluster.name}</p>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#525252', paddingBottom: 3 }}>Farmers</td>
                      <td style={{ fontWeight: 600, textAlign: 'right' }}>{cluster.farmerCount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#525252', paddingBottom: 3 }}>Production</td>
                      <td style={{ fontWeight: 600, textAlign: 'right' }}>{cluster.productionKg.toLocaleString('en-IN')} kg</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#525252', paddingBottom: 3 }}>Flora</td>
                      <td style={{ fontWeight: 600, textAlign: 'right' }}>{cluster.floraType}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#525252' }}>YoY Growth</td>
                      <td style={{ fontWeight: 700, color, textAlign: 'right' }}>
                        {growthSign}{cluster.growthPercent}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
