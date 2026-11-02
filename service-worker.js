/* ==========================================================================
   service-worker.js — optional offline cache.
   The application works fully without this file (including on file://).
   Nothing in the app depends on the service worker being registered.
   ========================================================================== */
var CACHE = 'shakeel-v10';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/reset.css',
  './css/layout.css',
  './css/components.css',
  './css/tables.css',
  './css/forms.css',
  './css/modals.css',
  './css/dashboard.css',
  './css/responsive.css',
  './css/theme.css','./css/redesign.css','./css/fixes.css','./css/arrows.css',
  './js/gate.js',
  './js/motion-fx.js', './js/motion2.js','./js/arrows.js','./js/appearance.js',
  './vendor/motion/motion.js',
  './vendor/xlsx/xlsx.full.min.js',
  './vendor/xlsx/xlsx-js-style.min.js',
  './js/utils.js',
  './js/storage.js',
  './js/state.js',
  './js/toast.js',
  './js/modal.js',
  './js/validation.js',
  './js/ui.js',
  './js/activity-log.js',
  './js/schemas.js',
  './js/excel.js',
  './js/importer.js',
  './js/stock.js',
  './js/settings.js',
  './js/inventory.js',
  './js/staff.js',
  './js/maintenance.js',
  './js/store.js',
  './js/purchases.js',
  './js/dashboard.js',
  './js/reports.js',
  './js/backup.js',
  './js/search.js',
  './js/router.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll fails entirely if one file is missing; add individually instead
      return Promise.all(ASSETS.map(function (url) {
        return c.add(url).catch(function () { /* ignore a single miss */ });
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* network-first: always fresh when online, cache fallback when offline */
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html'); });
    })
  );
});
