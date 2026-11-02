/* ==========================================================================
   archive.js — Monthly Archive page
   The current calendar month's maintenance report stays "live" and keeps
   updating as you add records. The moment the month rolls over, that
   month automatically drops into the archive list below — nothing is
   ever deleted, and every past month stays one click away to download
   as its own Excel workbook, exactly as it stood.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var ui = ITL.ui;

  var pages = ITL.pages = ITL.pages || {};

  var STATUS_TONE = { 'Pending': 'warn', 'In Progress': 'info', 'Resolved': 'success', 'Cancelled': 'neutral' };

  /* ============================================================ PAGE */
  pages.archive = {
    title: 'Monthly Archive',

    render: function (root) {
      var months = buildMonths();

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Monthly Archive</div>' +
        '<div class="page-sub">The current month updates live. Finished months move to the archive automatically — download and preserve each one.</div></div>' +
        '</div>' +

        '<div class="alert alert-info mb-4">' + ITL.icon('info') +
        '<div class="alert-body"><div class="alert-title">How this works</div>' +
        'This month\'s maintenance report keeps updating automatically as you log new complaints and repairs. ' +
        'The instant the calendar rolls into a new month, this month freezes into the archive list below as its own ' +
        'entry — download it as a formatted Excel file. Archived maintenance history is locked to protect your audit trail.</div></div>' +

        '<div class="divider-label">Current month — live</div>' +
        '<div id="arcCurrent"></div>' +

        '<div class="divider-label mt-4">Archived months</div>' +
        '<div id="arcPast"></div>';

      renderCurrent(root, months.current);
      renderPast(root, months.past);
      bind(root);
    }
  };

  /* New-month watcher: when the calendar month changes, the finished month drops into the archive and a fresh month starts. */
  var lastKey = U.monthKey(new Date());
  setInterval(function () {
    var k = U.monthKey(new Date());
    if (k === lastKey) return;
    var prev = lastKey; lastKey = k;
    if (ITL.toast) ITL.toast.info('New month started', U.monthLabel(prev) + ' was archived automatically. ' + U.monthLabel(k) + ' starts now.');
    if (ITL.router && ITL.router.reload) ITL.router.reload();
    if (ITL.app && ITL.app.refreshChrome) ITL.app.refreshChrome();
  }, 30000);

  /* ============================================================ DATA */
  function buildMonths() {
    var rows = ITL.data.maintenance();
    var byKey = Object.create(null);
    rows.forEach(function (r) {
      var k = U.monthKey(r.complaintDate);
      if (!k) return;
      (byKey[k] = byKey[k] || []).push(r);
    });

    var nowKey = U.monthKey(new Date());
    if (!byKey[nowKey]) byKey[nowKey] = []; // always show the current month, even with 0 records yet

    var keys = Object.keys(byKey).sort().reverse(); // newest first
    var past = keys.filter(function (k) { return k !== nowKey; }).map(function (k) { return summarize(k, byKey[k]); });
    var current = summarize(nowKey, byKey[nowKey]);

    return { current: current, past: past };
  }

  function summarize(key, rows) {
    var stat = {
      key: key,
      label: U.monthLabel(key),
      total: rows.length,
      pending: rows.filter(function (r) { return r.status === 'Pending'; }).length,
      progress: rows.filter(function (r) { return r.status === 'In Progress'; }).length,
      resolved: rows.filter(function (r) { return r.status === 'Resolved'; }).length,
      cancelled: rows.filter(function (r) { return r.status === 'Cancelled'; }).length,
      parts: rows.reduce(function (a, r) { return a + U.int(r.quantity, 0); }, 0),
      lastActivity: rows.length ? U.sortBy(rows.slice(), 'complaintDate', 'desc')[0].complaintDate : ''
    };
    return stat;
  }

  /* ============================================================ RENDER */
  function tile(label, value, tone) {
    return '<div class="stat-tile"><div class="st-label">' + U.esc(label) + '</div>' +
      '<div class="st-value"' + (tone ? ' style="color:var(--' + tone + '-fg)"' : '') + '>' + U.fmtNum(value) + '</div></div>';
  }

  function renderCurrent(root, m) {
    var host = root.querySelector('#arcCurrent');
    host.innerHTML =
      '<div class="card">' +
      '<div class="card-head">' +
      '<div><div class="card-title">' + U.esc(m.label) +
      ' <span class="badge badge-success" style="margin-left:6px">' + ITL.icon('activity') + ' Live — updating</span></div>' +
      '<div class="card-sub">Keeps counting every new complaint and repair you log this month</div></div>' +
      '<div class="card-head-actions">' +
      '<button class="btn btn-excel btn-sm" data-action="download" data-key="' + U.escAttr(m.key) + '">' +
      ITL.icon('excel') + 'Download this month</button>' +
      '</div></div>' +
      '<div class="card-body">' +
      (m.total ?
        '<div class="preview-summary">' +
        tile('Total complaints', m.total) + tile('Pending', m.pending, 'warn') +
        tile('In progress', m.progress, 'info') + tile('Resolved', m.resolved, 'success') +
        tile('Cancelled', m.cancelled) + tile('Parts used', m.parts) +
        '</div>'
        :
        ui.emptyState({
          icon: 'calendar', compact: true, title: 'Nothing logged yet this month',
          desc: 'Add a maintenance record and it will show up here immediately.',
          actions: [{ label: 'Go to Maintenance', icon: 'wrench', cls: 'btn-primary', action: 'go-maintenance' }]
        })
      ) +
      '</div></div>';
  }

  function renderPast(root, list) {
    var host = root.querySelector('#arcPast');
    if (!list.length) {
      host.innerHTML = '<div class="card"><div class="card-body">' +
        ui.emptyState({
          icon: 'archive', compact: true, title: 'No archived months yet',
          desc: 'Once the calendar moves past ' + U.monthLabel(U.monthKey(new Date())) + ', it will lock in here automatically.'
        }) + '</div></div>';
      return;
    }

    host.innerHTML = '<div class="stack-2">' + list.map(function (m) {
      return '<div class="card">' +
        '<div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:220px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-weight:700;font-size:14px">' + U.esc(m.label) + '</span>' +
        '<span class="badge badge-neutral no-dot">' + ITL.icon('lock') + ' Archived</span>' +
        '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:4px">' +
        U.fmtNum(m.total) + ' complaint' + (m.total === 1 ? '' : 's') +
        ' · ' + U.fmtNum(m.resolved) + ' resolved' +
        ' · ' + U.fmtNum(m.parts) + ' part' + (m.parts === 1 ? '' : 's') + ' used' +
        '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        statusChip('Pending', m.pending) + statusChip('In Progress', m.progress) +
        statusChip('Resolved', m.resolved) + statusChip('Cancelled', m.cancelled) +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-excel btn-sm" data-action="download" data-key="' + U.escAttr(m.key) + '">' +
        ITL.icon('excel') + 'Download</button>' +
        '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  function statusChip(label, n) {
    if (!n) return '';
    return ui.badge(label + ' ' + n, STATUS_TONE[label] || 'neutral', true);
  }

  /* ============================================================ EVENTS */
  function bind(root) {
    U.on(root, 'click', '[data-action="download"]', function (e, el) {
      var key = el.getAttribute('data-key');
      if (ITL.reports && ITL.reports.monthlyReport) ITL.reports.monthlyReport(key);
    });
    U.on(root, 'click', '[data-action="go-maintenance"]', function () {
      ITL.router.go('maintenance');
    });
  }

})(window);
