/**
 * HoneyTRACE Service Worker
 *
 * Strategy:
 *  • App shell (pages, CSS, JS)  → Cache-first, update in background
 *  • GET /api/*                  → Network-first, fall back to cache
 *  • POST /api/batches (offline) → Queue in IndexedDB, replay via Background Sync
 *    On replay success           → postMessage 'honeytrace:sync' to all clients
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE   = `honeytrace-shell-${CACHE_VERSION}`;
const API_CACHE     = `honeytrace-api-${CACHE_VERSION}`;
const SYNC_TAG      = 'honeytrace-harvest-sync';
const IDB_DB        = 'honeytrace-offline';
const IDB_STORE     = 'pending-harvests';

// ── App-shell assets to pre-cache ────────────────────────────────────────────
const SHELL_ASSETS = [
  '/',
  '/en',
  '/en/dashboard/farmer',
  '/offline',
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {/* ignore pre-cache failures in dev */})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: prune stale caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: intercept requests ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // POST /api/batches: queue offline, replay on sync
  if (request.method === 'POST' && url.pathname === '/api/batches') {
    event.respondWith(handleOfflinePost(request));
    return;
  }

  // GET /api/*: network-first, cache fallback
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Everything else: cache-first (app shell)
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayPendingHarvests());
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: 'Offline', data: [] }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function handleOfflinePost(request) {
  try {
    // Try network first
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Queue for background sync
    const body = await request.json();
    await idbPut({ id: Date.now(), body, url: request.url, queuedAt: new Date().toISOString() });

    // Register background sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register(SYNC_TAG);
    }

    return new Response(
      JSON.stringify({ queued: true, message: 'Harvest saved offline. Will sync when online.' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function replayPendingHarvests() {
  const pending = await idbGetAll();
  for (const item of pending) {
    try {
      const response = await fetch(item.url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item.body),
      });
      if (response.ok) {
        await idbDelete(item.id);
        // Notify all clients
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({
            type:    'honeytrace:sync',
            message: `Offline harvest (${item.body?.floraType ?? 'batch'}) synced successfully.`,
          });
        }
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

// ── IndexedDB helpers (no idb lib required) ───────────────────────────────────

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(item);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
