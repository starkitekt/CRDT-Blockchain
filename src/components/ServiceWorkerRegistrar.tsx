'use client';

import { useEffect } from 'react';

/**
 * Registers the HoneyTRACE service worker (sw.js) and listens for
 * SYNC_COMPLETE messages to surface offline-sync success toasts.
 *
 * Mount once in the root layout (client-side only — no SSR impact).
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
      // Dev safety: remove previously installed SW/caches to avoid stale routing loops.
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});

      if ('caches' in window) {
        caches.keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((k) => k.startsWith('honeytrace-shell-') || k.startsWith('honeytrace-api-'))
                .map((k) => caches.delete(k))
            )
          )
          .catch(() => {});
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Request background-sync permission when online after offline period
        window.addEventListener('online', () => {
          if ('sync' in registration) {
            (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
              .sync.register('honeytrace-harvest-sync').catch(() => {});
          }
        });
      })
      .catch(() => {
        // SW registration is best-effort; app works without it
      });

    // Listen for sync-complete notifications from the SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'honeytrace:sync') {
        window.dispatchEvent(new CustomEvent('honeytrace:sync', { detail: event.data.message }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
