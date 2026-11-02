/* ==========================================================================
   settings.js — application settings accessor + Settings page
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  var set = ITL.settings = {

    get: function () {
      var v = S.get(K.settings);
      return v && typeof v === 'object' ? v : S.defaults(K.settings);
    },

    save: function (patch) {
      var next = S.update(K.settings, patch);
      set.applyTheme();
      return next;
    },

    reset: function () {
      S.set(K.settings, S.defaults(K.settings));
      set.applyTheme();
    },

    applyTheme: function () {
      document.documentElement.setAttribute('data-theme', 'dark'); // single theme: dark
    },

    toggleTheme: function () { /* single dark theme */ }
  };

  /* ============================================================== PAGE */
  var page = ITL.pages = ITL.pages || {};

  page.settings = {
    title: 'Settings',
    subtitle: 'Configure the application, review local storage and manage your data',

    render: function (root) {
      var s = set.get();
      var counts = S.counts();
      var usage = S.usage();

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Settings</div>' +
        '<div class="page-sub">Configure the application, review local storage and manage your data</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="reset-settings">' + ITL.icon('rotate') + 'Restore defaults</button>' +
        '<button class="btn btn-primary" data-action="save-settings">' + ITL.icon('check') + 'Save changes</button>' +
        '</div></div>' +

        '<div class="grid-main-side">' +
        '<div class="stack-4">' +

        /* ---- General ---- */
        '<div class="card"><div class="card-head">' +
        '<div><div class="card-title">General</div><div class="card-sub">Organisation and lab configuration</div></div></div>' +
        '<div class="card-body"><form id="settingsForm"><div class="form-grid">' +
        '<div class="field"><label for="setOrg">Organisation name</label>' +
        '<input type="text" id="setOrg" name="orgName" value="' + U.escAttr(s.orgName) + '" placeholder="e.g. VIP IT Labs">' +
        '<div class="help-text">Appears on the header row of every Excel report.</div></div>' +

        '<div class="field"><label for="setLabName">IT Lab / application name</label>' +
        '<input type="text" id="setLabName" name="labName" value="' + U.escAttr(s.labName) + '">' +
        '<div class="help-text">Shown in the browser tab title and the dashboard welcome.</div></div>' +

        '<div class="field"><label for="setBrand">Sidebar title</label>' +
        '<input type="text" id="setBrand" name="brandName" value="' + U.escAttr(s.brandName || 'Shakeel Networking') + '" placeholder="e.g. Shakeel Networking">' +
        '<div class="help-text">Name shown at the top of the left sidebar.</div></div>' +

        '<div class="field"><label for="setLabs">Labs (comma separated)</label>' +
        '<input type="text" id="setLabs" name="labs" value="' + U.escAttr((s.labs || []).join(', ')) + '" placeholder="Lab 1, Lab 2, Lab 3">' +
        '<div class="help-text">Used by PC Inventory tabs, filters and reports.</div></div>' +

        '<div class="field"><label for="setDefaultLab">Default lab</label>' +
        '<select id="setDefaultLab" name="defaultLab">' + ITL.ui.options(s.labs || [], s.defaultLab) + '</select>' +
        '<div class="help-text">Pre-selected when adding a new PC.</div></div>' +

        '<div class="field"><label for="setAdmin">Administrator name</label>' +
        '<input type="text" id="setAdmin" name="adminName" value="' + U.escAttr(s.adminName) + '"></div>' +

        '<div class="field"><label for="setRole">Administrator role</label>' +
        '<input type="text" id="setRole" name="adminRole" value="' + U.escAttr(s.adminRole) + '"></div>' +
        '</div></form></div></div>' +

        /* ---- Preferences ---- */
        '<div class="card"><div class="card-head">' +
        '<div><div class="card-title">Application preferences</div><div class="card-sub">Defaults used across every page</div></div></div>' +
        '<div class="card-body"><div class="form-grid">' +
        '<div class="field"><label for="setLowStock">Low stock threshold</label>' +
        '<input type="number" id="setLowStock" name="lowStockThreshold" min="0" step="1" value="' + U.escAttr(s.lowStockThreshold) + '" form="settingsForm">' +
        '<div class="help-text">Default minimum level for new store items. Items at or below their own minimum are flagged Low Stock.</div></div>' +

        '<div class="field"><label for="setDateFmt">Date format</label>' +
        '<select id="setDateFmt" name="dateFormat" form="settingsForm">' +
        ITL.ui.options([
          { value: 'dd-MMM-yyyy', label: 'dd-MMM-yyyy  (06-Sep-2026)' },
          { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy  (06/09/2026)' },
          { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy  (09/06/2026)' },
          { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd  (2026-09-06)' }
        ], s.dateFormat) + '</select></div>' +

        '<div class="field"><label for="setPageSize">Default table page size</label>' +
        '<select id="setPageSize" name="tablePageSize" form="settingsForm">' +
        ITL.ui.options(ITL.constants.PAGE_SIZES, s.tablePageSize) + '</select></div>' +

        '</div>' +

        '<div class="divider-label">Export preferences</div>' +
        '<div class="stack-3">' +
        '<label class="check"><input type="checkbox" name="exportIncludeTimestamps" form="settingsForm"' + (s.exportIncludeTimestamps !== false ? ' checked' : '') + '>' +
        '<span><b>Include Created / Updated columns</b><div class="help-text">Adds audit timestamps to every Excel export.</div></span></label>' +

        '<label class="check"><input type="checkbox" name="exportIncludePasswords" form="settingsForm"' + (s.exportIncludePasswords ? ' checked' : '') + '>' +
        '<span><b>Include password columns in Excel exports</b><div class="help-text">Off by default. Passwords are never sent anywhere — they stay in this browser.</div></span></label>' +

        '<label class="check"><input type="checkbox" name="confirmDeletes" form="settingsForm"' + (s.confirmDeletes !== false ? ' checked' : '') + '>' +
        '<span><b>Always confirm before deleting a record</b></span></label>' +
        '</div>' +

        '<div class="field mt-4"><label for="setScope">Default Excel export scope</label>' +
        '<select id="setScope" name="exportDefaultScope" form="settingsForm" style="max-width:280px">' +
        ITL.ui.options([
          { value: 'filtered', label: 'Current filtered records' },
          { value: 'all', label: 'All records' }
        ], s.exportDefaultScope) + '</select></div>' +
        '</div></div>' +

        /* ---- Data management ---- */
        '<div class="card"><div class="card-head">' +
        '<div><div class="card-title">Data management</div><div class="card-sub">Backup, restore and destructive operations</div></div></div>' +
        '<div class="card-body">' +
        '<div class="row-2">' +
        '<button class="btn btn-primary" data-action="backup-now">' + ITL.icon('save') + 'Export full backup</button>' +
        '<button class="btn btn-secondary" data-action="restore-now">' + ITL.icon('upload') + 'Import backup</button>' +
        '<button class="btn btn-secondary" data-action="goto-backup">' + ITL.icon('externalLink') + 'Open Backup &amp; Restore</button>' +
        '</div>' +
        '<hr>' +
        '<div class="alert alert-danger">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">Danger zone</div>' +
        'Clearing data permanently removes every PC, staff system, maintenance record, store item, transaction and purchase from this browser. ' +
        'This cannot be undone. Always export a backup first.' +
        '<div class="row-2" style="margin-top:12px">' +
        '<button class="btn btn-secondary btn-sm" data-action="clear-logs">' + ITL.icon('history') + 'Clear activity log only</button>' +
        '<button class="btn btn-danger btn-sm" data-action="clear-all">' + ITL.icon('trash') + 'Clear all data</button>' +
        '</div></div></div>' +
        '</div></div>' +

        '</div>' +

        /* ---- Side column: database info ---- */
        '<div class="stack-4">' +
        '<div class="card"><div class="card-head">' +
        '<div class="modal-head-ico">' + ITL.icon('database') + '</div>' +
        '<div><div class="card-title">Local database</div><div class="card-sub">Browser LocalStorage</div></div></div>' +
        '<div class="card-body">' +
        '<div class="' + (S.isAvailable() ? 'db-status' : 'db-status warn') + '">' +
        ITL.icon(S.isAvailable() ? 'checkCircle' : 'alert') +
        (S.isAvailable() ? 'LocalStorage active and writable' : 'LocalStorage unavailable — data will not persist') +
        '</div>' +
        '<div style="margin-top:14px">' +
        '<div class="row-2" style="justify-content:space-between;font-size:12.5px">' +
        '<span class="muted">Storage used</span><b>' + U.bytes(usage.bytes) + ' / ~' + U.bytes(usage.quota) + '</b></div>' +
        '<div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:' + Math.max(1, usage.percent).toFixed(1) + '%;background:' +
        (usage.percent > 85 ? 'var(--danger-solid)' : usage.percent > 60 ? 'var(--warn-solid)' : 'var(--success-solid)') + '"></div></div>' +
        '<div class="help-text" style="margin-top:5px">' + usage.percent.toFixed(1) + '% of the typical 5 MB browser quota.</div>' +
        '</div>' +
        '<hr>' +
        ITL.ui.kv([
          ['PC records', U.fmtNum(counts.pcs)],
          ['Staff systems', U.fmtNum(counts.staff)],
          ['Maintenance records', U.fmtNum(counts.maintenance)],
          ['Store items', U.fmtNum(counts.store)],
          ['Stock transactions', U.fmtNum(counts.stockTx)],
          ['Purchase records', U.fmtNum(counts.purchases)],
          ['Activity log entries', U.fmtNum(counts.logs)],
          ['Import batches', U.fmtNum(counts.imports)]
        ]) +
        '</div></div>' +

        '<div class="card"><div class="card-head"><div class="card-title">Storage keys</div></div>' +
        '<div class="card-body">' +
        '<div class="stack-2" style="font-size:12px">' +
        S.COLLECTION_KEYS.concat([K.settings, K.ui, K.meta]).map(function (key) {
          return '<div class="row-2" style="justify-content:space-between;gap:10px">' +
            '<code class="mono muted truncate" title="' + U.escAttr(key) + '">' + U.esc(key) + '</code>' +
            '<span class="mono">' + U.bytes(usage.per[key] || 0) + '</span></div>';
        }).join('') +
        '</div>' +
        '<div class="alert alert-info mt-4" style="font-size:12px">' + ITL.icon('info') +
        '<div class="alert-body">Data is stored in <b>this browser on this computer only</b>. It does not sync to other machines. ' +
        'Use <b>Backup &amp; Restore</b> to move data between computers.</div></div>' +
        '</div></div>' +

        '<div class="card"><div class="card-head"><div class="card-title">About</div></div>' +
        '<div class="card-body">' +
        ITL.ui.kv([
          ['Application', 'IT Lab Management System'],
          ['Version', '1.0.0'],
          ['Schema version', String(S.SCHEMA_VERSION)],
          ['Engine', 'HTML5 · CSS3 · Vanilla JS'],
          ['Excel engine', 'SheetJS / XLSX'],
          ['Storage', 'Browser LocalStorage'],
          ['Mode', 'Offline · frontend only']
        ]) +
        '</div></div>' +

        '</div></div>';

      bind(root);
    }
  };

  function bind(root) {
    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      switch (a) {
        case 'save-settings': saveForm(root); break;
        case 'reset-settings':
          ITL.modal.confirm({
            heading: 'Restore default settings',
            title: 'Reset all settings?',
            message: 'Preferences and appearance return to their defaults. Your records are not affected.',
            tone: 'warn', confirmLabel: 'Restore defaults'
          }).then(function (ok) {
            if (!ok) return;
            set.reset();
            if (w.SN_appearance && w.SN_appearance.reset) w.SN_appearance.reset();
            ITL.activity.log('Settings', 'Updated', '', 'Settings restored to defaults');
            ITL.toast.success('Settings restored', 'Default preferences applied');
            ITL.app.refreshChrome();
            ITL.router.reload();
          });
          break;
        case 'backup-now': ITL.backup.exportBackup(); break;
        case 'restore-now': ITL.backup.openRestore(); break;
        case 'goto-backup': ITL.router.go('backup'); break;
        case 'clear-logs':
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
        case 'clear-all': clearAllFlow(); break;
      }
    });
  }

  function saveForm(root) {
    var form = root.querySelector('#settingsForm');
    var data = ITL.validation.readForm(form);
    // fields declared with form="settingsForm" outside the element
    U.qsa('[form="settingsForm"]', root).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else data[el.name] = el.value;
    });

    var labs = String(data.labs || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!labs.length) labs = ['Lab 1', 'Lab 2', 'Lab 3'];

    var low = U.int(data.lowStockThreshold, 5);
    if (low < 0) low = 0;

    var patch = {
      orgName: U.str(data.orgName) || 'VIP IT Labs',
      labName: U.str(data.labName) || 'IT Lab Management System',
      brandName: U.str(data.brandName) || 'Shakeel Networking',
      labs: labs,
      defaultLab: labs.indexOf(U.str(data.defaultLab)) >= 0 ? U.str(data.defaultLab) : labs[0],
      adminName: U.str(data.adminName) || 'Shakeel Ahmed',
      adminRole: U.str(data.adminRole) || 'Admin',
      lowStockThreshold: low,
      dateFormat: data.dateFormat || 'dd-MMM-yyyy',
      tablePageSize: data.tablePageSize === 'All' ? 'All' : U.int(data.tablePageSize, 25),
      theme: 'dark',
      exportIncludeTimestamps: !!data.exportIncludeTimestamps,
      exportIncludePasswords: !!data.exportIncludePasswords,
      confirmDeletes: !!data.confirmDeletes,
      exportDefaultScope: data.exportDefaultScope === 'all' ? 'all' : 'filtered'
    };

    set.save(patch);
    ITL.activity.log('Settings', 'Updated', '', 'Application settings updated');
    ITL.toast.success('Settings saved', 'Your preferences have been stored locally');
    ITL.app.refreshChrome();
    ITL.router.reload();
  }

  function clearAllFlow() {
    var counts = S.counts();
    var total = counts.pcs + counts.staff + counts.maintenance + counts.store + counts.stockTx + counts.purchases;
    ITL.modal.confirm({
      heading: 'Clear ALL application data',
      title: 'This will permanently delete ' + U.fmtNum(total) + ' records',
      messageHtml:
        '<b>We strongly recommend exporting a backup first.</b><br><br>' +
        'The following will be permanently removed from this browser:' +
        '<ul style="margin:8px 0 0;padding-left:18px;list-style:disc">' +
        '<li>' + counts.pcs + ' PC records</li>' +
        '<li>' + counts.staff + ' staff systems</li>' +
        '<li>' + counts.maintenance + ' maintenance records</li>' +
        '<li>' + counts.store + ' store items</li>' +
        '<li>' + counts.stockTx + ' stock transactions</li>' +
        '<li>' + counts.purchases + ' purchase records</li>' +
        '<li>' + counts.logs + ' activity log entries</li>' +
        '</ul>',
      tone: 'danger',
      requireText: 'DELETE',
      confirmLabel: 'Permanently delete everything',
      cancelLabel: 'Cancel'
    }).then(function (ok) {
      if (!ok) return;
      S.clearAll(true);
      S.invalidate();
      ITL.activity.log('System', 'Cleared', '', 'All application data cleared by administrator');
      ITL.toast.success('All data cleared', 'The application has been reset to an empty state');
      ITL.app.refreshChrome();
      ITL.router.go('dashboard');
    });
  }

})(window);
