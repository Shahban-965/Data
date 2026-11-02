/* ==========================================================================
   app.js — bootstrap: shell chrome, sidebar, header, keyboard shortcuts
   Loaded last. Everything else must already be defined.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  var app = ITL.app = {};
  var clockTimer = null;

  /* ================================================================ BOOT */
  app.boot = function () {
    try {
      if (!S.isAvailable()) {
        setTimeout(function () {
          ITL.toast.error('Storage unavailable',
            'LocalStorage is blocked in this browser (private mode?). Data will only last for this session.', 12000);
        }, 900);
      }

      var repairs = S.validateAll();
      if (repairs && repairs.length) {
        console.warn('[app] storage repairs:', repairs);
      }

      autoSeedIfEmpty();
      ensureOpeningStockLedger();

      ITL.settings.applyTheme();
      buildSidebar();
      bindHeader();
      bindShortcuts();
      startClock();
      ITL.search.init();
      ITL.router.init();
      app.refreshChrome();
      registerServiceWorker();

      ITL.state.booted = true;
      hideLoader();
    } catch (err) {
      console.error('[app] boot failed', err);
      hideLoader();
      var main = document.getElementById('appMain');
      if (main) {
        main.innerHTML = '<div class="page"><div class="alert alert-danger">' + ITL.icon('alert') +
          '<div class="alert-body"><div class="alert-title">The application failed to start</div>' +
          U.esc(err.message || String(err)) + '</div></div></div>';
      }
    }
  };

  /**
   * Loads js/seed-data.js (VIP IT Labs master report, converted) exactly
   * once, and only into a completely empty database — a fresh install.
   * If you already have any PCs, staff, maintenance, store or purchase
   * records, this does nothing and never touches your data.
   */
  function autoSeedIfEmpty() {
    try {
      var seed = w.ITL.SEED_BACKUP;
      if (!seed || !seed.data) return;

      var meta = S.get(K.meta) || {};
      if (meta.seededVIP && (meta.seedVersion || 1) >= (seed.seedVersion || 1)) return;

      var hasAny = S.list(K.pcs).length || S.list(K.staff).length ||
        S.list(K.maintenance).length || S.list(K.store).length ||
        S.list(K.purchases).length;

      if (hasAny) {
        /* v2: add any Excel-workbook records missing from existing data (never overwrites or deletes) */
        if ((meta.seedVersion || 1) < (seed.seedVersion || 1)) {
          var keyOf = {};
          keyOf[K.maintenance] = function (m) { return [m.complaintDate, m.pcName, m.problem].join('|').toLowerCase(); };
          keyOf[K.pcs] = function (m) { return [m.pcName, m.lab].join('|').toLowerCase(); };
          keyOf[K.staff] = function (m) { return String(m.pcName).toLowerCase(); };
          keyOf[K.store] = function (m) { return [m.itemName, m.category, m.condition].join('|').toLowerCase(); };
          keyOf[K.purchases] = function (m) { return [m.purchaseDate, m.item, m.quantity].join('|').toLowerCase(); };
          var prefix = {}; prefix[K.maintenance] = 'MNT'; prefix[K.pcs] = 'PC'; prefix[K.staff] = 'STF'; prefix[K.store] = 'ITM'; prefix[K.purchases] = 'PUR';
          var added = 0;
          Object.keys(keyOf).forEach(function (k) {
            var cur = S.list(k), src = seed.data[k] || [], seen = {}, used = {};
            cur.forEach(function (r) { seen[keyOf[k](r)] = 1; used[r.id] = 1; });
            var n = 0;
            src.forEach(function (r) {
              if (seen[keyOf[k](r)]) return;
              var rec = JSON.parse(JSON.stringify(r));
              while (used[rec.id]) { n++; rec.id = prefix[k] + '-' + ('0000' + (cur.length + n + 100)).slice(-4); }
              used[rec.id] = 1; cur.push(rec); added++;
            });
            S.set(k, cur);
          });
          meta.seedVersion = seed.seedVersion || 1; meta.seededVIP = true; S.set(K.meta, meta); S.invalidate();
          if (added && ITL.activity && ITL.activity.log) ITL.activity.log('Backup', 'Excel Data Synced', '', added + ' records from the VIP IT Labs workbook were added (existing data untouched).');
          return;
        }
        meta.seededVIP = true;
        S.set(K.meta, meta);
        return;
      }

      var d = seed.data;
      if (Array.isArray(d[K.pcs])) S.set(K.pcs, d[K.pcs]);
      if (Array.isArray(d[K.staff])) S.set(K.staff, d[K.staff]);
      if (Array.isArray(d[K.maintenance])) S.set(K.maintenance, d[K.maintenance]);
      if (Array.isArray(d[K.store])) S.set(K.store, d[K.store]);
      if (Array.isArray(d[K.stockTx])) S.set(K.stockTx, d[K.stockTx]);
      if (Array.isArray(d[K.purchases])) S.set(K.purchases, d[K.purchases]);

      meta.seededVIP = true; meta.seedVersion = seed.seedVersion || 1;
      S.set(K.meta, meta);
      S.invalidate();

      if (ITL.activity && ITL.activity.log) {
        ITL.activity.log('Backup', 'Initial Data Loaded', '',
          'VIP IT Labs master report data auto-loaded on first run (' +
          (d[K.pcs] || []).length + ' PCs, ' + (d[K.staff] || []).length + ' staff, ' +
          (d[K.maintenance] || []).length + ' maintenance, ' + (d[K.store] || []).length +
          ' store items, ' + (d[K.purchases] || []).length + ' purchases).');
      }
    } catch (err) {
      console.error('[app] auto-seed failed', err);
    }
  }


  /**
   * Older releases shipped current store quantities without a movement ledger.
   * Establish a clearly-labelled opening baseline once; never guess historical
   * repairs or purchases and never change the actual on-hand quantities.
   */
  function ensureOpeningStockLedger() {
    try {
      var meta = S.get(K.meta) || {};
      var items = S.list(K.store);
      if (meta.stockLedgerBaselineAt || !items.length || S.list(K.stockTx).length) return;
      var baselineDate = U.today();
      var entries = items.filter(function (it) { return U.int(it.quantity, 0) > 0; }).map(function (it) {
        return ITL.factory.stockTx({
          itemId: it.id, itemName: it.itemName, type: 'Adjustment',
          quantity: U.int(it.quantity, 0), prevQty: 0, newQty: U.int(it.quantity, 0),
          reason: 'Opening balance baseline', date: baselineDate,
          remarks: 'Legacy stock balance captured during portable edition setup. Earlier movement history was not available.'
        });
      });
      if (entries.length) S.insertMany(K.stockTx, entries);
      meta.stockLedgerBaselineAt = new Date().toISOString();
      S.set(K.meta, meta);
      if (ITL.activity && ITL.activity.log) ITL.activity.log('Store', 'Opening Balance Created', '',
        entries.length + ' opening stock balances recorded. Historical movements before this date are unavailable.');
    } catch (err) { console.error('[app] opening stock ledger setup failed', err); }
  }
  app.ensureOpeningStockLedger = ensureOpeningStockLedger;

  function hideLoader() {
    var loader = document.getElementById('appLoader');
    if (!loader) return;
    loader.classList.add('done');
    setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 120);
  }

  /* ============================================================= SIDEBAR */
  function buildSidebar() {
    var nav = document.getElementById('navList');
    if (!nav) return;
    var sections = [];
    ITL.router.ROUTES.forEach(function (r) {
      if (r.id === 'reports') return; // Reports gets its own expanded section below, one row per report type
      var sec = sections.filter(function (s) { return s.name === r.section; })[0];
      if (!sec) { sec = { name: r.section, items: [] }; sections.push(sec); }
      sec.items.push(r);
    });

    var reportsHtml = '';
    if (ITL.reports && ITL.reports.TYPES) {
      reportsHtml = '<div class="nav-section">' +
        '<div class="nav-section-title">Reports</div>' +
        ITL.reports.TYPES.map(function (t) {
          return '<a href="#/reports" class="nav-item" data-page="reports" data-report-type="' + U.escAttr(t.id) + '" data-tip="' + U.escAttr(t.label) + '">' +
            '<span class="nav-ico">' + ITL.icon(t.icon) + '</span>' +
            '<span class="nav-label">' + U.esc(t.label) + '</span>' +
            '</a>';
        }).join('') +
        '</div>';
    }

    nav.innerHTML = sections.map(function (sec) {
      return '<div class="nav-section">' +
        '<div class="nav-section-title">' + U.esc(sec.name) + '</div>' +
        sec.items.map(function (r) {
          return '<a href="#/' + r.id + '" class="nav-item" data-page="' + r.id + '" data-tip="' + U.escAttr(r.label) + '">' +
            '<span class="nav-ico">' + ITL.icon(r.icon) + '</span>' +
            '<span class="nav-label">' + U.esc(r.label) + '</span>' +
            (r.count ? '<span class="nav-count" data-count="' + r.id + '">0</span>' : '') +
            '</a>';
        }).join('') +
        '</div>';
    }).join('') + reportsHtml;

    U.on(nav, 'click', '[data-report-type]', function (e, el) {
      e.preventDefault();
      ITL.router.go('reports', { type: el.getAttribute('data-report-type') });
    });

    // restore collapsed state
    var uiState = S.get(K.ui) || {};
    if (uiState.sidebarCollapsed) document.querySelector('.app-shell').classList.add('sidebar-collapsed');
  }

  /** Refresh sidebar counters, storage meter, brand text and header identity. */
  app.refreshChrome = function () {
    var s = ITL.settings.get();

    ITL.router.ROUTES.forEach(function (r) {
      if (!r.count) return;
      var el = document.querySelector('[data-count="' + r.id + '"]');
      if (!el) return;
      var n = 0;
      try { n = r.count(); } catch (e) { n = 0; }
      el.textContent = U.fmtNum(n);
      el.classList.toggle('hidden', !n);
      if (r.id === 'maintenance') el.classList.toggle('warn', n > 0);
    });

    var usage = S.usage();
    var fill = document.querySelector('.sm-fill');
    var label = document.querySelector('.sm-value');
    if (fill) {
      fill.style.width = Math.max(1, Math.min(100, usage.percent)).toFixed(1) + '%';
      fill.style.background = usage.percent > 85 ? 'var(--danger-solid)' : usage.percent > 60 ? 'var(--warn-solid)' : '';
    }
    if (label) label.textContent = S.isPortable() ? ('JSON · ' + U.bytes(usage.bytes)) : U.bytes(usage.bytes);
    var meter = document.querySelector('.storage-meter');
    if (meter && S.isPortable()) meter.title = 'Portable JSON database · ' + S.dataFolder();

    var bn = document.querySelector('.brand-name');
    if (bn) bn.textContent = s.brandName || 'Shakeel Networking';
    var bs = document.querySelector('.brand-sub');
    if (bs) bs.textContent = 'Management System';

    var an = document.getElementById('profileName');
    if (an) an.textContent = (s.adminName || 'Shakeel Ahmed');
    var ar = document.getElementById('profileRole');
    if (ar) ar.textContent = (s.adminRole || 'Admin');
    var av = document.getElementById('profileAvatar');
    if (av) av.textContent = U.initials((s.adminName || 'Shakeel Ahmed'));

    var alertBadge = document.getElementById('alertCount');
    if (alertBadge) {
      var n2 = ITL.data.alerts().length;
      alertBadge.textContent = n2 > 99 ? '99+' : String(n2);
      alertBadge.classList.toggle('hidden', !n2);
    }
  };

  /* ============================================================== HEADER */
  function bindHeader() {
    var shell = document.querySelector('.app-shell');

    var toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.addEventListener('click', function () {
      if (w.innerWidth <= 900) {
        shell.classList.toggle('mobile-nav-open');
      } else {
        shell.classList.toggle('sidebar-collapsed');
        S.update(K.ui, { sidebarCollapsed: shell.classList.contains('sidebar-collapsed') });
      }
    });

    var backdrop = document.querySelector('.sidebar-backdrop');
    if (backdrop) backdrop.addEventListener('click', function () { shell.classList.remove('mobile-nav-open'); });

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', function () { ITL.settings.toggleTheme(); });

    var openDataFolder = document.getElementById('openDataFolder');
    if (openDataFolder) openDataFolder.addEventListener('click', function () {
      if (S.isPortable()) S.openDataFolder();
      else ITL.toast.info('Browser preview', 'The DATA folder is available in the Windows portable desktop build.');
    });
    var createDataBackup = document.getElementById('createDataBackup');
    if (createDataBackup) createDataBackup.addEventListener('click', function () {
      if (!S.isPortable()) { ITL.backup.exportBackup(); return; }
      var result = S.backupNow();
      if (result && result.ok) ITL.toast.success('Safety backup created', 'A complete JSON snapshot has been saved in DATA/backup.');
      else ITL.toast.error('Backup failed', result && result.error ? result.error : 'Could not create backup.');
    });

    /* --- alerts dropdown --- */
    var alertBtn = document.getElementById('alertsBtn');
    var alertPanel = document.getElementById('alertsPanel');
    if (alertBtn && alertPanel) {
      alertBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = alertPanel.classList.toggle('open');
        alertBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) renderAlertsPanel(alertPanel);
        closeOther(alertPanel);
      });
    }

    /* --- profile dropdown --- */
    var profBtn = document.getElementById('profileBtn');
    var profPanel = document.getElementById('profilePanel');
    if (profBtn && profPanel) {
      profBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = profPanel.classList.toggle('open');
        profBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        closeOther(profPanel);
      });
      U.on(profPanel, 'click', '[data-go]', function (e, el) {
        profPanel.classList.remove('open');
        var t = el.getAttribute('data-go');
        if (t === 'backup') ITL.backup.exportBackup();
        else ITL.router.go(t);
      });
    }

    document.addEventListener('click', function () {
      U.qsa('.dropdown-panel.open').forEach(function (p) { p.classList.remove('open'); });
      U.qsa('[aria-expanded="true"]').forEach(function (b) {
        if (b.id === 'alertsBtn' || b.id === 'profileBtn') b.setAttribute('aria-expanded', 'false');
      });
    });
    U.qsa('.dropdown-panel').forEach(function (p) {
      p.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    function closeOther(keep) {
      U.qsa('.dropdown-panel.open').forEach(function (p) { if (p !== keep) p.classList.remove('open'); });
    }

    /* --- quick add --- */
    var quick = document.getElementById('quickAddBtn');
    if (quick) quick.addEventListener('click', function () { openQuickAdd(); });
  }

  function renderAlertsPanel(panel) {
    var alerts = ITL.data.alerts(12);
    var body = panel.querySelector('.dropdown-body');
    if (!body) return;
    if (!alerts.length) {
      body.innerHTML = '<div class="dd-empty">' + ITL.icon('checkCircle') +
        '<div><b>All clear</b><div class="muted" style="font-size:12px">No faulty PCs, pending maintenance or low stock.</div></div></div>';
      return;
    }
    var tones = { danger: 'var(--danger-fg)', warn: 'var(--warn-fg)', info: 'var(--info-fg)' };
    body.innerHTML = alerts.map(function (a) {
      return '<button type="button" class="dd-item" data-alert="' +
        U.escAttr(JSON.stringify({ page: a.page, id: a.recordId })) + '">' +
        '<span class="dd-ico" style="color:' + (tones[a.tone] || tones.info) + '">' + ITL.icon(a.icon) + '</span>' +
        '<span class="dd-body"><span class="dd-title">' + U.esc(a.title) + ' · ' + U.esc(a.name) + '</span>' +
        '<span class="dd-sub">' + U.esc(a.desc) + '</span></span></button>';
    }).join('');
    U.on(body, 'click', '[data-alert]', function (e, el) {
      var d;
      try { d = JSON.parse(el.getAttribute('data-alert')); } catch (x) { return; }
      panel.classList.remove('open');
      ITL.router.go(d.page, { open: d.id, focus: d.id });
    });
  }

  function openQuickAdd() {
    var actions = [
      { label: 'Add PC', desc: 'Register a lab computer', icon: 'desktop', fn: function () { ITL.inventory.openForm(); } },
      { label: 'Report Fault', desc: 'Log a maintenance complaint', icon: 'wrench', fn: function () { ITL.maintenance.openForm(); } },
      { label: 'Add Staff System', desc: 'Computer assigned to staff', icon: 'users', fn: function () { ITL.staffPage.openForm(); } },
      { label: 'Add Store Item', desc: 'New spare part or consumable', icon: 'package', fn: function () { ITL.store.openForm(); } },
      { label: 'Add Stock', desc: 'Increase a store quantity', icon: 'plusCircle', fn: function () { ITL.stock.openModal('Stock In', null, function () { ITL.router.reload(); }); } },
      { label: 'Record Purchase', desc: 'Log a procurement record', icon: 'cart', fn: function () { ITL.purchases.openForm(); } }
    ];

    ITL.modal.open({
      title: 'Quick add',
      subtitle: 'What would you like to create?',
      icon: 'plus',
      size: 'sm',
      body: '<div class="stack-2">' + actions.map(function (a, i) {
        return '<button type="button" class="report-card" data-qa="' + i + '">' +
          '<span class="rc-ico">' + ITL.icon(a.icon) + '</span>' +
          '<span><span class="rc-title">' + U.esc(a.label) + '</span>' +
          '<div class="rc-desc">' + U.esc(a.desc) + '</div></span></button>';
      }).join('') + '</div>',
      footer: '<div style="flex:1"></div><button type="button" class="btn btn-secondary" data-modal-close>Close</button>',
      onMount: function (el, api) {
        U.on(el, 'click', '[data-qa]', function (e, b) {
          var i = U.int(b.getAttribute('data-qa'), -1);
          api.close();
          if (actions[i]) setTimeout(actions[i].fn, 60);
        });
      }
    });
  }

  /* =============================================================== CLOCK */
  function startClock() {
    var timeEl = document.querySelector('.hc-time');
    var dateEl = document.querySelector('.hc-date');
    if (!timeEl && !dateEl) return;
    var tick = function () {
      var now = new Date();
      if (timeEl) timeEl.textContent = U.fmtTime(now);
      if (dateEl) dateEl.textContent = U.fmtDate(now, 'dd-MMM-yyyy');
    };
    tick();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000 * 20);
  }

  /* =========================================================== SHORTCUTS */
  function bindShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      var mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        ITL.backup.exportBackup();
        return;
      }
      if (typing || ITL.modal.isOpen()) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); showShortcuts(); return; }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openQuickAdd(); return; }

      var map = { '1': 'dashboard', '2': 'inventory', '3': 'staff', '4': 'maintenance', '5': 'store', '6': 'purchases', '7': 'reports', '8': 'backup', '9': 'settings' };
      if (map[e.key]) { e.preventDefault(); ITL.router.go(map[e.key]); }
    });
  }

  function showShortcuts() {
    var rows = [
      ['Ctrl / Cmd + K', 'Focus global search'],
      ['Ctrl / Cmd + S', 'Export a full JSON backup'],
      ['N', 'Quick add menu'],
      ['1 – 9', 'Jump to a page'],
      ['↑ ↓ + Enter', 'Navigate search results'],
      ['Esc', 'Close the top dialog']
    ];
    ITL.modal.open({
      title: 'Keyboard shortcuts',
      icon: 'zap',
      size: 'sm',
      body: '<div class="kv-list">' + rows.map(function (r) {
        return '<div class="kv-row"><div class="kv-k"><kbd>' + U.esc(r[0]) + '</kbd></div>' +
          '<div class="kv-v">' + U.esc(r[1]) + '</div></div>';
      }).join('') + '</div>',
      footer: '<div style="flex:1"></div><button type="button" class="btn btn-primary" data-primary data-modal-close>Got it</button>'
    });
  }

  /* ====================================================== SERVICE WORKER */
  function registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (w.location.protocol === 'file:') return;   // not supported, and not needed
      navigator.serviceWorker.register('service-worker.js').catch(function (err) {
        console.info('[app] service worker not registered (this is fine):', err && err.message);
      });
    } catch (e) {
      console.info('[app] service worker unavailable (this is fine)');
    }
  }

  /* ================================================================ INIT */
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    // guard: report a clear message if a module failed to load
    var required = ['utils', 'storage', 'state', 'toast', 'modal', 'validation', 'ui',
      'activity', 'schemas', 'excel', 'importer', 'stock', 'settings', 'inventory',
      'staffPage', 'maintenance', 'store', 'purchases', 'dashboard', 'reports',
      'backup', 'search', 'router'];
    var missing = required.filter(function (k) { return !ITL[k]; });
    if (missing.length) {
      var loader = document.getElementById('appLoader');
      if (loader) {
        loader.innerHTML = '<div class="boot"><div class="boot-title" style="color:#fca5a5">Failed to load</div>' +
          '<div class="boot-msg">Missing modules: ' + missing.join(', ') + '</div></div>';
      }
      console.error('[app] missing modules:', missing);
      return;
    }
    app.boot();
  });

  w.addEventListener('error', function (e) {
    if (!ITL.state || !ITL.state.booted) return;
    console.error('[app] uncaught error', e.error || e.message);
  });

})(window);
