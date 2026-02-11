self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    // Placeholder for future push notifications
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch handler needed for PWA criteria
    event.respondWith(fetch(event.request));
});
