/* ==========================================================================
   router.js — hash-based page router (works on file:// too)
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;

  var router = ITL.router = {};

  var ROUTES = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
    { id: 'inventory', label: 'PC Inventory', icon: 'desktop', section: 'Assets', count: function () { return ITL.data.pcs().length; } },
    { id: 'staff', label: 'Staff Systems', icon: 'users', section: 'Assets', count: function () { return ITL.data.staff().length; } },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench', section: 'Operations', count: function () { return ITL.data.maintenance().filter(function (m) { return m.status === 'Pending' || m.status === 'In Progress'; }).length; } },
    { id: 'archive', label: 'Monthly Archive', icon: 'archive', section: 'Operations' },
    { id: 'store', label: 'Store Inventory', icon: 'package', section: 'Operations', count: function () { return ITL.data.store().length; } },
    { id: 'purchases', label: 'Purchases', icon: 'cart', section: 'Operations', count: function () { return ITL.data.purchases().length; } },
    { id: 'reports', label: 'Reports', icon: 'chart', section: 'System' },
    { id: 'backup', label: 'Backup & Restore', icon: 'save', section: 'System' },
    { id: 'settings', label: 'Settings', icon: 'settings', section: 'System' }
  ];
  router.ROUTES = ROUTES;

  var lastParams = null;
  var mounting = false;
  var suppressHash = false;

  router.current = function () { return ITL.state.currentPage; };

  router.isRoute = function (id) {
    return ROUTES.some(function (r) { return r.id === id; });
  };

  /**
   * Navigate to a page. Renders immediately (so behaviour is identical
   * whether the hash changes or not) and keeps the URL hash in sync.
   * params are kept in memory, never written to the URL.
   */
  router.go = function (pageId, params) {
    if (!router.isRoute(pageId)) pageId = 'dashboard';
    lastParams = params || null;
    ITL.state.pageParams = lastParams;

    var target = '#/' + pageId;
    if (w.location.hash !== target) {
      suppressHash = true;                 // our own hash write, already handled
      try { w.location.hash = target; } catch (e) { /* ignore */ }
    }
    mount(pageId, lastParams);
    lastParams = null;
  };

  /** Re-render the current page keeping its params. */
  router.reload = function () {
    mount(ITL.state.currentPage || 'dashboard', ITL.state.pageParams);
  };

  router.init = function () {
    w.addEventListener('hashchange', function () {
      if (suppressHash) { suppressHash = false; return; }
      var id = w.location.hash.replace(/^#\/?/, '') || 'dashboard';
      mount(id, null);
    });
    var initial = w.location.hash.replace(/^#\/?/, '') || 'dashboard';
    if (!router.isRoute(initial)) initial = 'dashboard';
    mount(initial, null);
  };

  function mount(pageId, params) {
    if (mounting) return;
    if (!router.isRoute(pageId)) pageId = 'dashboard';
    var page = ITL.pages[pageId];
    var main = document.getElementById('appMain');
    if (!main) return;

    mounting = true;
    ITL.state.currentPage = pageId;
    ITL.state.pageParams = params || null;

    try {
      // close any transient UI
      if (ITL.search && ITL.search.close) ITL.search.close();

      var container = document.createElement('div');
      container.className = 'page';
      container.id = 'page-' + pageId;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', (page && page.title) || pageId);

      main.innerHTML = '';
      main.appendChild(container);
      main.scrollTop = 0;

      if (!page || typeof page.render !== 'function') {
        container.innerHTML = ITL.ui.emptyState({
          icon: 'alert', title: 'Page unavailable',
          desc: 'The module for "' + U.esc(pageId) + '" did not load correctly. Reload the page to try again.',
          actions: [{ label: 'Go to Dashboard', icon: 'dashboard', cls: 'btn-primary', action: 'router-home' }]
        });
        U.on(container, 'click', '[data-action="router-home"]', function () { router.go('dashboard'); });
      } else {
        page.render(container, params || null);
      }

      // transient params (open a record / highlight a row) must not repeat on reload
      if (params && (params.open || params.focus)) {
        var keep = {};
        Object.keys(params).forEach(function (k) {
          if (k !== 'open' && k !== 'focus') keep[k] = params[k];
        });
        ITL.state.pageParams = Object.keys(keep).length ? keep : null;
      }

      updateChrome(pageId);
      document.title = ((page && page.title) || 'Dashboard') + ' · ' + (ITL.settings.get().labName || 'IT Lab Management System');
    } catch (err) {
      console.error('[router] failed to render page "' + pageId + '"', err);
      main.innerHTML = '<div class="page"><div class="alert alert-danger">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">Something went wrong rendering this page</div>' +
        U.esc(err.message || String(err)) +
        '<div style="margin-top:12px"><button class="btn btn-secondary btn-sm" onclick="location.reload()">Reload application</button></div>' +
        '</div></div></div>';
      if (ITL.toast) ITL.toast.error('Page error', err.message || 'Unexpected error');
    } finally {
      mounting = false;
    }
  }

  function updateChrome(pageId) {
    var activeType = (ITL.state.views && ITL.state.views.reports) ? ITL.state.views.reports.type : null;
    U.qsa('.nav-item').forEach(function (el) {
      var rt = el.getAttribute('data-report-type');
      var active = rt ? (pageId === 'reports' && rt === activeType) : (el.getAttribute('data-page') === pageId);
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    // close mobile nav after navigating
    var shell = document.querySelector('.app-shell');
    if (shell) shell.classList.remove('mobile-nav-open');
  }
  router.updateChrome = updateChrome;

})(window);
