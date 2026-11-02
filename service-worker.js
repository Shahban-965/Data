/* ==========================================================================
   service-worker.js — optional offline cache for browser previews.
   The Windows portable build loads from file:// and does not need this.
   ========================================================================== */
var CACHE = 'atlas-v2';

var ASSETS = [
  './', './index.html', './manifest.json',
  './css/nova.css', './css/shell.css', './css/motion.css',
  './js/appearance.js', './js/gate.js', './js/motion.js',
  './vendor/motion/motion.js',
  './vendor/xlsx/xlsx.full.min.js', './vendor/xlsx/xlsx-js-style.min.js',
  './js/utils.js', './js/storage.js', './js/state.js', './js/toast.js',
  './js/modal.js', './js/validation.js', './js/ui.js', './js/activity-log.js',
  './js/schemas.js', './js/excel.js', './js/importer.js', './js/stock.js',
  './js/settings.js', './js/inventory.js', './js/staff.js', './js/maintenance.js',
  './js/store.js', './js/purchases.js', './js/dashboard.js', './js/reports.js',
  './js/archive.js', './js/backup.js', './js/search.js', './js/router.js',
  './js/seed-data.js', './js/app.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (url) {
      return c.add(url).catch(function () { /* ignore a single miss */ });
    }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.status === 200 && res.type === 'basic') {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html'); });
  }));
});
