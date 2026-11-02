/* ==========================================================================
   backup.js — Backup & Restore page (JSON), import history, activity log
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;
  var ui = ITL.ui;

  var pages = ITL.pages = ITL.pages || {};
  var backup = ITL.backup = {};

  var APP_ID = 'itlab-management-system';

  function view() {
    return ITL.state.view('backup', {
      tab: 'backup',
      logSearch: '', page: 1, sortKey: 'timestamp', sortDir: 'desc',
      filters: { module: '', action: '' }
    });
  }

  /* ================================================================ PAGE */
  pages.backup = {
    title: 'Backup & Restore',

    render: function (root, params) {
      var v = view();
      if (params && params.tab) v.tab = params.tab;
      var counts = S.counts();
      var meta = S.get(K.meta) || {};
      var usage = S.usage();

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Backup &amp; Restore</div>' +
        '<div class="page-sub">Protect your local data and move it between computers</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="restore">' + ITL.icon('upload') + 'Import Full Backup</button>' +
        '<button class="btn btn-primary" data-action="backup">' + ITL.icon('save') + 'Export Full Backup</button>' +
        '</div></div>' +

        '<div class="alert alert-warn mb-4">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">Important — how offline storage works</div>' +
        'This application stores data in <b>this browser on this computer</b> using LocalStorage. There is no server and no cloud database, ' +
        'so data does <b>not</b> synchronise automatically to other machines. Clearing your browser data will erase it. ' +
        'Export a JSON backup regularly and keep it somewhere safe.</div></div>' +

        '<div class="card">' +
        '<div class="tabs" role="tablist">' +
        '<button class="tab' + (v.tab === 'backup' ? ' active' : '') + '" data-tab="backup" role="tab">' + ITL.icon('save') + 'Backup &amp; Restore</button>' +
        '<button class="tab' + (v.tab === 'activity' ? ' active' : '') + '" data-tab="activity" role="tab">' + ITL.icon('history') + 'Activity Log<span class="tab-count">' + counts.logs + '</span></button>' +
        '<button class="tab' + (v.tab === 'imports' ? ' active' : '') + '" data-tab="imports" role="tab">' + ITL.icon('upload') + 'Import History<span class="tab-count">' + counts.imports + '</span></button>' +
        '</div>' +
        '<div id="bkBody"></div></div>';

      renderBody(root);
      bind(root);
      void meta; void usage;
    }
  };

  function renderBody(root) {
    var v = view();
    var host = root.querySelector('#bkBody');
    if (v.tab === 'activity') { renderActivity(root, host); return; }
    if (v.tab === 'imports') { renderImports(root, host); return; }

    var counts = S.counts();
    var usage = S.usage();
    var meta = S.get(K.meta) || {};

    host.innerHTML = '<div class="card-body">' +
      '<div class="grid-2">' +

      '<div class="card"><div class="card-head">' +
      '<div class="modal-head-ico success">' + ITL.icon('download') + '</div>' +
      '<div><div class="card-title">Export full backup</div><div class="card-sub">Everything in one .json file</div></div></div>' +
      '<div class="card-body">' +
      '<p style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">' +
      'Creates a single JSON file containing every record, your settings, the activity log and import history, ' +
      'plus a schema version and record counts so it can be validated on restore.</p>' +
      ui.kv([
        ['PC records', U.fmtNum(counts.pcs)],
        ['Staff systems', U.fmtNum(counts.staff)],
        ['Maintenance records', U.fmtNum(counts.maintenance)],
        ['Store items', U.fmtNum(counts.store)],
        ['Stock transactions', U.fmtNum(counts.stockTx)],
        ['Purchase records', U.fmtNum(counts.purchases)],
        ['Activity log entries', U.fmtNum(counts.logs)],
        ['Approximate size', U.bytes(usage.bytes)]
      ]) +
      '<button class="btn btn-primary btn-block mt-4" data-action="backup">' + ITL.icon('save') + 'Export Full Backup (.json)</button>' +
      '<button class="btn btn-secondary btn-block mt-4" data-action="backup-excel">' + ITL.icon('excel') + 'Export everything to Excel instead</button>' +
      '</div></div>' +

      '<div class="card"><div class="card-head">' +
      '<div class="modal-head-ico warn">' + ITL.icon('upload') + '</div>' +
      '<div><div class="card-title">Import full backup</div><div class="card-sub">Restore from a .json backup file</div></div></div>' +
      '<div class="card-body">' +
      '<p style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">' +
      'The backup file is validated first and you get a full summary before anything changes. ' +
      'Choose <b>Merge</b> to add missing records without touching what you already have, or <b>Replace</b> to wipe and restore.</p>' +
      '<div class="stack-2 mt-4">' +
      '<div class="alert alert-info" style="font-size:12px">' + ITL.icon('info') +
      '<div class="alert-body"><b>Merge (default)</b> — keeps existing records, adds anything from the backup that is not already present.</div></div>' +
      '<div class="alert alert-danger" style="font-size:12px">' + ITL.icon('alert') +
      '<div class="alert-body"><b>Replace</b> — deletes all current data first. Requires typing REPLACE to confirm.</div></div>' +
      '</div>' +
      '<button class="btn btn-secondary btn-block mt-4" data-action="restore">' + ITL.icon('upload') + 'Choose backup file…</button>' +
      '</div></div>' +

      '</div>' +

      '<div class="divider-label">Local database</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-body">' +
      '<div class="' + (S.isAvailable() ? 'db-status' : 'db-status warn') + '">' +
      ITL.icon(S.isAvailable() ? 'checkCircle' : 'alert') +
      (S.isAvailable() ? 'LocalStorage active and writable' : 'LocalStorage unavailable') + '</div>' +
      '<div style="margin-top:14px">' +
      '<div class="row-2" style="justify-content:space-between;font-size:12.5px"><span class="muted">Storage used</span>' +
      '<b>' + U.bytes(usage.bytes) + ' / ~' + U.bytes(usage.quota) + '</b></div>' +
      '<div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:' + Math.max(1, usage.percent).toFixed(1) + '%;background:' +
      (usage.percent > 85 ? 'var(--danger-solid)' : usage.percent > 60 ? 'var(--warn-solid)' : 'var(--success-solid)') + '"></div></div>' +
      '</div>' +
      '<hr>' +
      ui.kv([
        ['Schema version', String(S.SCHEMA_VERSION)],
        ['Database created', meta.createdAt ? U.fmtDateTime(meta.createdAt) : '—'],
        ['Last write', meta.lastWrite ? U.fmtDateTime(meta.lastWrite) + ' (' + U.timeAgo(meta.lastWrite) + ')' : '—']
      ]) +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Danger zone</div></div>' +
      '<div class="card-body">' +
      '<div class="alert alert-danger">' + ITL.icon('alert') +
      '<div class="alert-body"><div class="alert-title">Clear all application data</div>' +
      'Permanently removes every record from this browser. Export a backup first — this cannot be undone.' +
      '<div style="margin-top:12px"><button class="btn btn-danger btn-sm" data-action="clear-all">' +
      ITL.icon('trash') + 'Clear all data</button></div></div></div>' +
      '</div></div>' +
      '</div></div>';
  }

  /* ------------------------------------------------------- activity log */
  function renderActivity(root, host) {
    var v = view();
    host.innerHTML =
      '<div class="toolbar">' +
      ui.searchInput(v.logSearch, 'Search activity…') +
      ui.selectFilter('module', 'Module', ITL.activity.modules(), v.filters.module) +
      ui.selectFilter('action', 'Action', ITL.activity.actions(), v.filters.action) +
      '<div class="toolbar-spacer"></div>' +
      '<button class="btn btn-excel btn-sm" data-action="export-log">' + ITL.icon('excel') + 'Download Excel</button>' +
      '<button class="btn btn-secondary btn-sm" data-action="clear-log">' + ITL.icon('trash') + 'Clear log</button>' +
      '</div><div id="logTable"></div>';

    var rows = ITL.activity.query({ module: v.filters.module, action: v.filters.action, search: v.logSearch });

    ui.renderTable({
      mount: host.querySelector('#logTable'),
      view: v,
      noun: 'log entry',
      totalUnfiltered: ITL.activity.list().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      columns: [
        { key: 'timestamp', label: 'Date & time', sortable: true, cls: 'cell-date', width: '160px', render: function (r) { return U.esc(U.fmtDate(r.date) + ' ' + r.time); } },
        { key: 'module', label: 'Module', sortable: true, width: '140px', render: function (r) { return ui.badge(r.module, 'neutral', true); } },
        {
          key: 'action', label: 'Action', sortable: true, width: '124px', render: function (r) {
            var s = ITL.activity.style(r.action);
            return ui.badge(r.action, s.tone);
          }
        },
        { key: 'recordId', label: 'Record', sortable: true, cls: 'cell-id', width: '130px' },
        { key: 'description', label: 'Description', sortable: true }
      ],
      empty: {
        icon: 'activity',
        title: 'No activity recorded',
        desc: 'Every create, update, delete, stock movement, import, export and backup is logged here automatically.'
      },
      onChange: function () { renderActivity(root, host); }
    });
  }

  /* ------------------------------------------------------ import history */
  function renderImports(root, host) {
    var rows = S.list(K.importHistory);
    var v = ITL.state.view('importHistory', { page: 1, sortKey: 'date', sortDir: 'desc' });

    host.innerHTML = '<div id="impTable"></div>';
    ui.renderTable({
      mount: host.querySelector('#impTable'),
      view: v,
      noun: 'import',
      rows: rows,
      rowId: function (r) { return r.id; },
      columns: [
        { key: 'date', label: 'Date & time', sortable: true, cls: 'cell-date', width: '170px', render: function (r) { return U.esc(U.fmtDateTime(r.date)); } },
        { key: 'module', label: 'Module', sortable: true, width: '150px', render: function (r) { return ui.badge(r.module, 'neutral', true); } },
        { key: 'fileName', label: 'File', sortable: true },
        { key: 'sheet', label: 'Sheet', sortable: true, width: '140px' },
        { key: 'detected', label: 'Detected', sortable: true, align: 'right', cls: 'cell-num', width: '92px' },
        { key: 'added', label: 'Added', sortable: true, align: 'right', cls: 'cell-num', width: '82px' },
        { key: 'updated', label: 'Updated', sortable: true, align: 'right', cls: 'cell-num', width: '90px' },
        { key: 'skipped', label: 'Skipped', sortable: true, align: 'right', cls: 'cell-num', width: '88px' },
        { key: 'mode', label: 'Mode', sortable: true, width: '96px' }
      ],
      empty: {
        icon: 'upload',
        title: 'No Excel imports yet',
        desc: 'Each import is recorded here with its file name, sheet and result counts.'
      },
      onChange: function () { renderImports(root, host); }
    });
  }

  /* ================================================================ BIND */
  function bind(root) {
    var v = view();

    U.on(root, 'click', '[data-tab]', function (e, el) {
      v.tab = el.getAttribute('data-tab');
      U.qsa('[data-tab]', root).forEach(function (t) { t.classList.remove('active'); });
      el.classList.add('active');
      renderBody(root);
    });

    U.on(root, 'input', '[data-search]', U.debounce(function (e, el) {
      v.logSearch = el.value; v.page = 1;
      renderActivity(root, root.querySelector('#bkBody'));
    }, 200));

    U.on(root, 'change', '[data-filter]', function (e, el) {
      v.filters[el.getAttribute('data-filter')] = el.value; v.page = 1;
      renderActivity(root, root.querySelector('#bkBody'));
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      switch (a) {
        case 'backup': backup.exportBackup(); break;
        case 'restore': backup.openRestore(); break;
        case 'backup-excel': backup.exportEverythingExcel(); break;
        case 'export-log': backup.exportLog(); break;
        case 'clear-log':
          ITL.modal.confirm({
            heading: 'Clear activity log',
            title: 'Delete all activity log entries?',
            message: 'Your records are not affected — only the audit trail is cleared.',
            tone: 'warn', confirmLabel: 'Clear log'
          }).then(function (ok) {
            if (!ok) return;
            ITL.activity.clear();
            ITL.toast.success('Activity log cleared');
            ITL.router.reload();
          });
          break;
        case 'clear-all':
          ITL.router.go('settings');
          setTimeout(function () {
            var btn = document.querySelector('[data-action="clear-all"]');
            if (btn) btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }, 200);
          ITL.toast.info('Danger zone', 'Use "Clear all data" at the bottom of Settings.');
          break;
      }
    });
  }

  /* ============================================================== EXPORT */
  backup.exportBackup = function () {
    return ITL.modal.withBusy('Creating backup…', 'Collecting all local data', function () {
      var counts = S.counts();
      var payload = {
        application: APP_ID,
        appName: 'Shakeel Networking',
        schemaVersion: S.SCHEMA_VERSION,
        backupDate: new Date().toISOString(),
        backupDateLocal: U.fmtDateTime(new Date()),
        recordCounts: counts,
        data: S.exportAll()
      };
      var json = JSON.stringify(payload, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var fname = 'IT_Lab_Full_Backup_' + U.stampDateTime() + '.json';
      U.downloadBlob(blob, fname);
      ITL.activity.log('Backup', 'Backup Created', '', 'Full JSON backup exported — ' + fname);
      ITL.toast.success('Backup created', fname + ' · ' + U.bytes(json.length));
      return fname;
    });
  };

  backup.exportLog = function () {
    var rows = ITL.activity.list();
    if (!rows.length) { ITL.toast.warn('Nothing to export', 'The activity log is empty.'); return; }
    ITL.modal.withBusy('Generating Excel…', 'Building the activity log report', function () {
      var name = ITL.excel.exportCollection({
        schemaId: 'logs', rows: rows, filenameBase: 'IT_Lab_Activity_Log', scope: 'All entries'
      });
      ITL.toast.success('Excel downloaded', name);
    });
  };

  /** Convenience: export every collection into one workbook. */
  backup.exportEverythingExcel = function () {
    if (ITL.reports && ITL.reports.completeReport) {
      ITL.router.go('reports');
      setTimeout(function () { ITL.reports.completeReport(); }, 250);
    }
  };

  /* ============================================================= RESTORE */
  backup.openRestore = function () {
    var state = { file: null, payload: null, mode: 'merge' };

    var m = ITL.modal.open({
      title: 'Import full backup',
      subtitle: 'Your backup is validated before anything changes',
      icon: 'upload',
      iconTone: 'warn',
      size: 'lg',
      body: pickBody(),
      footer: '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="bkPick">' + ITL.icon('folder') + 'Choose file</button>',
      onMount: function (el, api) { bindPick(el, api); }
    });

    function pickBody() {
      return '<div class="dropzone" id="bkDrop" tabindex="0" role="button">' +
        '<div class="dz-ico">' + ITL.icon('save') + '</div>' +
        '<div class="dz-title">Drop your .json backup here, or click to browse</div>' +
        '<div class="dz-sub">Only files created by this application can be restored</div>' +
        '</div>' +
        '<input type="file" id="bkFile" accept=".json,application/json" class="hidden">';
    }

    function bindPick(el, api) {
      var drop = el.querySelector('#bkDrop');
      var input = el.querySelector('#bkFile');
      var pick = el.querySelector('#bkPick');
      if (!drop) return;
      var choose = function () { input.click(); };
      drop.addEventListener('click', choose);
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      if (pick) pick.addEventListener('click', choose);
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); }); });
      drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) read(e.dataTransfer.files[0], api); });
      input.addEventListener('change', function () { if (input.files[0]) read(input.files[0], api); });
    }

    function read(file, api) {
      state.file = file;
      var fr = new FileReader();
      fr.onload = function (e) {
        var payload;
        try { payload = JSON.parse(e.target.result); }
        catch (err) { showError(api, 'This file is not valid JSON and cannot be read.'); return; }

        var check = validate(payload);
        if (!check.ok) { showError(api, check.message); return; }
        state.payload = payload;
        renderPreview(api);
      };
      fr.onerror = function () { showError(api, 'Could not read the selected file.'); };
      fr.readAsText(file);
    }

    function showError(api, msg) {
      api.setBody('<div class="alert alert-danger">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">Backup could not be validated</div>' + U.esc(msg) + '</div></div>');
      api.setFooter('<button type="button" class="btn btn-secondary" data-modal-close>Close</button>' +
        '<div style="flex:1"></div><button type="button" class="btn btn-primary" id="bkRetry">Try another file</button>');
      var r = api.el.querySelector('#bkRetry');
      if (r) r.addEventListener('click', function () { api.setBody(pickBody()); api.setFooter(footerPick()); bindPick(api.el, api); });
      U.qsa('[data-modal-close]', api.el).forEach(function (b) { b.addEventListener('click', function () { api.close(); }); });
    }

    function footerPick() {
      return '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="bkPick">' + ITL.icon('folder') + 'Choose file</button>';
    }

    function validate(p) {
      if (!p || typeof p !== 'object') return { ok: false, message: 'The file does not contain a backup object.' };
      if (!p.data || typeof p.data !== 'object') return { ok: false, message: 'The backup has no "data" section.' };
      var expected = [K.pcs, K.staff, K.maintenance, K.store, K.stockTx, K.purchases];
      var found = expected.filter(function (k) { return Array.isArray(p.data[k]); });
      if (!found.length) return { ok: false, message: 'No recognisable IT Lab collections were found in this file.' };
      if (p.application && p.application !== APP_ID) {
        return { ok: false, message: 'This backup was created by a different application (' + U.esc(p.application) + ').' };
      }
      return { ok: true };
    }

    function counts(p) {
      var d = p.data || {};
      return {
        pcs: (d[K.pcs] || []).length,
        staff: (d[K.staff] || []).length,
        maintenance: (d[K.maintenance] || []).length,
        store: (d[K.store] || []).length,
        stockTx: (d[K.stockTx] || []).length,
        purchases: (d[K.purchases] || []).length,
        logs: (d[K.logs] || []).length,
        imports: (d[K.importHistory] || []).length
      };
    }

    function renderPreview(api) {
      var p = state.payload;
      var bc = counts(p);
      var cur = S.counts();

      api.setBody(
        '<div class="alert alert-success">' + ITL.icon('checkCircle') +
        '<div class="alert-body"><div class="alert-title">Backup file is valid</div>' +
        U.esc(state.file.name) + ' · created ' +
        U.esc(p.backupDate ? U.fmtDateTime(p.backupDate) : 'unknown date') +
        ' · schema v' + U.esc(String(p.schemaVersion || '?')) + '</div></div>' +

        '<div class="divider-label">What this backup contains</div>' +
        '<div class="preview-scroll" style="max-height:none"><table class="data-table compact-table"><thead><tr>' +
        '<th>Collection</th><th style="text-align:right">In backup</th><th style="text-align:right">Currently stored</th>' +
        '</tr></thead><tbody>' +
        [
          ['PC records', bc.pcs, cur.pcs],
          ['Staff systems', bc.staff, cur.staff],
          ['Maintenance records', bc.maintenance, cur.maintenance],
          ['Store items', bc.store, cur.store],
          ['Stock transactions', bc.stockTx, cur.stockTx],
          ['Purchase records', bc.purchases, cur.purchases],
          ['Activity log entries', bc.logs, cur.logs],
          ['Import history', bc.imports, cur.imports]
        ].map(function (r) {
          return '<tr><td class="cell-primary">' + r[0] + '</td>' +
            '<td class="cell-num">' + U.fmtNum(r[1]) + '</td>' +
            '<td class="cell-num muted">' + U.fmtNum(r[2]) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +

        '<div class="divider-label">Restore mode</div>' +
        '<div class="stack-2">' +
        '<label class="check-card selected" data-rmode="merge"><input type="radio" name="rmode" value="merge" checked>' +
        '<span><div class="cc-title">Merge (recommended)</div>' +
        '<div class="cc-desc">Keeps everything you have now and adds records from the backup that are not already stored (matched by ID). Nothing is deleted.</div></span></label>' +
        '<label class="check-card" data-rmode="replace"><input type="radio" name="rmode" value="replace">' +
        '<span><div class="cc-title">Replace everything</div>' +
        '<div class="cc-desc">Deletes all current data and restores exactly what is in the backup. You will be asked to type REPLACE to confirm.</div></span></label>' +
        '</div>' +
        '<label class="check mt-4"><input type="checkbox" id="bkRestoreSettings" checked>' +
        '<span>Also restore application settings from this backup</span></label>'
      );

      api.setFooter(
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="bkGo">' + ITL.icon('rotate') + 'Restore backup</button>'
      );

      var el = api.el;
      U.qsa('[data-modal-close]', el).forEach(function (b) {
        if (!b._bd) { b._bd = 1; b.addEventListener('click', function () { api.close(); }); }
      });
      U.qsa('[data-rmode]', el).forEach(function (c) {
        c.addEventListener('click', function () {
          U.qsa('[data-rmode]', el).forEach(function (x) { x.classList.remove('selected'); });
          c.classList.add('selected');
          c.querySelector('input').checked = true;
          state.mode = c.getAttribute('data-rmode');
        });
      });
      el.querySelector('#bkGo').addEventListener('click', function () {
        var withSettings = el.querySelector('#bkRestoreSettings').checked;
        if (state.mode === 'replace') {
          ITL.modal.confirm({
            heading: 'Replace all data',
            title: 'This will delete everything currently stored',
            messageHtml: 'All ' + U.fmtNum(cur.pcs + cur.staff + cur.maintenance + cur.store + cur.stockTx + cur.purchases) +
              ' current records will be permanently deleted and replaced with the backup contents.<br><br>' +
              '<b>We strongly recommend exporting a backup of your current data first.</b>',
            tone: 'danger', requireText: 'REPLACE', confirmLabel: 'Replace all data'
          }).then(function (ok) { if (ok) doRestore(api, withSettings); });
        } else {
          doRestore(api, withSettings);
        }
      });
    }

    function doRestore(api, withSettings) {
      api.setBusy(true, 'Restoring…');
      setTimeout(function () {
        try {
          var p = state.payload;
          var d = p.data || {};
          var result = { added: 0, replaced: 0 };

          var collections = [K.pcs, K.staff, K.maintenance, K.store, K.stockTx, K.purchases, K.logs, K.importHistory];

          if (state.mode === 'replace') {
            collections.forEach(function (key) {
              var rows = Array.isArray(d[key]) ? d[key] : [];
              S.set(key, rows);
              result.replaced += rows.length;
            });
            var restoredMeta = S.get(K.meta) || {};
            delete restoredMeta.stockLedgerBaselineAt;
            S.set(K.meta, restoredMeta);
          } else {
            collections.forEach(function (key) {
              var incoming = Array.isArray(d[key]) ? d[key] : [];
              if (!incoming.length) return;
              var current = S.list(key);
              var seen = Object.create(null);
              current.forEach(function (r) { if (r && r.id) seen[String(r.id)] = 1; });
              var toAdd = incoming.filter(function (r) {
                if (!r || typeof r !== 'object') return false;
                if (r.id && seen[String(r.id)]) return false;
                if (r.id) seen[String(r.id)] = 1;
                return true;
              });
              if (toAdd.length) {
                S.set(key, current.concat(toAdd));
                result.added += toAdd.length;
              }
            });
          }

          if (withSettings && d[K.settings] && typeof d[K.settings] === 'object') {
            S.set(K.settings, Object.assign({}, S.defaults(K.settings), d[K.settings]));
            ITL.settings.applyTheme();
          }

          S.invalidate();
          S.validateAll();
          if (ITL.app && ITL.app.ensureOpeningStockLedger) ITL.app.ensureOpeningStockLedger();

          ITL.activity.log('Backup', 'Backup Restored', '',
            'Restored from ' + state.file.name + ' (' + state.mode + ') — ' +
            (state.mode === 'replace' ? result.replaced + ' records replaced' : result.added + ' records added'));

          api.setBusy(false);
          api.close();
          ITL.toast.success('Backup restored',
            state.mode === 'replace'
              ? U.fmtNum(result.replaced) + ' records restored (replace mode)'
              : U.fmtNum(result.added) + ' new records merged');
          ITL.app.refreshChrome();
          ITL.router.go('dashboard');
        } catch (err) {
          api.setBusy(false);
          console.error(err);
          ITL.toast.error('Restore failed', err.message || 'Unexpected error while restoring.');
        }
      }, 60);
    }
  };

})(window);
