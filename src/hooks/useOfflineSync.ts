'use client';

import { useEffect, useState } from 'react';

interface SyncNotification {
  id: number;
  message: string;
}

/**
 * Listens for `honeytrace:sync` custom events dispatched by the service
 * worker (via ServiceWorkerRegistrar) when offline harvest submissions
 * are successfully synced to the server.
 *
 * Returns a list of notifications so the consuming component can display
 * toast banners. Call `dismiss(id)` to remove one.
 */
export function useOfflineSync() {
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const { detail } = event as CustomEvent<string>;
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: detail ?? 'Offline harvest synced successfully.' },
      ]);
    };

    window.addEventListener('honeytrace:sync', handler);
    return () => window.removeEventListener('honeytrace:sync', handler);
  }, []);

  const dismiss = (id: number) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return { notifications, dismiss };
}
