// ============================================================
// SERVICE WORKER — offline fallback only.
// Doesn't cache the whole site, doesn't touch normal requests.
// Its one job: if a page navigation fails because there's no
// network, hand back offline.html instead of the browser's
// default "no internet" error screen.
// ============================================================

const CACHE_NAME = 'aa-offline-v1';
const OFFLINE_URL = 'offline.html';

function offlineUrl() {
    return new URL(OFFLINE_URL, self.location.origin + self.location.pathname).href;
}

function refreshOfflinePage() {
    return fetch(offlineUrl(), { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return caches.open(CACHE_NAME).then(cache => cache.put(offlineUrl(), response));
        })
        .catch(() => undefined);
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.add(offlineUrl()))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => refreshOfflinePage())
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only intervene on page navigations (clicking a link, typing a URL,
    // reloading) — everything else (CSS, JS, fonts, XHR) is left alone
    // and just fails normally if offline, which is fine.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then(response => {
                event.waitUntil(refreshOfflinePage());
                return response;
            }).catch(() => caches.match(offlineUrl()))
        );
    }
});