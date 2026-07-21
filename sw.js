const CACHE_STATIC = 'mares-static-v7';
const CACHE_API = 'mares-api-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => !k.startsWith('mares-')).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    const isAPI = url.hostname.includes('tideturtle') ||
                  url.hostname.includes('sunrise-sunset') ||
                  url.hostname.includes('marine-api.open-meteo') ||
                  url.hostname.includes('corsproxy.io');

    const isCDN = url.hostname.includes('cdnjs.cloudflare.com');

    if (isAPI) {
        event.respondWith(
            caches.open(CACHE_API).then(cache => {
                return cache.match(event.request).then(cached => {
                    const fetched = fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => cached);
                    return cached || fetched;
                });
            })
        );
        return;
    }

    if (isCDN) {
        event.respondWith(
            caches.open(CACHE_STATIC).then(cache => {
                return cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.open(CACHE_STATIC).then(cache => {
            return cache.match(event.request).then(cached => {
                const fetched = fetch(event.request).then(response => {
                    if (response.ok && event.request.method === 'GET') {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => cached);
                return cached || fetched;
            });
        })
    );
});
