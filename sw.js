/**
 * Service Worker — enables offline play.
 * Caches all app files on install, serves from cache on fetch.
 */
const CACHE_NAME = 'my2048-v1';
const FILES = [
    '/',
    'index.html',
    'css/style.css',
    'js/game.js',
    'js/theme.js',
    'js/sound.js',
    'js/app.js',
    'manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
