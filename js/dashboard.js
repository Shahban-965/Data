/* ==========================================================================
   dashboard.js — live dashboard driven entirely by LocalStorage data
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
  var dash = ITL.dashboard = {};

  pages.dashboard = {
    title: 'Dashboard',

    render: function (root) {
      if (S.isEmpty()) { renderWelcome(root); return; }
      renderDashboard(root);
    }
  };

  /* ============================================================= WELCOME */
  function renderWelcome(root) {
    var s = ITL.settings.get();
    root.innerHTML =
      '<div class="welcome-hero">' +
      '<div class="wh-inner">' +
      '<h2>Welcome to ' + U.esc(s.labName || 'IT Lab Management') + '</h2>' +
      '<p>No records found yet. This application stores everything locally in your browser — no server, no internet connection required. ' +
      'Start by importing your existing Excel workbook, or add your first PC manually.</p>' +
      '<div class="wh-actions">' +
      '<button class="btn btn-primary btn-lg" data-action="import-pcs">' + ITL.icon('upload') + 'Import Existing Excel</button>' +
      '<button class="btn btn-secondary btn-lg" data-action="add-pc">' + ITL.icon('plus') + 'Add First PC</button>' +
      '<button class="btn btn-secondary btn-lg" data-action="restore">' + ITL.icon('rotate') + 'Restore a Backup</button>' +
      '</div>' +
      '</div>' +
      '<div class="wh-steps">' +
      '<div class="wh-step"><span class="n">1</span><div><div class="t">Load your data</div><div class="d">Import your existing Excel sheets or add records by hand.</div></div></div>' +
      '<div class="wh-step"><span class="n">2</span><div><div class="t">Work daily</div><div class="d">Track PCs, faults, store stock and purchases as they happen.</div></div></div>' +
      '<div class="wh-step"><span class="n">3</span><div><div class="t">Report</div><div class="d">Download professional Excel reports for your manager any time.</div></div></div>' +
      '</div></div>' +

      '<div class="dash-section-head"><h3>Get started</h3></div>' +
      '<div class="qa-grid">' + quickActions() + '</div>' +

      '<div class="card mt-4"><div class="card-body">' +
      '<div class="alert alert-info">' + ITL.icon('database') +
      '<div class="alert-body"><div class="alert-title">Where your data lives</div>' +
      'Everything is saved in <b>this browser on this computer</b> using LocalStorage. It survives page refreshes, browser restarts and works completely offline. ' +
      'It does <b>not</b> sync automatically to other computers — use <b>Backup &amp; Restore</b> or Excel export to move data between machines.</div></div>' +
      '</div></div>';

    bind(root);
  }

  /* =========================================================== DASHBOARD */
  function renderDashboard(root) {
    var st = ITL.data.stats();
    var alerts = ITL.data.alerts(8);
    var s = ITL.settings.get();
    var labs = C.labs();

    root.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Dashboard</div>' +
      '<div class="page-sub">Live overview of ' + U.esc(s.orgName || 'your IT labs') + ' — every figure is calculated from your local records</div></div>' +
      '<div class="page-head-actions">' +
      '<button class="btn btn-secondary" data-action="refresh">' + ITL.icon('refresh') + 'Refresh</button>' +
      '<button class="btn btn-excel" data-action="download-report">' + ITL.icon('excel') + 'Download Report</button>' +
      '</div></div>' +

      /* ---- PC statistics ---- */
      '<div class="dash-section-head"><h3>' + ITL.icon('desktop') + ' PC statistics</h3>' +
      '<div class="dsh-actions"><button class="btn btn-ghost btn-sm" data-action="goto-inventory">View all ' + ITL.icon('arrowRight') + '</button></div></div>' +
      '<div class="stat-grid">' +
      ui.statCard({ label: 'Total PCs', value: st.pc.total, icon: 'desktop', color: '#3b66f6', bg: 'var(--info-bg)', action: 'goto-inventory' }) +
      ui.statCard({ label: 'Working', value: st.pc.working, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'goto-pc-status', args: { status: 'Working' } }) +
      ui.statCard({ label: 'Pending', value: st.pc.pending, icon: 'clock', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'goto-pc-status', args: { status: 'Pending' } }) +
      ui.statCard({ label: 'Faulty', value: st.pc.faulty, icon: 'alert', color: '#ef4444', bg: 'var(--danger-bg)', action: 'goto-pc-status', args: { status: 'Faulty' } }) +
      ui.statCard({ label: 'Hold', value: st.pc.hold, icon: 'slash', color: '#3b82f6', bg: 'var(--info-bg)', action: 'goto-pc-status', args: { status: 'Hold' } }) +
      ui.statCard({ label: 'Retired', value: st.pc.retired, icon: 'archive', color: '#94a3b8', bg: 'var(--neutral-bg)', action: 'goto-pc-status', args: { status: 'Retired' } }) +
      '</div>' +

      /* ---- Lab / staff distribution ---- */
      '<div class="dash-section-head"><h3>' + ITL.icon('building') + ' Labs &amp; staff systems</h3></div>' +
      '<div class="stat-grid">' +
      labs.map(function (l, i) {
        return ui.statCard({
          label: l, value: st.pc.byLab[l] || 0, icon: 'layers',
          color: ui.palette[i % ui.palette.length], bg: 'var(--bg-surface-3)',
          action: 'goto-lab', args: { lab: l }
        });
      }).join('') +
      ui.statCard({ label: 'Staff Systems', value: st.staff.total, icon: 'users', color: '#8b5cf6', bg: 'var(--purple-bg)', action: 'goto-staff' }) +
      '</div>' +

      /* ---- Maintenance ---- */
      '<div class="dash-section-head"><h3>' + ITL.icon('wrench') + ' Maintenance</h3>' +
      '<div class="dsh-actions"><button class="btn btn-ghost btn-sm" data-action="goto-maintenance">View all ' + ITL.icon('arrowRight') + '</button></div></div>' +
      '<div class="stat-grid">' +
      ui.statCard({ label: 'Total faults', value: st.maintenance.total, icon: 'wrench', color: '#3b66f6', bg: 'var(--info-bg)', action: 'goto-maintenance' }) +
      ui.statCard({ label: 'Pending', value: st.maintenance.pending, icon: 'clock', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'goto-mt-status', args: { status: 'Pending' } }) +
      ui.statCard({ label: 'In progress', value: st.maintenance.inProgress, icon: 'tool', color: '#3b82f6', bg: 'var(--info-bg)', action: 'goto-mt-status', args: { status: 'In Progress' } }) +
      ui.statCard({ label: 'Resolved', value: st.maintenance.resolved, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'goto-mt-status', args: { status: 'Resolved' } }) +
      ui.statCard({ label: 'This month', value: st.maintenance.thisMonth, icon: 'calendar', color: '#8b5cf6', bg: 'var(--purple-bg)' }) +
      '</div>' +

      /* ---- Store & purchases ---- */
      '<div class="dash-section-head"><h3>' + ITL.icon('package') + ' Store &amp; purchases</h3>' +
      '<div class="dsh-actions"><button class="btn btn-ghost btn-sm" data-action="goto-store">View store ' + ITL.icon('arrowRight') + '</button></div></div>' +
      '<div class="stat-grid">' +
      ui.statCard({ label: 'Store items', value: st.store.total, icon: 'package', color: '#3b66f6', bg: 'var(--info-bg)', meta: U.fmtNum(st.store.totalUnits) + ' units', action: 'goto-store' }) +
      ui.statCard({ label: 'Available', value: st.store.available, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'goto-store-status', args: { status: 'Available' } }) +
      ui.statCard({ label: 'Low stock', value: st.store.lowStock, icon: 'alert', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'goto-store-status', args: { status: 'Low Stock' } }) +
      ui.statCard({ label: 'Out of stock', value: st.store.outOfStock, icon: 'slash', color: '#ef4444', bg: 'var(--danger-bg)', action: 'goto-store-status', args: { status: 'Out of Stock' } }) +
      ui.statCard({ label: 'Purchases', value: st.purchases.total, icon: 'cart', color: '#06b6d4', bg: 'var(--info-bg)', meta: st.purchases.thisMonth + ' this month', action: 'goto-purchases' }) +
      ui.statCard({ label: 'Stock movements', value: st.transactions.total, icon: 'history', color: '#8b5cf6', bg: 'var(--purple-bg)', action: 'goto-tx' }) +
      '</div>' +

      /* ---- Charts ---- */
      '<div class="dash-section-head"><h3>' + ITL.icon('barChart') + ' Charts</h3></div>' +
      '<div class="chart-grid">' +
      chartCard('PCs by Lab', 'layers', ui.barChart(
        Object.keys(st.pc.byLab).map(function (l, i) {
          return { label: l, value: st.pc.byLab[l], color: ui.palette[i % ui.palette.length] };
        }), { emptyMsg: 'Add PCs to see how they are distributed across labs.' })) +

      chartCard('PC Status', 'pieChart', ui.donutChart(
        C.PC_STATUS.map(function (s2) { return { label: s2, value: st.pc.byStatus[s2] || 0 }; }),
        { centerLabel: 'PCs', emptyMsg: 'Add PCs to see the status breakdown.' })) +

      chartCard('Maintenance Status', 'pieChart', ui.donutChart(
        C.MAINT_STATUS.map(function (s2) { return { label: s2, value: st.maintenance.byStatus[s2] || 0 }; }),
        { centerLabel: 'Faults', emptyMsg: 'Report a fault to see maintenance statistics.' })) +

      chartCard('Monthly Maintenance (last 6 months)', 'barChart',
        ui.columnChart(ITL.data.monthlyMaintenance(6), {
          color: '#f59e0b', emptyMsg: 'No maintenance recorded in the last six months.'
        })) +

      chartCard('Store Stock Status', 'package', ui.barChart(
        C.STORE_STATUS.map(function (s2) { return { label: s2, value: st.store.byStatus[s2] || 0 }; }),
        { emptyMsg: 'Add store items to see their stock status.' })) +

      chartCard('Purchase Activity (last 6 months)', 'cart',
        ui.columnChart(ITL.data.monthlyPurchases(6), {
          color: '#06b6d4', emptyMsg: 'No purchases recorded in the last six months.'
        })) +
      '</div>' +

      /* ---- Alerts + quick actions + activity ---- */
      '<div class="grid-main-side mt-5">' +
      '<div class="stack-4">' +
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><div class="card-title">Alerts &amp; attention required</div>' +
      '<div class="card-sub">' + (alerts.length ? alerts.length + ' item' + (alerts.length === 1 ? '' : 's') + ' need attention' : 'Everything looks healthy') + '</div></div>' +
      '<div class="card-head-actions">' +
      (ITL.data.alerts().length > 8 ? '<span class="muted" style="font-size:12px">Showing 8 of ' + ITL.data.alerts().length + '</span>' : '') +
      '</div></div>' +
      (alerts.length
        ? '<div class="alert-list">' + alerts.map(alertRow).join('') + '</div>'
        : '<div class="card-body">' + ui.emptyState({
          icon: 'checkCircle', compact: true,
          title: 'No alerts',
          desc: 'No faulty PCs, no pending maintenance and no low stock items. Nice work.'
        }) + '</div>') +
      '</div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Quick actions</div>' +
      '<div class="card-sub">Everything you need for daily work</div></div>' +
      '<div class="card-body"><div class="qa-grid">' + quickActions() + '</div></div></div>' +
      '</div>' +

      '<div class="stack-4">' +
      '<div class="card"><div class="card-head">' +
      '<div class="modal-head-ico">' + ITL.icon('database') + '</div>' +
      '<div><div class="card-title">Database status</div><div class="card-sub">Local storage</div></div></div>' +
      '<div class="card-body">' + dbStatus() + '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Recent activity</div>' +
      '<div class="card-head-actions"><button class="btn btn-ghost btn-sm" data-action="goto-activity">All ' + ITL.icon('arrowRight') + '</button></div></div>' +
      '<div class="card-body">' + recentActivity(10) + '</div></div>' +
      '</div></div>';

    bind(root);
  }

  function chartCard(title, icon, content) {
    return '<div class="card"><div class="card-head">' +
      '<div class="card-title">' + U.esc(title) + '</div></div>' +
      '<div class="card-body"><div class="chart-box">' + content + '</div></div></div>';
  }

  function alertRow(a) {
    var toneMap = {
      danger: { bg: 'var(--danger-bg)', fg: 'var(--danger-fg)' },
      warn: { bg: 'var(--warn-bg)', fg: 'var(--warn-fg)' },
      info: { bg: 'var(--info-bg)', fg: 'var(--info-fg)' }
    };
    var t = toneMap[a.tone] || toneMap.info;
    return '<div class="alert-row" data-action="open-alert" data-args="' +
      U.escAttr(JSON.stringify({ page: a.page, id: a.recordId })) + '" role="button" tabindex="0">' +
      '<div class="ar-ico" style="background:' + t.bg + ';color:' + t.fg + '">' + ITL.icon(a.icon) + '</div>' +
      '<div class="ar-body"><div class="ar-title">' + U.esc(a.title) + ' · ' + U.esc(a.name) + '</div>' +
      '<div class="ar-desc">' + U.esc(a.desc) + '</div></div>' +
      '<div class="ar-arrow">' + ITL.icon('chevronRight') + '</div></div>';
  }

  function quickActions() {
    var items = [
      { label: 'Add PC', hint: 'Register a lab computer', icon: 'desktop', action: 'add-pc', bg: 'var(--info-bg)', fg: '#3b66f6' },
      { label: 'Report Fault', hint: 'Log a new problem', icon: 'wrench', action: 'add-fault', bg: 'var(--warn-bg)', fg: '#f59e0b' },
      { label: 'Add Staff System', hint: 'Staff computer', icon: 'users', action: 'add-staff', bg: 'var(--purple-bg)', fg: '#8b5cf6' },
      { label: 'Add Store Item', hint: 'New part or consumable', icon: 'package', action: 'add-item', bg: 'var(--success-bg)', fg: '#10b981' },
      { label: 'Add Stock', hint: 'Increase a quantity', icon: 'plusCircle', action: 'add-stock', bg: 'var(--success-bg)', fg: '#10b981' },
      { label: 'Record Purchase', hint: 'Log procurement', icon: 'cart', action: 'add-purchase', bg: 'var(--info-bg)', fg: '#06b6d4' },
      { label: 'Generate Report', hint: 'Excel reports', icon: 'chart', action: 'goto-reports', bg: 'var(--neutral-bg)', fg: '#64748b' },
      { label: 'Backup', hint: 'Export a JSON backup', icon: 'save', action: 'backup', bg: 'var(--purple-bg)', fg: '#8b5cf6' }
    ];
    return items.map(function (i) {
      return '<button class="qa-btn" data-action="' + i.action + '">' +
        '<span class="qa-ico" style="background:' + i.bg + ';color:' + i.fg + '">' + ITL.icon(i.icon) + '</span>' +
        '<span><span class="qa-text">' + U.esc(i.label) + '</span><br><span class="qa-hint">' + U.esc(i.hint) + '</span></span>' +
        '</button>';
    }).join('');
  }

  function dbStatus() {
    var counts = S.counts();
    var usage = S.usage();
    var meta = S.get(K.meta) || {};
    return '<div class="' + (S.isAvailable() ? 'db-status' : 'db-status warn') + '">' +
      ITL.icon(S.isAvailable() ? 'checkCircle' : 'alert') +
      (S.isAvailable() ? 'LocalStorage active · data is saved' : 'LocalStorage unavailable') + '</div>' +
      '<div style="margin-top:12px">' +
      '<div class="row-2" style="justify-content:space-between;font-size:12px"><span class="muted">Storage used</span>' +
      '<b>' + U.bytes(usage.bytes) + '</b></div>' +
      '<div class="bar-track" style="margin-top:5px"><div class="bar-fill" style="width:' + Math.max(1, usage.percent).toFixed(1) + '%;background:' +
      (usage.percent > 85 ? 'var(--danger-solid)' : usage.percent > 60 ? 'var(--warn-solid)' : 'var(--success-solid)') + '"></div></div>' +
      '</div><hr>' +
      ui.kv([
        ['PC records', U.fmtNum(counts.pcs)],
        ['Staff systems', U.fmtNum(counts.staff)],
        ['Maintenance', U.fmtNum(counts.maintenance)],
        ['Store items', U.fmtNum(counts.store)],
        ['Transactions', U.fmtNum(counts.stockTx)],
        ['Purchases', U.fmtNum(counts.purchases)],
        ['Last saved', meta.lastWrite ? U.timeAgo(meta.lastWrite) : '—']
      ]);
  }

  function recentActivity(limit) {
    var rows = ITL.activity.list(limit);
    if (!rows.length) {
      return ui.emptyState({ icon: 'activity', compact: true, title: 'No activity yet', desc: 'Actions you take are recorded here.' });
    }
    return '<div class="timeline">' + rows.map(function (r) {
      return '<div class="tl-item">' +
        '<div class="tl-rail"><div class="tl-dot"></div><div class="tl-line"></div></div>' +
        '<div class="tl-body">' +
        '<div class="tl-title">' + U.esc(r.action) + ' · <span class="muted">' + U.esc(r.module) + '</span></div>' +
        '<div class="tl-desc">' + U.esc(r.description) + '</div>' +
        '<div class="tl-time">' + U.esc(U.timeAgo(r.timestamp)) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* ================================================================ BIND */
  function bind(root) {
    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      var args = el.getAttribute('data-args');
      try { args = args ? JSON.parse(args) : null; } catch (x) { args = null; }

      switch (a) {
        case 'add-pc': ITL.inventory.openForm(); break;
        case 'add-fault': ITL.maintenance.openForm(); break;
        case 'add-staff': ITL.staffPage.openForm(); break;
        case 'add-item': ITL.store.openForm(); break;
        case 'add-stock': ITL.stock.openModal('Stock In', null, function () { ITL.router.reload(); }); break;
        case 'add-purchase': ITL.purchases.openForm(); break;
        case 'goto-reports': ITL.router.go('reports'); break;
        case 'backup': ITL.backup.exportBackup(); break;
        case 'restore': ITL.backup.openRestore(); break;
        case 'import-pcs': ITL.inventory.importExcel(); break;
        case 'download-report': dash.downloadReport(); break;
        case 'refresh': ITL.router.reload(); ITL.toast.info('Dashboard refreshed', 'Statistics recalculated from local storage', 1800); break;
        case 'goto-inventory': ITL.router.go('inventory'); break;
        case 'goto-staff': ITL.router.go('staff'); break;
        case 'goto-maintenance': ITL.router.go('maintenance'); break;
        case 'goto-store': ITL.router.go('store'); break;
        case 'goto-purchases': ITL.router.go('purchases'); break;
        case 'goto-tx': ITL.router.go('store', { tab: 'tx' }); break;
        case 'goto-activity': ITL.router.go('backup', { tab: 'activity' }); break;
        case 'goto-lab': if (args) ITL.router.go('inventory', { lab: args.lab }); break;
        case 'goto-pc-status': if (args) ITL.router.go('inventory', { status: args.status }); break;
        case 'goto-mt-status': if (args) ITL.router.go('maintenance', { status: args.status }); break;
        case 'goto-store-status': if (args) ITL.router.go('store', { status: args.status }); break;
        case 'open-alert':
          if (args) ITL.router.go(args.page, { open: args.id, focus: args.id });
          break;
      }
    });

    U.on(root, 'keydown', '[role="button"]', function (e, el) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  }

  /* ===================================================== DASHBOARD REPORT */
  dash.downloadReport = function () {
    ITL.modal.withBusy('Generating Excel…', 'Building the executive dashboard report', function () {
      var st = ITL.data.stats();
      var s = ITL.settings.get();
      var org = (s.orgName ? s.orgName.toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM';
      var meta = ITL.excel.metaLine({});
      var labs = C.labs();
      var sheets = [];

      /* Executive summary */
      sheets.push({
        name: 'Executive Summary',
        ws: ITL.excel.buildSummarySheet({
          orgTitle: org,
          reportTitle: 'EXECUTIVE SUMMARY',
          metaLine: meta,
          sections: [
            {
              title: 'PC Inventory', rows: [
                ['Total PCs', st.pc.total], ['Working', st.pc.working], ['Pending', st.pc.pending],
                ['Faulty', st.pc.faulty], ['Hold', st.pc.hold], ['Retired', st.pc.retired]
              ]
            },
            { title: 'Labs', rows: labs.map(function (l) { return [l, st.pc.byLab[l] || 0]; }).concat([['Staff Systems', st.staff.total]]) },
            {
              title: 'Maintenance', rows: [
                ['Total faults', st.maintenance.total], ['Pending', st.maintenance.pending],
                ['In Progress', st.maintenance.inProgress], ['Resolved', st.maintenance.resolved],
                ['Cancelled', st.maintenance.cancelled], ['This month', st.maintenance.thisMonth]
              ]
            },
            {
              title: 'Store Inventory', rows: [
                ['Total items', st.store.total], ['Available', st.store.available],
                ['Low Stock', st.store.lowStock], ['Out of Stock', st.store.outOfStock],
                ['Faulty', st.store.faulty], ['Hold', st.store.hold], ['Total units in stock', st.store.totalUnits]
              ]
            },
            {
              title: 'Purchases', rows: [
                ['Total purchases', st.purchases.total], ['This month', st.purchases.thisMonth],
                ['Units purchased', st.purchases.units]
              ]
            },
            { title: 'Stock Movements', rows: [['Total transactions', st.transactions.total]] }
          ]
        })
      });

      /* PC summary by lab & status */
      var pcSummary = [];
      labs.concat(['Unassigned']).forEach(function (l) {
        var inLab = ITL.data.pcs().filter(function (p) {
          return l === 'Unassigned' ? labs.indexOf(p.lab) === -1 : p.lab === l;
        });
        if (!inLab.length && l === 'Unassigned') return;
        pcSummary.push({
          lab: l, total: inLab.length,
          working: inLab.filter(function (p) { return p.status === 'Working'; }).length,
          pending: inLab.filter(function (p) { return p.status === 'Pending'; }).length,
          faulty: inLab.filter(function (p) { return p.status === 'Faulty'; }).length,
          hold: inLab.filter(function (p) { return p.status === 'Hold'; }).length,
          retired: inLab.filter(function (p) { return p.status === 'Retired'; }).length
        });
      });
      sheets.push({
        name: 'PC Summary',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'PC SUMMARY BY LAB', metaLine: meta,
          columns: [
            { key: 'lab', label: 'Lab', type: 'text', width: 20 },
            { key: 'total', label: 'Total PCs', type: 'number', width: 12 },
            { key: 'working', label: 'Working', type: 'number', width: 12 },
            { key: 'pending', label: 'Pending', type: 'number', width: 12 },
            { key: 'faulty', label: 'Faulty', type: 'number', width: 12 },
            { key: 'hold', label: 'Hold', type: 'number', width: 12 },
            { key: 'retired', label: 'Retired', type: 'number', width: 12 }
          ],
          rows: pcSummary, totals: true
        })
      });

      /* Maintenance summary by category + month */
      var byCat = U.groupCount(ITL.data.maintenance(), 'category');
      sheets.push({
        name: 'Maintenance Summary',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'MAINTENANCE SUMMARY', metaLine: meta,
          columns: [
            { key: 'category', label: 'Problem Category', type: 'text', width: 26 },
            { key: 'count', label: 'Total Faults', type: 'number', width: 14 },
            { key: 'pending', label: 'Pending', type: 'number', width: 12 },
            { key: 'progress', label: 'In Progress', type: 'number', width: 13 },
            { key: 'resolved', label: 'Resolved', type: 'number', width: 12 }
          ],
          rows: Object.keys(byCat).sort().map(function (cat) {
            var inCat = ITL.data.maintenance().filter(function (m) { return (m.category || 'Unspecified') === cat; });
            return {
              category: cat, count: inCat.length,
              pending: inCat.filter(function (m) { return m.status === 'Pending'; }).length,
              progress: inCat.filter(function (m) { return m.status === 'In Progress'; }).length,
              resolved: inCat.filter(function (m) { return m.status === 'Resolved'; }).length
            };
          }),
          totals: true
        })
      });

      /* Store summary */
      sheets.push({
        name: 'Store Summary',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'STORE INVENTORY SUMMARY', metaLine: meta,
          columns: [
            { key: 'category', label: 'Category', type: 'text', width: 24 },
            { key: 'items', label: 'Item Types', type: 'number', width: 13 },
            { key: 'units', label: 'Total Units', type: 'number', width: 13 },
            { key: 'low', label: 'Low Stock', type: 'number', width: 12 },
            { key: 'out', label: 'Out of Stock', type: 'number', width: 14 }
          ],
          rows: (function () {
            var cats = U.uniqueValues(ITL.data.store(), 'category');
            return cats.map(function (c2) {
              var inCat = ITL.data.store().filter(function (i) { return i.category === c2; });
              return {
                category: c2, items: inCat.length,
                units: inCat.reduce(function (a, i) { return a + U.int(i.quantity, 0); }, 0),
                low: inCat.filter(function (i) { return ITL.data.itemStatus(i) === 'Low Stock'; }).length,
                out: inCat.filter(function (i) { return ITL.data.itemStatus(i) === 'Out of Stock'; }).length
              };
            });
          })(),
          totals: true
        })
      });

      /* Purchase summary by month */
      sheets.push({
        name: 'Purchase Summary',
        ws: ITL.excel.buildSheet({
          orgTitle: org, reportTitle: 'PURCHASE SUMMARY BY MONTH', metaLine: meta,
          columns: [
            { key: 'month', label: 'Month', type: 'text', width: 18 },
            { key: 'orders', label: 'Purchase Records', type: 'number', width: 18 },
            { key: 'units', label: 'Units', type: 'number', width: 12 }
          ],
          rows: ITL.data.monthlyPurchases(12).map(function (m) {
            return { month: m.full, orders: m.value, units: m.units };
          }),
          totals: true
        })
      });

      var fname = 'IT_Lab_Dashboard_Report_' + U.stampDate() + '.xlsx';
      ITL.excel.download({ filename: fname, title: 'Dashboard Report', sheets: sheets });
      ITL.activity.log('Dashboard', 'Exported', '', 'Downloaded dashboard executive report');
      ITL.toast.success('Excel downloaded', fname);
    });
  };

})(window);
