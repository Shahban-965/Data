/* ==========================================================================
   reports.js — Reports page: previews + professional multi-sheet Excel
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
  var rep = ITL.reports = {};

  var TYPES = [
    { id: 'pcs', label: 'PC Inventory', icon: 'desktop', desc: 'Every lab computer with hardware, software and status.', color: '#3b66f6', bg: 'var(--info-bg)' },
    { id: 'staff', label: 'Staff Systems', icon: 'users', desc: 'Computers assigned to staff members and departments.', color: '#8b5cf6', bg: 'var(--purple-bg)' },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench', desc: 'Fault reports, repairs and replacement parts consumed.', color: '#f59e0b', bg: 'var(--warn-bg)' },
    { id: 'store', label: 'Store Inventory', icon: 'package', desc: 'Spare parts, quantities, minimum levels and stock status.', color: '#10b981', bg: 'var(--success-bg)' },
    { id: 'purchases', label: 'Purchases', icon: 'cart', desc: 'Procurement history, suppliers and accessories received.', color: '#06b6d4', bg: 'var(--info-bg)' },
    { id: 'monthly', label: 'Monthly Summary', icon: 'calendar', desc: 'Maintenance activity for a specific month and year.', color: '#ec4899', bg: 'var(--purple-bg)' },
    { id: 'complete', label: 'Complete IT Lab Report', icon: 'layers', desc: 'Ten-sheet master workbook covering the entire system.', color: '#1f4e79', bg: 'var(--neutral-bg)' }
  ];
  rep.TYPES = TYPES;

  function view() {
    var now = new Date();
    return ITL.state.view('reports', {
      type: 'pcs',
      filters: {
        from: '', to: '', lab: '', status: '', category: '', pcName: '', itemName: '',
        month: String(now.getMonth() + 1), year: String(now.getFullYear())
      }
    });
  }

  /* ================================================================ PAGE */
  pages.reports = {
    title: 'Reports',

    render: function (root, params) {
      var v = view();
      if (params && params.type && TYPES.some(function (t) { return t.id === params.type; })) {
        v.type = params.type;
      }

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Reports</div>' +
        '<div class="page-sub">Preview your data, then download a professionally formatted Excel workbook</div></div>' +
        '</div>' +

        '<div class="grid-main-side">' +
        '<div class="stack-4">' +
        '<div class="card"><div class="card-head"><div class="card-title">Report filters</div>' +
        '<div class="card-head-actions">' +
        '<button class="btn btn-secondary btn-sm" data-action="clear">' + ITL.icon('x') + 'Clear filters</button>' +
        '</div></div>' +
        '<div class="card-body" id="repFilters"></div></div>' +

        '<div class="card"><div class="card-head">' +
        '<div><div class="card-title" id="repPreviewTitle">Preview</div>' +
        '<div class="card-sub" id="repPreviewSub">Select a report type to preview the data</div></div>' +
        '<div class="card-head-actions">' +
        '<button class="btn btn-secondary btn-sm" data-action="preview">' + ITL.icon('eye') + 'Refresh preview</button>' +
        '<button class="btn btn-excel btn-sm" data-action="download">' + ITL.icon('excel') + 'Download Excel</button>' +
        '</div></div>' +
        '<div id="repPreview"></div></div>' +
        '</div>' +

        '<div class="stack-4">' +
        '<div class="card"><div class="card-head"><div class="card-title">Report type</div></div>' +
        '<div class="card-body"><div class="stack-2" id="repTypes">' +
        TYPES.map(function (t) {
          return '<button type="button" class="report-card' + (v.type === t.id ? ' active' : '') + '" data-type="' + t.id + '">' +
            '<span class="rc-ico" style="background:' + t.bg + ';color:' + t.color + '">' + ITL.icon(t.icon) + '</span>' +
            '<span style="min-width:0"><span class="rc-title">' + U.esc(t.label) + '</span>' +
            '<div class="rc-desc">' + U.esc(t.desc) + '</div></span></button>';
        }).join('') +
        '</div></div></div>' +

        '<div class="card"><div class="card-head"><div class="card-title">Every Excel report includes</div></div>' +
        '<div class="card-body"><div class="stack-2" style="font-size:12.5px">' +
        [
          'Formatted title banner and generation date',
          'Bold, colour-filled header row',
          'Frozen header row so it stays visible',
          'Excel AutoFilter on the real table range',
          'Readable column widths and borders',
          'Real dates (dd-mmm-yyyy) and numeric quantities',
          'Clean sheet names — no internal data'
        ].map(function (t) {
          return '<div class="row-2" style="gap:8px;align-items:flex-start">' +
            '<span style="color:var(--success-fg);flex:0 0 auto;display:grid;place-items:center">' + ITL.icon('check') + '</span>' +
            '<span>' + U.esc(t) + '</span></div>';
        }).join('') +
        '</div></div></div>' +
        '</div></div>';

      renderFilters(root);
      renderPreview(root);
      bind(root);
    }
  };

  function renderFilters(root) {
    var v = view();
    var host = root.querySelector('#repFilters');
    var t = v.type;
    var f = v.filters;
    var out = '';

    if (t === 'monthly') {
      var years = [];
      var thisYear = new Date().getFullYear();
      for (var y = thisYear - 6; y <= thisYear + 1; y++) years.push(String(y));
      out = '<div class="form-grid cols-3">' +
        '<div class="field"><label for="repMonth">Month</label><select id="repMonth" data-rf="month">' +
        U.MONTHS_FULL.map(function (m, i) {
          return '<option value="' + (i + 1) + '"' + (String(f.month) === String(i + 1) ? ' selected' : '') + '>' + m + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label for="repYear">Year</label><select id="repYear" data-rf="year">' +
        years.map(function (yy) { return '<option value="' + yy + '"' + (String(f.year) === yy ? ' selected' : '') + '>' + yy + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label for="repLabM">Lab</label><select id="repLabM" data-rf="lab">' +
        '<option value="">All labs</option>' + ui.options(C.labs().concat(['Staff Systems']), f.lab) + '</select></div>' +
        '</div>';
    } else if (t === 'complete') {
      out = '<div class="alert alert-info">' + ITL.icon('info') +
        '<div class="alert-body"><div class="alert-title">Complete IT Lab Report</div>' +
        'Generates a single workbook with ten formatted sheets: Executive Summary, PC Inventory, one sheet per lab, ' +
        'Staff Systems, Maintenance, Store Inventory, Stock Transactions and Purchases. ' +
        'Date filters below limit the Maintenance, Purchases and Stock Transactions sheets.</div></div>' +
        '<div class="form-grid mt-4">' +
        dateRange(f) + '</div>';
    } else {
      out = '<div class="form-grid cols-3">' + dateRange(f);
      if (t === 'pcs') {
        out += selField('lab', 'Lab', C.labs(), f.lab) +
          selField('status', 'Status', C.PC_STATUS, f.status);
      } else if (t === 'staff') {
        out += selField('status', 'Status', C.STAFF_STATUS, f.status) +
          selField('itemName', 'Department', U.uniqueValues(ITL.data.staff(), 'department'), f.itemName);
      } else if (t === 'maintenance') {
        out += selField('lab', 'Lab', C.labs().concat(['Staff Systems']), f.lab) +
          selField('status', 'Status', C.MAINT_STATUS, f.status) +
          selField('category', 'Category', C.PROBLEM_CATEGORIES, f.category) +
          selField('pcName', 'PC', U.uniqueValues(ITL.data.maintenance(), 'pcName'), f.pcName);
      } else if (t === 'store') {
        out += selField('category', 'Category', C.STORE_CATEGORIES, f.category) +
          selField('status', 'Status', C.STORE_STATUS, f.status) +
          selField('itemName', 'Item', U.uniqueValues(ITL.data.store(), 'itemName'), f.itemName);
      } else if (t === 'purchases') {
        out += selField('status', 'Status', C.PURCHASE_STATUS, f.status) +
          selField('itemName', 'Supplier', U.uniqueValues(ITL.data.purchases(), 'supplier'), f.itemName);
      }
      out += '</div>';
    }
    host.innerHTML = out;
  }

  /** Always yields a valid yyyy-MM key from the month/year filters. */
  function monthKeyOf(f) {
    var now = new Date();
    var yr = U.int(f && f.year, now.getFullYear());
    var mo = U.int(f && f.month, now.getMonth() + 1);
    if (!isFinite(yr) || yr < 1970 || yr > 3000) yr = now.getFullYear();
    if (!isFinite(mo) || mo < 1 || mo > 12) mo = now.getMonth() + 1;
    return yr + '-' + String(mo).padStart(2, '0');
  }

  function dateRange(f) {
    return '<div class="field"><label for="repFrom">From date</label>' +
      '<input type="date" id="repFrom" data-rf="from" value="' + U.escAttr(f.from) + '"></div>' +
      '<div class="field"><label for="repTo">To date</label>' +
      '<input type="date" id="repTo" data-rf="to" value="' + U.escAttr(f.to) + '"></div>';
  }

  function selField(key, label, values, selected) {
    return '<div class="field"><label for="rep_' + key + '">' + U.esc(label) + '</label>' +
      '<select id="rep_' + key + '" data-rf="' + key + '"><option value="">All</option>' +
      ui.options(values, selected) + '</select></div>';
  }

  /* ============================================================= DATASET */
  function inRange(dateVal, f) {
    if (!f.from && !f.to) return true;
    var d = U.parseDate(dateVal);
    if (!d) return false;
    if (f.from && d < U.parseDate(f.from)) return false;
    if (f.to && d > U.parseDate(f.to)) return false;
    return true;
  }

  /** Rows + schema for the current report type. */
  function dataset() {
    var v = view(), f = v.filters;
    switch (v.type) {
      case 'pcs':
        return {
          schemaId: 'pcs', label: 'PC Inventory',
          rows: ITL.data.pcs().filter(function (r) {
            if (f.lab && r.lab !== f.lab) return false;
            if (f.status && r.status !== f.status) return false;
            if ((f.from || f.to) && !inRange(r.createdAt, f)) return false;
            return true;
          })
        };
      case 'staff':
        return {
          schemaId: 'staff', label: 'Staff Systems',
          rows: ITL.data.staff().filter(function (r) {
            if (f.status && r.status !== f.status) return false;
            if (f.itemName && r.department !== f.itemName) return false;
            if ((f.from || f.to) && !inRange(r.createdAt, f)) return false;
            return true;
          })
        };
      case 'maintenance':
        return {
          schemaId: 'maintenance', label: 'Maintenance',
          rows: U.sortBy(ITL.data.maintenance().filter(function (r) {
            if (f.lab && r.lab !== f.lab) return false;
            if (f.status && r.status !== f.status) return false;
            if (f.category && r.category !== f.category) return false;
            if (f.pcName && r.pcName !== f.pcName) return false;
            return inRange(r.complaintDate, f);
          }), 'complaintDate', 'desc')
        };
      case 'store':
        return {
          schemaId: 'store', label: 'Store Inventory',
          rows: ITL.data.store().filter(function (r) {
            if (f.category && r.category !== f.category) return false;
            if (f.status && ITL.data.itemStatus(r) !== f.status) return false;
            if (f.itemName && r.itemName !== f.itemName) return false;
            if ((f.from || f.to) && !inRange(r.purchaseDate || r.createdAt, f)) return false;
            return true;
          }).map(function (r) { return Object.assign({}, r, { status: ITL.data.itemStatus(r) }); })
        };
      case 'purchases':
        return {
          schemaId: 'purchases', label: 'Purchases',
          rows: U.sortBy(ITL.data.purchases().filter(function (r) {
            if (f.status && r.status !== f.status) return false;
            if (f.itemName && r.supplier !== f.itemName) return false;
            return inRange(r.purchaseDate, f);
          }), 'purchaseDate', 'desc')
        };
      case 'monthly': {
        var key = monthKeyOf(f);
        return {
          schemaId: 'maintenance', label: 'Monthly Summary', monthKey: key,
          rows: U.sortBy(ITL.data.maintenance().filter(function (r) {
            if (U.monthKey(r.complaintDate) !== key) return false;
            if (f.lab && r.lab !== f.lab) return false;
            return true;
          }), 'complaintDate', 'asc')
        };
      }
      default:
        return { schemaId: 'pcs', label: 'Complete IT Lab Report', rows: ITL.data.pcs() };
    }
  }

  /* ============================================================= PREVIEW */
  function renderPreview(root) {
    var v = view();
    var host = root.querySelector('#repPreview');
    var titleEl = root.querySelector('#repPreviewTitle');
    var subEl = root.querySelector('#repPreviewSub');
    var type = TYPES.filter(function (t) { return t.id === v.type; })[0];

    if (v.type === 'complete') {
      var st = ITL.data.stats();
      titleEl.textContent = 'Complete IT Lab Report — preview';
      subEl.textContent = '10 formatted worksheets';
      host.innerHTML = '<div class="card-body">' +
        '<div class="preview-summary">' +
        tile('PC Inventory', st.pc.total) + tile('Staff Systems', st.staff.total) +
        tile('Maintenance', st.maintenance.total) + tile('Store Items', st.store.total) +
        tile('Transactions', st.transactions.total) + tile('Purchases', st.purchases.total) +
        '</div>' +
        '<div class="divider-label">Sheets in this workbook</div>' +
        '<div class="preview-scroll" style="max-height:none"><table class="data-table compact-table"><thead><tr>' +
        '<th style="width:60px">#</th><th>Sheet name</th><th style="text-align:right">Rows</th></tr></thead><tbody>' +
        completeSheetPlan().map(function (s2, i) {
          return '<tr><td class="mono muted">' + (i + 1) + '</td><td class="cell-primary">' + U.esc(s2.name) + '</td>' +
            '<td class="cell-num">' + U.fmtNum(s2.count) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      return;
    }

    var ds = dataset();
    var schema = ITL.schemas[ds.schemaId];
    var cols = ITL.schemas.exportFields(ds.schemaId).slice(0, 8);

    titleEl.textContent = (type ? type.label : 'Report') + ' — preview';
    subEl.textContent = ds.rows.length + ' record' + (ds.rows.length === 1 ? '' : 's') +
      (ds.monthKey ? ' in ' + U.monthLabel(ds.monthKey) : '');

    if (v.type === 'monthly') {
      host.innerHTML = '<div class="card-body">' + monthlyPreview(ds) + '</div>';
      return;
    }

    if (!ds.rows.length) {
      host.innerHTML = '<div class="card-body">' + ui.emptyState({
        icon: 'inbox',
        title: 'No records match these filters',
        desc: 'Adjust the filters above, or add records in the ' + schema.label + ' module.'
      }) + '</div>';
      return;
    }

    host.innerHTML =
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      cols.map(function (c) { return '<th' + (c.type === 'number' ? ' style="text-align:right"' : '') + '>' + U.esc(c.label) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      ds.rows.slice(0, 50).map(function (r) {
        return '<tr>' + cols.map(function (c) {
          var val = r[c.key];
          if (c.type === 'date') val = val ? U.fmtDate(val) : '';
          else if (c.type === 'number') val = (val === '' || val === undefined || val === null) ? '' : U.fmtNum(val);
          return '<td' + (c.type === 'number' ? ' class="cell-num"' : '') + '>' +
            (U.esc(val) || '<span class="muted">—</span>') + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="table-foot"><div class="tf-info">Preview shows ' +
      Math.min(50, ds.rows.length) + ' of <b>' + U.fmtNum(ds.rows.length) + '</b> records · the Excel file contains every record and every column</div></div>';
  }

  function tile(label, value) {
    return '<div class="stat-tile"><div class="st-label">' + U.esc(label) + '</div><div class="st-value">' + U.fmtNum(value) + '</div></div>';
  }

  function monthlyPreview(ds) {
    var rows = ds.rows;
    var stat = {
      total: rows.length,
      pending: rows.filter(function (r) { return r.status === 'Pending'; }).length,
      progress: rows.filter(function (r) { return r.status === 'In Progress'; }).length,
      resolved: rows.filter(function (r) { return r.status === 'Resolved'; }).length,
      cancelled: rows.filter(function (r) { return r.status === 'Cancelled'; }).length,
      parts: rows.reduce(function (a, r) { return a + U.int(r.quantity, 0); }, 0)
    };
    return '<div class="preview-summary">' +
      tile('Total complaints', stat.total) + tile('Pending', stat.pending) +
      tile('In progress', stat.progress) + tile('Resolved', stat.resolved) +
      tile('Cancelled', stat.cancelled) + tile('Parts used', stat.parts) +
      '</div>' +
      (rows.length
        ? '<div class="divider-label">Records in ' + U.esc(U.monthLabel(ds.monthKey)) + '</div>' +
        '<div class="preview-scroll"><table class="data-table compact-table"><thead><tr>' +
        '<th>Date</th><th>PC</th><th>Problem</th><th>Category</th><th>Part</th><th style="text-align:right">Qty</th><th>Status</th>' +
        '</tr></thead><tbody>' + rows.map(function (r) {
          return '<tr><td class="cell-date">' + U.esc(U.fmtDate(r.complaintDate)) + '</td>' +
            '<td class="cell-primary">' + (U.esc(r.pcName) || '—') + '</td>' +
            '<td>' + (U.esc(r.problem) || '—') + '</td>' +
            '<td>' + (U.esc(r.category) || '—') + '</td>' +
            '<td>' + (U.esc(r.newPart) || '<span class="muted">—</span>') + '</td>' +
            '<td class="cell-num">' + (r.quantity ? U.int(r.quantity) : '') + '</td>' +
            '<td>' + ui.maintStatusBadge(r.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : ui.emptyState({
          icon: 'calendar', compact: true,
          title: 'No maintenance in ' + U.monthLabel(ds.monthKey),
          desc: 'Choose a different month, or clear the lab filter.'
        }));
  }

  function completeSheetPlan() {
    var v = view(), f = v.filters;
    var labs = C.labs();
    var maint = ITL.data.maintenance().filter(function (r) { return inRange(r.complaintDate, f); });
    var purch = ITL.data.purchases().filter(function (r) { return inRange(r.purchaseDate, f); });
    var tx = ITL.data.stockTx().filter(function (r) { return inRange(r.date, f); });
    var plan = [
      { name: 'Executive Summary', count: 0, kind: 'summary' },
      { name: 'PC Inventory', count: ITL.data.pcs().length, kind: 'pcs' }
    ];
    labs.forEach(function (l) {
      plan.push({ name: l, count: ITL.data.pcs().filter(function (p) { return p.lab === l; }).length, kind: 'lab', lab: l });
    });
    plan.push({ name: 'Staff Systems', count: ITL.data.staff().length, kind: 'staff' });
    plan.push({ name: 'Maintenance', count: maint.length, kind: 'maintenance', rows: maint });
    plan.push({ name: 'Store Inventory', count: ITL.data.store().length, kind: 'store' });
    plan.push({ name: 'Stock Transactions', count: tx.length, kind: 'stockTx', rows: tx });
    plan.push({ name: 'Purchases', count: purch.length, kind: 'purchases', rows: purch });
    return plan;
  }

  /* ================================================================ BIND */
  function bind(root) {
    var v = view();

    U.on(root, 'click', '[data-type]', function (e, el) {
      v.type = el.getAttribute('data-type');
      U.qsa('[data-type]', root).forEach(function (b) { b.classList.remove('active'); });
      el.classList.add('active');
      renderFilters(root);
      renderPreview(root);
    });

    U.on(root, 'change', '[data-rf]', function (e, el) {
      v.filters[el.getAttribute('data-rf')] = el.value;
      renderPreview(root);
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      if (a === 'preview') { renderPreview(root); ITL.toast.info('Preview refreshed', '', 1500); }
      else if (a === 'download') rep.download();
      else if (a === 'clear') {
        var now = new Date();
        v.filters = { from: '', to: '', lab: '', status: '', category: '', pcName: '', itemName: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()) };
        renderFilters(root);
        renderPreview(root);
      }
    });
  }

  /* ============================================================ DOWNLOAD */
  rep.download = function () {
    var v = view();
    if (v.type === 'complete') { rep.completeReport(); return; }
    if (v.type === 'monthly') { rep.monthlyReport(); return; }

    var ds = dataset();
    if (!ds.rows.length) { ITL.toast.warn('Nothing to export', 'No records match the selected filters.'); return; }

    var f = v.filters;
    var ft = [];
    Object.keys(f).forEach(function (k) {
      if (k === 'month' || k === 'year') return;
      if (f[k]) ft.push(U.titleCase(k) + ' = ' + (k === 'from' || k === 'to' ? U.fmtDate(f[k]) : f[k]));
    });

    ITL.modal.withBusy('Generating Excel…', 'Building the ' + ds.label + ' report', function () {
      var name = ITL.excel.exportCollection({
        schemaId: ds.schemaId,
        rows: ds.rows,
        scope: ft.length ? 'Filtered records' : 'All records',
        filters: ft.join(', ') || 'None',
        filenameBase: 'IT_Lab_' + U.slug(ds.label) + '_Report',
        totals: ds.schemaId === 'maintenance' ? ['quantity'] :
          ds.schemaId === 'store' ? ['quantity'] :
            ds.schemaId === 'purchases' ? ['quantity'] : false
      });
      ITL.activity.log('Reports', 'Exported', '', 'Generated ' + ds.label + ' report — ' + name + ' (' + ds.rows.length + ' records)');
      ITL.toast.success('Excel downloaded', name);
    });
  };

  /* ------------------------------------------------- monthly maintenance */
  /**
   * monthKeyOverride: optional explicit 'YYYY-MM' (used by the Monthly
   * Archive page to download a specific month directly, without touching
   * the Reports page's own filter state). Falls back to the Reports page
   * filters when omitted, exactly as before.
   */
  rep.monthlyReport = function (monthKeyOverride, labOverride) {
    var key = monthKeyOverride;
    var lab = labOverride;
    if (!key) {
      var v = view(), f = v.filters;
      key = monthKeyOf(f);
      lab = f.lab;
    }
    var label = U.monthLabel(key);
    var rows = U.sortBy(ITL.data.maintenance().filter(function (r) {
      if (U.monthKey(r.complaintDate) !== key) return false;
      if (lab && r.lab !== lab) return false;
      return true;
    }), 'complaintDate', 'asc');

    ITL.modal.withBusy('Generating Excel…', 'Building the monthly maintenance report', function () {
      var s = ITL.settings.get();
      var org = (s.orgName ? s.orgName.toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM';
      var meta = ITL.excel.metaLine({ records: rows.length, scope: label + (lab ? ' · ' + lab : '') });

      var partsUsed = {};
      rows.forEach(function (r) {
        if (!r.newPart || !U.int(r.quantity, 0)) return;
        partsUsed[r.newPart] = (partsUsed[r.newPart] || 0) + U.int(r.quantity, 0);
      });

      var byCat = U.groupCount(rows, 'category');
      var byLab = U.groupCount(rows, 'lab');

      var summarySections = [
        {
          title: 'Complaints', rows: [
            ['Total complaints', rows.length],
            ['Pending', rows.filter(function (r) { return r.status === 'Pending'; }).length],
            ['In Progress', rows.filter(function (r) { return r.status === 'In Progress'; }).length],
            ['Resolved', rows.filter(function (r) { return r.status === 'Resolved'; }).length],
            ['Cancelled', rows.filter(function (r) { return r.status === 'Cancelled'; }).length]
          ]
        },
        { title: 'By Category', rows: Object.keys(byCat).sort().map(function (k2) { return [k2, byCat[k2]]; }) },
        { title: 'By Lab', rows: Object.keys(byLab).sort().map(function (k2) { return [k2, byLab[k2]]; }) },
        {
          title: 'Parts Used', rows: Object.keys(partsUsed).length
            ? Object.keys(partsUsed).sort().map(function (k2) { return [k2, partsUsed[k2]]; })
            : [['No parts consumed', 0]]
        }
      ];

      var sheets = [
        {
          name: 'Summary',
          ws: ITL.excel.buildSummarySheet({
            orgTitle: org, reportTitle: 'MONTHLY MAINTENANCE SUMMARY — ' + label.toUpperCase(),
            metaLine: meta, sections: summarySections
          })
        },
        {
          name: 'Maintenance Records',
          ws: ITL.excel.buildSheet({
            orgTitle: org, reportTitle: 'MAINTENANCE RECORDS — ' + label.toUpperCase(),
            metaLine: meta,
            columns: ITL.schemas.exportFields('maintenance'),
            rows: rows, totals: ['quantity']
          })
        },
        {
          name: 'Parts Used',
          ws: ITL.excel.buildSheet({
            orgTitle: org, reportTitle: 'PARTS CONSUMED — ' + label.toUpperCase(),
            metaLine: meta,
            columns: [
              { key: 'part', label: 'Part', type: 'text', width: 30 },
              { key: 'qty', label: 'Quantity Used', type: 'number', width: 16 }
            ],
            rows: Object.keys(partsUsed).sort().map(function (k2) { return { part: k2, qty: partsUsed[k2] }; }),
            totals: true
          })
        }
      ];

      var fname = 'IT_Lab_Monthly_Maintenance_' + key + '.xlsx';
      ITL.excel.download({ filename: fname, title: 'Monthly Maintenance Report', sheets: sheets });
      ITL.activity.log('Reports', 'Exported', '', 'Generated monthly maintenance report for ' + label);
      ITL.toast.success('Excel downloaded', fname);
    });
  };

  /* ------------------------------------------------- complete 10-sheet */
  rep.completeReport = function () {
    var v = view(), f = v.filters;

    ITL.modal.withBusy('Generating Excel…', 'Building the complete 10-sheet workbook', function () {
      var s = ITL.settings.get();
      var org = (s.orgName ? s.orgName.toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM';
      var meta = ITL.excel.metaLine({
        scope: (f.from || f.to) ? ((f.from ? U.fmtDate(f.from) : 'start') + ' → ' + (f.to ? U.fmtDate(f.to) : 'today')) : 'All data'
      });
      var st = ITL.data.stats();
      var labs = C.labs();

      var pcs = ITL.data.pcs();
      var staff = ITL.data.staff();
      var maint = U.sortBy(ITL.data.maintenance().filter(function (r) { return inRange(r.complaintDate, f); }), 'complaintDate', 'desc');
      var store = ITL.data.store().map(function (r) { return Object.assign({}, r, { status: ITL.data.itemStatus(r) }); });
      var tx = U.sortBy(ITL.data.stockTx().filter(function (r) { return inRange(r.date, f); }), 'date', 'desc');
      var purch = U.sortBy(ITL.data.purchases().filter(function (r) { return inRange(r.purchaseDate, f); }), 'purchaseDate', 'desc');

      var sheets = [];

      /* 1 — Executive Summary */
      sheets.push({
        name: 'Executive Summary',
        ws: ITL.excel.buildSummarySheet({
          orgTitle: org, reportTitle: 'COMPLETE IT LAB REPORT — EXECUTIVE SUMMARY', metaLine: meta,
          sections: [
            {
              title: 'PC Inventory', rows: [
                ['Total PCs', st.pc.total], ['Working', st.pc.working], ['Pending', st.pc.pending],
                ['Faulty', st.pc.faulty], ['Hold', st.pc.hold], ['Retired', st.pc.retired]
              ]
            },
            { title: 'Distribution by Lab', rows: labs.map(function (l) { return [l, st.pc.byLab[l] || 0]; }) },
            { title: 'Staff Systems', rows: [['Total staff systems', st.staff.total], ['Working', st.staff.byStatus['Working'] || 0], ['Faulty', st.staff.byStatus['Faulty'] || 0]] },
            {
              title: 'Maintenance', rows: [
                ['Total records (in range)', maint.length], ['Pending', maint.filter(function (m) { return m.status === 'Pending'; }).length],
                ['In Progress', maint.filter(function (m) { return m.status === 'In Progress'; }).length],
                ['Resolved', maint.filter(function (m) { return m.status === 'Resolved'; }).length],
                ['Cancelled', maint.filter(function (m) { return m.status === 'Cancelled'; }).length],
                ['Parts consumed', maint.reduce(function (a, m) { return a + U.int(m.quantity, 0); }, 0)]
              ]
            },
            {
              title: 'Store Inventory', rows: [
                ['Total item types', st.store.total], ['Total units in stock', st.store.totalUnits],
                ['Available', st.store.available], ['Low Stock', st.store.lowStock],
                ['Out of Stock', st.store.outOfStock], ['Faulty', st.store.faulty], ['Hold', st.store.hold]
              ]
            },
            {
              title: 'Purchases', rows: [
                ['Purchase records (in range)', purch.length],
                ['Units purchased', purch.reduce(function (a, p) { return a + U.int(p.quantity, 0); }, 0)],
                ['Added to store', purch.filter(function (p) { return p.addedToStore; }).length]
              ]
            },
            { title: 'Stock Movements', rows: [['Transactions (in range)', tx.length]] }
          ]
        })
      });

      /* 2 — PC Inventory */
      sheets.push({
        name: 'PC Inventory',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'PC INVENTORY — ALL LABS',
          metaLine: ITL.excel.metaLine({ records: pcs.length }),
          columns: ITL.schemas.exportFields('pcs'), rows: pcs
        })
      });

      /* 3..n — one sheet per lab */
      labs.forEach(function (l) {
        var inLab = pcs.filter(function (p) { return p.lab === l; });
        sheets.push({
          name: l,
          ws: ITL.excel.buildSheet({
            orgTitle: org, reportTitle: 'PC INVENTORY — ' + String(l).toUpperCase(),
            metaLine: ITL.excel.metaLine({ records: inLab.length, scope: l }),
            columns: ITL.schemas.exportFields('pcs'), rows: inLab
          })
        });
      });

      /* Staff Systems */
      sheets.push({
        name: 'Staff Systems',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'STAFF SYSTEMS',
          metaLine: ITL.excel.metaLine({ records: staff.length }),
          columns: ITL.schemas.exportFields('staff'), rows: staff
        })
      });

      /* Maintenance */
      sheets.push({
        name: 'Maintenance',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'MAINTENANCE RECORDS',
          metaLine: ITL.excel.metaLine({ records: maint.length }),
          columns: ITL.schemas.exportFields('maintenance'), rows: maint, totals: ['quantity']
        })
      });

      /* Store Inventory */
      sheets.push({
        name: 'Store Inventory',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'STORE INVENTORY',
          metaLine: ITL.excel.metaLine({ records: store.length }),
          columns: ITL.schemas.exportFields('store'), rows: store, totals: ['quantity']
        })
      });

      /* Stock Transactions */
      sheets.push({
        name: 'Stock Transactions',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'STOCK TRANSACTIONS',
          metaLine: ITL.excel.metaLine({ records: tx.length }),
          columns: ITL.schemas.exportFields('stockTx'), rows: tx, totals: ['quantity']
        })
      });

      /* Purchases */
      sheets.push({
        name: 'Purchases',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'PURCHASE RECORDS',
          metaLine: ITL.excel.metaLine({ records: purch.length }),
          columns: ITL.schemas.exportFields('purchases'), rows: purch,
          totals: ['quantity', 'keyboard', 'mouse', 'lcd', 'ethernetConnector', 'powerCable', 'vgaCable']
        })
      });

      var fname = 'IT_Lab_Complete_Report_' + U.stampDate() + '.xlsx';
      ITL.excel.download({ filename: fname, title: 'Complete IT Lab Report', sheets: sheets });
      ITL.activity.log('Reports', 'Exported', '', 'Generated complete IT lab report (' + sheets.length + ' sheets)');
      ITL.toast.success('Excel downloaded', fname + ' · ' + sheets.length + ' sheets');
    });
  };

})(window);
