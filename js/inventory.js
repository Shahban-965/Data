/* ==========================================================================
   inventory.js — PC Inventory page (list, filters, CRUD, detail, Excel)
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;
  var C = ITL.constants;
  var ui = ITL.ui;

  var pages = ITL.pages = ITL.pages || {};
  var inv = ITL.inventory = {};

  var VIEW = 'pcs';

  function view() {
    return ITL.state.view(VIEW, {
      search: '', page: 1, sortKey: 'pcName', sortDir: 'asc',
      tab: 'all',
      filters: { lab: '', status: '', processor: '', ram: '', storage: '' }
    });
  }

  /** Apply search + filters + tab to the PC collection. */
  function filtered() {
    var v = view();
    var rows = ITL.data.pcs();
    var f = v.filters;
    return rows.filter(function (r) {
      if (v.tab !== 'all' && U.normKey(r.lab) !== U.normKey(v.tab)) return false;
      if (f.lab && r.lab !== f.lab) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.processor && r.processor !== f.processor) return false;
      if (f.ram && r.ram !== f.ram) return false;
      if (f.storage && r.storage !== f.storage) return false;
      if (v.search && !U.matches(r, v.search,
        ['id', 'pcName', 'serialNumber', 'lab', 'processor', 'ram', 'storage', 'os', 'software', 'status', 'remarks'])) return false;
      return true;
    });
  }

  /* ================================================================ PAGE */
  pages.inventory = {
    title: 'PC Inventory',

    render: function (root, params) {
      var v = view();
      if (params && params.lab) { v.tab = params.lab; v.page = 1; }
      if (params && params.status) { v.filters.status = params.status; v.page = 1; }

      var all = ITL.data.pcs();
      var labs = C.labs();

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">PC Inventory</div>' +
        '<div class="page-sub">Lab computers, hardware specification and current working status</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="import">' + ITL.icon('upload') + 'Import Excel</button>' +
        '<button class="btn btn-excel" data-action="export">' + ITL.icon('excel') + 'Download Excel</button>' +
        '<button class="btn btn-primary" data-action="add">' + ITL.icon('plus') + 'Add PC</button>' +
        '</div></div>' +

        '<div class="stat-grid mb-4" id="pcStats"></div>' +

        '<div class="card">' +
        '<div class="tabs" id="pcTabs" role="tablist">' +
        tabBtn('all', 'All PCs', all.length, v.tab) +
        labs.map(function (l) {
          return tabBtn(l, l, all.filter(function (p) { return p.lab === l; }).length, v.tab);
        }).join('') +
        (function () {
          var other = all.filter(function (p) { return labs.indexOf(p.lab) === -1; });
          return other.length ? tabBtn('__other', 'Unassigned', other.length, v.tab) : '';
        })() +
        '</div>' +

        '<div class="toolbar">' +
        ui.searchInput(v.search, 'Search PC name, serial, processor, software…') +
        ui.selectFilter('lab', 'Lab', labs, v.filters.lab) +
        ui.selectFilter('status', 'Status', C.PC_STATUS, v.filters.status) +
        ui.selectFilter('processor', 'Processor', U.uniqueValues(all, 'processor'), v.filters.processor) +
        ui.selectFilter('ram', 'RAM', U.uniqueValues(all, 'ram'), v.filters.ram) +
        ui.selectFilter('storage', 'Storage', U.uniqueValues(all, 'storage'), v.filters.storage) +
        '<div class="toolbar-spacer"></div>' +
        '<button class="btn btn-secondary btn-sm" data-action="clear-filters" title="Clear search and filters">' + ITL.icon('x') + 'Clear</button>' +
        '</div>' +
        '<div id="pcFilterChips"></div>' +
        '<div id="pcTable"></div>' +
        '</div>';

      renderStats(root);
      renderTable(root);
      bind(root);

      if (params && params.focus) ui.highlightRow(params.focus);
      if (params && params.open) {
        var rec = ITL.data.pc(params.open);
        if (rec) inv.openDetail(rec.id);
      }
    }
  };

  function tabBtn(id, label, count, active) {
    return '<button class="tab' + (String(active) === String(id) ? ' active' : '') + '" data-tab="' + U.escAttr(id) + '" role="tab">' +
      U.esc(label) + '<span class="tab-count">' + count + '</span></button>';
  }

  function renderStats(root) {
    var st = ITL.data.stats().pc;
    var host = root.querySelector('#pcStats');
    if (!host) return;
    host.innerHTML =
      ui.statCard({ label: 'Total PCs', value: st.total, icon: 'desktop', color: '#3b66f6', bg: 'var(--info-bg)' }) +
      ui.statCard({ label: 'Working', value: st.working, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'filter-status', args: { status: 'Working' } }) +
      ui.statCard({ label: 'Pending', value: st.pending, icon: 'clock', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'filter-status', args: { status: 'Pending' } }) +
      ui.statCard({ label: 'Faulty', value: st.faulty, icon: 'alert', color: '#ef4444', bg: 'var(--danger-bg)', action: 'filter-status', args: { status: 'Faulty' } }) +
      ui.statCard({ label: 'Hold', value: st.hold, icon: 'slash', color: '#3b82f6', bg: 'var(--info-bg)', action: 'filter-status', args: { status: 'Hold' } }) +
      ui.statCard({ label: 'Retired', value: st.retired, icon: 'archive', color: '#94a3b8', bg: 'var(--neutral-bg)', action: 'filter-status', args: { status: 'Retired' } });
  }

  function renderTable(root) {
    var v = view();
    var rows = filtered();
    var chips = root.querySelector('#pcFilterChips');
    if (chips) chips.innerHTML = ui.filterChips(v.filters, {
      lab: 'Lab', status: 'Status', processor: 'Processor', ram: 'RAM', storage: 'Storage'
    });

    ui.renderTable({
      mount: root.querySelector('#pcTable'),
      view: v,
      noun: 'PC',
      totalUnfiltered: ITL.data.pcs().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      rowClass: function (r) { return r.status === 'Faulty' ? 'row-danger' : (r.status === 'Pending' ? 'row-warn' : ''); },
      columns: [
        { key: 'id', label: 'ID', sortable: true, cls: 'cell-id', width: '92px' },
        {
          key: 'pcName', label: 'PC Name', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.pcName) || '—') + '</span>' +
              (r.serialNumber ? '<span class="cs-sub mono">S/N ' + U.esc(r.serialNumber) + '</span>' : '') + '</div>';
          }
        },
        { key: 'lab', label: 'Lab', sortable: true, width: '96px', render: function (r) { return ui.labBadge(r.lab); } },
        { key: 'processor', label: 'Processor', sortable: true },
        { key: 'ram', label: 'RAM', sortable: true, width: '84px' },
        { key: 'storage', label: 'Storage', sortable: true },
        { key: 'os', label: 'Operating System', sortable: true },
        { key: 'status', label: 'Status', sortable: true, width: '110px', render: function (r) { return ui.pcStatusBadge(r.status); } },
        { key: 'updatedAt', label: 'Updated', sortable: true, cls: 'cell-date', width: '112px', render: function (r) { return U.esc(U.fmtDate(r.updatedAt)); } }
      ],
      actions: function (r) {
        return ui.rowActions([
          { action: 'view', id: r.id, icon: 'eye', label: 'View details' },
          { action: 'edit', id: r.id, icon: 'edit', label: 'Edit PC' },
          { action: 'fault', id: r.id, icon: 'wrench', label: 'Report fault' },
          { action: 'delete', id: r.id, icon: 'trash', label: 'Delete PC', danger: true }
        ]);
      },
      onRowClick: function (r) { inv.openDetail(r.id); },
      empty: {
        icon: 'desktop',
        title: 'No PCs recorded yet',
        desc: 'Start by adding your first lab computer, or import your existing Excel sheet.',
        actions: [
          { label: 'Add PC', icon: 'plus', cls: 'btn-primary', action: 'add' },
          { label: 'Import Excel', icon: 'upload', cls: 'btn-secondary', action: 'import' }
        ]
      },
      onChange: function () { renderTable(root); }
    });
  }

  function bind(root) {
    var v = view();

    U.on(root, 'click', '[data-tab]', function (e, el) {
      v.tab = el.getAttribute('data-tab');
      v.page = 1;
      U.qsa('[data-tab]', root).forEach(function (t) { t.classList.remove('active'); });
      el.classList.add('active');
      renderTable(root);
    });

    var search = root.querySelector('[data-search]');
    if (search) {
      var deb = U.debounce(function () { v.search = search.value; v.page = 1; renderTable(root); }, 200);
      search.addEventListener('input', deb);
    }

    U.on(root, 'change', '[data-filter]', function (e, el) {
      v.filters[el.getAttribute('data-filter')] = el.value;
      v.page = 1;
      renderTable(root);
    });

    U.on(root, 'click', '[data-clear-filter]', function (e, el) {
      v.filters[el.getAttribute('data-clear-filter')] = '';
      v.page = 1;
      ITL.router.reload();
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      var id = el.getAttribute('data-id');
      var args = el.getAttribute('data-args');
      try { args = args ? JSON.parse(args) : null; } catch (x) { args = null; }

      switch (a) {
        case 'add': inv.openForm(); break;
        case 'view': inv.openDetail(id); break;
        case 'edit': inv.openForm(id); break;
        case 'fault': ITL.maintenance.openForm(null, { pcId: id }); break;
        case 'delete': inv.remove(id); break;
        case 'import': inv.importExcel(); break;
        case 'export': inv.exportExcel(); break;
        case 'clear-filters':
          v.search = ''; v.page = 1;
          Object.keys(v.filters).forEach(function (k) { v.filters[k] = ''; });
          ITL.router.reload();
          break;
        case 'filter-status':
          if (args && args.status) {
            v.filters.status = v.filters.status === args.status ? '' : args.status;
            v.page = 1;
            ITL.router.reload();
          }
          break;
      }
    });

    U.on(root, 'keydown', '.stat-card[role="button"]', function (e, el) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  }

  /* ============================================================ ADD/EDIT */
  inv.openForm = function (id, prefill) {
    var editing = !!id;
    var rec = editing ? ITL.data.pc(id) : null;
    if (editing && !rec) { ITL.toast.error('PC not found'); return; }
    var d = rec || ITL.factory.pc(prefill || {});
    var labs = C.labs();

    var body =
      '<form id="pcForm" novalidate autocomplete="off">' +
      '<div data-error-summary style="display:none;margin-bottom:16px"></div>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('clipboard') + 'Identification</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="pcName">PC Name <span class="req">*</span></label>' +
      '<input type="text" id="pcName" name="pcName" value="' + U.escAttr(d.pcName) + '" placeholder="e.g. Lab1-PC-01" data-autofocus>' +
      '<div class="help-text">Must be unique inside its lab.</div></div>' +

      '<div class="field"><label for="pcSerial">Serial Number</label>' +
      '<input type="text" id="pcSerial" name="serialNumber" value="' + U.escAttr(d.serialNumber) + '" placeholder="e.g. SN-4421809">' +
      '<div class="help-text">Manufacturer serial or asset tag. Must be unique.</div></div>' +

      '<div class="field"><label for="pcLab">Lab <span class="req">*</span></label>' +
      '<select id="pcLab" name="lab">' + ui.options(labs, d.lab) + '</select></div>' +

      '<div class="field"><label for="pcPassword">Password</label>' +
      '<div class="input-affix"><input type="password" id="pcPassword" name="password" value="' + U.escAttr(d.password) + '" autocomplete="new-password" placeholder="Windows / BIOS password">' +
      '<button type="button" class="affix-btn" data-toggle-pw="pcPassword" aria-label="Show password">' + ITL.icon('eye') + '</button></div>' +
      '<div class="help-text">Stored only in this browser. Never transmitted.</div></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('cpu') + 'Hardware</legend>' +
      '<div class="form-grid cols-3">' +
      '<div class="field"><label for="pcProc">Processor</label>' +
      '<input type="text" id="pcProc" name="processor" value="' + U.escAttr(d.processor) + '" list="dlProc" placeholder="e.g. Intel Core i5">' +
      ui.datalist('dlProc', C.PROCESSOR_OPTIONS.concat(U.uniqueValues(ITL.data.pcs(), 'processor'))) + '</div>' +

      '<div class="field"><label for="pcRam">RAM</label>' +
      '<input type="text" id="pcRam" name="ram" value="' + U.escAttr(d.ram) + '" list="dlRam" placeholder="e.g. 8 GB">' +
      ui.datalist('dlRam', C.RAM_OPTIONS.concat(U.uniqueValues(ITL.data.pcs(), 'ram'))) + '</div>' +

      '<div class="field"><label for="pcStorage">Storage</label>' +
      '<input type="text" id="pcStorage" name="storage" value="' + U.escAttr(d.storage) + '" list="dlStorage" placeholder="e.g. 256 GB SSD">' +
      ui.datalist('dlStorage', C.STORAGE_OPTIONS.concat(U.uniqueValues(ITL.data.pcs(), 'storage'))) + '</div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('layers') + 'Software</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="pcOs">Operating System</label>' +
      '<input type="text" id="pcOs" name="os" value="' + U.escAttr(d.os) + '" list="dlOs" placeholder="e.g. Windows 11 Pro">' +
      ui.datalist('dlOs', C.OS_OPTIONS.concat(U.uniqueValues(ITL.data.pcs(), 'os'))) + '</div>' +

      '<div class="field"><label for="pcSoftware">Software Installed</label>' +
      '<input type="text" id="pcSoftware" name="software" value="' + U.escAttr(d.software) + '" placeholder="e.g. MS Office, AutoCAD, Chrome">' +
      '<div class="help-text">Separate multiple items with commas.</div></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('activity') + 'Status &amp; remarks</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="pcStatus">Status <span class="req">*</span></label>' +
      '<select id="pcStatus" name="status">' + ui.options(C.PC_STATUS, d.status) + '</select></div>' +
      '<div class="field"></div>' +
      '<div class="field col-span-2"><label for="pcRemarks">Remarks</label>' +
      '<textarea id="pcRemarks" name="remarks" rows="2" placeholder="Any additional notes about this machine">' + U.esc(d.remarks) + '</textarea></div>' +
      '</div></fieldset>' +
      '</form>';

    ITL.modal.open({
      title: editing ? 'Edit PC' : 'Add new PC',
      subtitle: editing ? d.id + ' · ' + (d.pcName || '') : 'Register a computer in the lab inventory',
      icon: 'desktop',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="pcSave">' + ITL.icon('check') + (editing ? 'Save changes' : 'Add PC') + '</button>',
      onMount: function (el, api) {
        bindPwToggles(el);
        el.querySelector('#pcSave').addEventListener('click', function () { save(el, api); });
        el.querySelector('#pcForm').addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); save(el, api); }
        });
      }
    });

    function save(el, api) {
      var form = el.querySelector('#pcForm');
      var data = ITL.validation.readForm(form);
      var res = ITL.validation.check(data, {
        pcName: { label: 'PC Name', required: true, maxLength: 60 },
        lab: { label: 'Lab', required: true },
        status: { label: 'Status', required: true, oneOf: C.PC_STATUS },
        serialNumber: { label: 'Serial Number', maxLength: 60 },
        remarks: { label: 'Remarks', maxLength: 500 }
      });
      if (!ITL.validation.apply(form, res)) return;

      var dupe = ITL.validation.checkPcDuplicate(data, editing ? id : null);
      if (dupe.duplicate) {
        ITL.validation.warnDuplicate(dupe).then(function (proceed) {
          if (proceed) commit(el, api, data);
        });
        return;
      }
      commit(el, api, data);
    }

    function commit(el, api, data) {
      api.setBusy(true, 'Saving…');
      setTimeout(function () {
        try {
          if (editing) {
            var merged = Object.assign({}, rec, data, { updatedAt: U.nowISO() });
            S.replace(K.pcs, id, merged);
            ITL.activity.log('PC Inventory', 'Updated', id, 'PC updated — ' + merged.pcName + ' (' + merged.lab + ')');
            ITL.toast.success('PC updated', merged.pcName + ' saved successfully');
          } else {
            var created = ITL.factory.pc(data);
            S.insert(K.pcs, created);
            ITL.activity.log('PC Inventory', 'Created', created.id, 'PC added — ' + created.pcName + ' (' + created.lab + ')');
            ITL.toast.success('PC added successfully', created.pcName + ' · ' + created.lab);
          }
          api.setBusy(false);
          api.close();
          ITL.router.reload();
          ITL.app.refreshChrome();
        } catch (err) {
          api.setBusy(false);
          console.error(err);
          ITL.toast.error('Unable to save record', err.message || 'Unexpected error');
        }
      }, 40);
    }
  };

  function bindPwToggles(el) {
    U.qsa('[data-toggle-pw]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var input = el.querySelector('#' + b.getAttribute('data-toggle-pw'));
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.innerHTML = ITL.icon(show ? 'eyeOff' : 'eye');
      });
    });
  }
  inv.bindPwToggles = bindPwToggles;

  /* ============================================================== DETAIL */
  inv.openDetail = function (id) {
    var r = ITL.data.pc(id);
    if (!r) { ITL.toast.error('PC not found'); return; }
    var history = ITL.data.maintenanceForPc(r);

    function detailBody() {
      return '<div class="detail-section">' + ui.sectionTitle('PC information', 'clipboard') +
        '<div class="detail-grid">' +
        ui.field('Record ID', r.id, { mono: true }) +
        ui.field('PC Name', r.pcName) +
        ui.field('Serial Number', r.serialNumber, { mono: true }) +
        ui.field('Lab', ui.labBadge(r.lab), { html: true }) +
        ui.field('Password', ui.passwordCell(r.password), { html: true }) +
        ui.field('Status', ui.pcStatusBadge(r.status), { html: true }) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Hardware', 'cpu') +
        '<div class="detail-grid">' +
        ui.field('Processor', r.processor) +
        ui.field('RAM', r.ram) +
        ui.field('Storage', r.storage) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Software', 'layers') +
        '<div class="detail-grid">' +
        ui.field('Operating System', r.os) +
        ui.field('Software Installed', r.software) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Remarks & audit', 'info') +
        '<div class="detail-grid">' +
        ui.field('Remarks', r.remarks, { full: true }) +
        ui.field('Created', U.fmtDateTime(r.createdAt)) +
        ui.field('Last updated', U.fmtDateTime(r.updatedAt)) +
        '</div></div>';
    }

    function historyBody() {
      if (!history.length) {
        return ui.emptyState({
          icon: 'wrench', compact: true,
          title: 'No maintenance history',
          desc: 'This PC has no recorded faults or repairs.',
          actions: [{ label: 'Report a fault', icon: 'plus', cls: 'btn-primary', action: 'detail-fault' }]
        });
      }
      return '<div class="preview-scroll" style="max-height:none;border:none">' +
        '<table class="data-table compact-table"><thead><tr>' +
        '<th>Date</th><th>Problem</th><th>Category</th><th>Part used</th><th style="text-align:right">Qty</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        U.sortBy(history, 'complaintDate', 'desc').map(function (m) {
          return '<tr class="clickable" data-open-maint="' + U.escAttr(m.id) + '">' +
            '<td class="cell-date">' + U.esc(U.fmtDate(m.complaintDate)) + '</td>' +
            '<td class="cell-primary">' + (U.esc(m.problem) || '—') + '</td>' +
            '<td>' + (U.esc(m.category) || '—') + '</td>' +
            '<td>' + (U.esc(m.newPart) || '<span class="muted">—</span>') + '</td>' +
            '<td class="cell-num">' + (m.quantity ? U.int(m.quantity) : '<span class="muted">—</span>') + '</td>' +
            '<td>' + ui.maintStatusBadge(m.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    var m = ITL.modal.open({
      title: r.pcName || r.id,
      subtitle: r.id + ' · ' + (r.lab || 'Unassigned') + ' · ' + (r.status || ''),
      icon: 'desktop',
      size: 'lg',
      panel: true,
      tabs: [
        { id: 'details', label: 'Details', icon: 'info' },
        { id: 'history', label: 'Maintenance history', icon: 'wrench', count: history.length }
      ],
      body: detailBody(),
      footer:
        '<button type="button" class="btn btn-secondary" data-detail="download">' + ITL.icon('download') + 'Download PC history</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-secondary" data-detail="fault">' + ITL.icon('wrench') + 'Report fault</button>' +
        '<button type="button" class="btn btn-primary" data-primary data-detail="edit">' + ITL.icon('edit') + 'Edit</button>',
      onMount: function (el, api) {
        api.onTab(function (tab) {
          api.setBody(tab === 'history' ? historyBody() : detailBody());
          bindBody(el, api);
        });
        bindBody(el, api);

        U.on(el, 'click', '[data-detail]', function (e, b) {
          var act = b.getAttribute('data-detail');
          if (act === 'edit') { api.close(); inv.openForm(r.id); }
          else if (act === 'fault') { api.close(); ITL.maintenance.openForm(null, { pcId: r.id }); }
          else if (act === 'download') { inv.exportPcHistory(r); }
        });
      }
    });

    function bindBody(el, api) {
      U.on(el, 'click', '[data-open-maint]', function (e, tr) {
        api.close();
        ITL.router.go('maintenance', { open: tr.getAttribute('data-open-maint') });
      });
      U.on(el, 'click', '[data-action="detail-fault"]', function () {
        api.close();
        ITL.maintenance.openForm(null, { pcId: r.id });
      });
    }
  };

  /* ============================================================== DELETE */
  inv.remove = function (id) {
    var r = ITL.data.pc(id);
    if (!r) return;
    var linked = ITL.data.maintenanceForPc(r).length;
    var doDelete = function () {
      S.delete(K.pcs, id);
      ITL.activity.log('PC Inventory', 'Deleted', id, 'PC deleted — ' + (r.pcName || id) + ' (' + (r.lab || '') + ')');
      ITL.toast.success('PC deleted', (r.pcName || id) + ' has been removed');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };

    if (ITL.settings.get().confirmDeletes === false) { doDelete(); return; }

    ITL.modal.confirm({
      heading: 'Delete PC',
      title: 'Delete ' + (r.pcName || r.id) + '?',
      messageHtml: 'This permanently removes the PC record from local storage.' +
        (linked ? '<br><br><b>' + linked + ' maintenance record' + (linked > 1 ? 's are' : ' is') + '</b> linked to this PC. They will be kept for history but will no longer link to a PC record.' : ''),
      tone: 'danger',
      confirmLabel: 'Delete PC'
    }).then(function (ok) { if (ok) doDelete(); });
  };

  /* =============================================================== EXCEL */
  inv.exportExcel = function () {
    var rows = filtered();
    var all = ITL.data.pcs();
    var v = view();

    ITL.exporter.chooseScope({
      filteredCount: rows.length, totalCount: all.length, noun: 'PCs'
    }).then(function (scope) {
      if (!scope) return;
      var data = scope === 'all' ? all : rows;
      if (!data.length) { ITL.toast.warn('Nothing to export', 'There are no PC records to include.'); return; }

      var filterText = [];
      if (scope !== 'all') {
        if (v.tab !== 'all') filterText.push('Tab: ' + v.tab);
        Object.keys(v.filters).forEach(function (k) { if (v.filters[k]) filterText.push(U.titleCase(k) + ' = ' + v.filters[k]); });
        if (v.search) filterText.push('Search: "' + v.search + '"');
      }

      ITL.modal.withBusy('Generating Excel…', 'Building your PC inventory report', function () {
        var name = ITL.excel.exportCollection({
          schemaId: 'pcs',
          rows: data,
          scope: scope === 'all' ? 'All records' : 'Filtered records',
          filters: filterText.join(', ') || 'None',
          filenameBase: 'IT_Lab_PC_Inventory'
        });
        ITL.activity.log('PC Inventory', 'Exported', '', 'Downloaded ' + name + ' (' + data.length + ' records)');
        ITL.toast.success('Excel downloaded', name);
      });
    });
  };

  inv.exportPcHistory = function (r) {
    var history = U.sortBy(ITL.data.maintenanceForPc(r), 'complaintDate', 'desc');
    ITL.modal.withBusy('Generating Excel…', 'Building the PC history report', function () {
      var s = ITL.settings.get();
      var org = (s.orgName ? s.orgName.toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM';

      var infoWs = ITL.excel.buildSheet({
        orgTitle: org,
        reportTitle: 'PC DETAIL — ' + String(r.pcName || r.id).toUpperCase(),
        metaLine: ITL.excel.metaLine({ records: 1, scope: 'Single PC' }),
        columns: [
          { key: 'field', label: 'Field', type: 'text', width: 24 },
          { key: 'value', label: 'Value', type: 'text', width: 46 }
        ],
        rows: [
          { field: 'Record ID', value: r.id },
          { field: 'PC Name', value: r.pcName },
          { field: 'Serial Number', value: r.serialNumber },
          { field: 'Lab', value: r.lab },
          { field: 'Processor', value: r.processor },
          { field: 'RAM', value: r.ram },
          { field: 'Storage', value: r.storage },
          { field: 'Operating System', value: r.os },
          { field: 'Software Installed', value: r.software },
          { field: 'Status', value: r.status },
          { field: 'Remarks', value: r.remarks },
          { field: 'Created', value: U.fmtDateTime(r.createdAt) },
          { field: 'Last Updated', value: U.fmtDateTime(r.updatedAt) },
          { field: 'Total Maintenance Records', value: String(history.length) }
        ]
      });

      var histWs = ITL.excel.buildSheet({
        orgTitle: org,
        reportTitle: 'MAINTENANCE HISTORY — ' + String(r.pcName || r.id).toUpperCase(),
        metaLine: ITL.excel.metaLine({ records: history.length, scope: 'Single PC' }),
        columns: ITL.schemas.exportFields('maintenance'),
        rows: history,
        totals: ['quantity']
      });

      var fname = 'IT_Lab_PC_History_' + U.slug(r.pcName || r.id) + '_' + U.stampDate() + '.xlsx';
      ITL.excel.download({
        filename: fname,
        title: 'PC History',
        sheets: [{ name: 'PC Details', ws: infoWs }, { name: 'Maintenance History', ws: histWs }]
      });
      ITL.activity.log('PC Inventory', 'Exported', r.id, 'Downloaded PC history for ' + (r.pcName || r.id));
      ITL.toast.success('Excel downloaded', fname);
    });
  };

  inv.importExcel = function () {
    ITL.importer.open({
      schemaId: 'pcs',
      dupCheck: function (data) {
        if (data.id) {
          var byId = ITL.data.pc(data.id);
          if (byId) return byId;
        }
        var res = ITL.validation.checkPcDuplicate(data, null);
        return res.duplicate ? res.record : null;
      },
      buildRecord: function (data) {
        var rec = ITL.factory.pc(data);
        if (!C.PC_STATUS.length || C.PC_STATUS.indexOf(rec.status) === -1) {
          rec.status = normalizeStatus(rec.status);
        }
        if (!rec.lab) rec.lab = ITL.settings.get().defaultLab;
        return rec;
      },
      applyUpdate: function (existing, data) {
        var patch = {};
        Object.keys(data).forEach(function (k) {
          if (k === 'id' || k === 'createdAt') return;
          if (data[k] !== '' && data[k] !== null && data[k] !== undefined) patch[k] = data[k];
        });
        if (patch.status) patch.status = normalizeStatus(patch.status);
        return Object.assign({}, existing, patch, { updatedAt: U.nowISO() });
      },
      onDone: function () { ITL.router.reload(); }
    });
  };

  /** Map free-text status values from spreadsheets onto our status set. */
  function normalizeStatus(v) {
    var n = U.normKey(v);
    if (!n) return 'Working';
    if (/^(working|ok|good|active|running|functional|fine|yes|inuse|used|live)/.test(n)) return 'Working';
    if (/^(faulty|fault|dead|damaged|notworking|broken|bad|repair|outoforder|defective)/.test(n)) return 'Faulty';
    if (/^(pending|waiting|inprocess|inprogress|underrepair|process)/.test(n)) return 'Pending';
    if (/^(hold|onhold|reserved|standby)/.test(n)) return 'Hold';
    if (/^(retired|scrap|disposed|removed|discard|obsolete|condemn)/.test(n)) return 'Retired';
    for (var i = 0; i < C.PC_STATUS.length; i++) {
      if (U.normKey(C.PC_STATUS[i]) === n) return C.PC_STATUS[i];
    }
    return 'Working';
  }
  inv.normalizeStatus = normalizeStatus;

})(window);
