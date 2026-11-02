/* ==========================================================================
   ui.js — reusable UI components: badges, tables, pagination, charts,
           empty/loading states, detail fields, password cells
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var C = ITL.constants;

  var ui = ITL.ui = {};

  /* ------------------------------------------------------------- BADGES */
  ui.badge = function (text, tone, noDot) {
    if (!text) return '<span class="muted">—</span>';
    return '<span class="badge badge-' + (tone || 'neutral') + (noDot ? ' no-dot' : '') + '">' + U.esc(text) + '</span>';
  };

  ui.pcStatusBadge = function (s) { return ui.badge(s || 'Working', C.PC_STATUS_TONE[s] || 'neutral'); };
  ui.maintStatusBadge = function (s) { return ui.badge(s || 'Pending', C.MAINT_STATUS_TONE[s] || 'neutral'); };
  ui.storeStatusBadge = function (s) { return ui.badge(s, C.STORE_STATUS_TONE[s] || 'neutral'); };
  ui.txBadge = function (t) { return ui.badge(t, C.TX_TONE[t] || 'neutral'); };
  ui.purchaseStatusBadge = function (s) { return ui.badge(s, C.PURCHASE_STATUS_TONE[s] || 'neutral'); };

  ui.labBadge = function (lab) {
    if (!lab) return '<span class="muted">—</span>';
    var labs = C.labs();
    var tones = ['info', 'purple', 'success', 'warn'];
    var i = labs.indexOf(lab);
    return '<span class="badge badge-' + (i >= 0 ? tones[i % tones.length] : 'neutral') + ' no-dot">' + U.esc(lab) + '</span>';
  };

  /* --------------------------------------------------------- EMPTY STATE */
  /**
   * opts: { icon, title, desc, actions:[{label, icon, cls, action, args}] }
   * Actions use data-action attributes handled by the owning page.
   */
  ui.emptyState = function (opts) {
    opts = opts || {};
    var acts = (opts.actions || []).map(function (a) {
      return '<button type="button" class="btn ' + (a.cls || 'btn-secondary') + '"' +
        (a.action ? ' data-action="' + U.esc(a.action) + '"' : '') +
        (a.args ? ' data-args="' + U.escAttr(JSON.stringify(a.args)) + '"' : '') + '>' +
        (a.icon ? ITL.icon(a.icon) : '') + U.esc(a.label) + '</button>';
    }).join('');
    return '<div class="empty-state' + (opts.compact ? ' compact' : '') + '">' +
      '<div class="es-ico">' + ITL.icon(opts.icon || 'inbox') + '</div>' +
      '<h4>' + U.esc(opts.title || 'No records found') + '</h4>' +
      (opts.desc ? '<p>' + U.esc(opts.desc) + '</p>' : '') +
      (acts ? '<div class="es-actions">' + acts + '</div>' : '') +
      '</div>';
  };

  ui.loadingRows = function (cols, rows) {
    var out = '';
    for (var r = 0; r < (rows || 5); r++) {
      out += '<tr>';
      for (var c = 0; c < cols; c++) out += '<td><div class="skeleton sk-line"></div></td>';
      out += '</tr>';
    }
    return out;
  };

  ui.loadingOverlay = function () {
    return '<div class="load-overlay"><div class="load-spinner"></div></div>';
  };

  /* ------------------------------------------------------- PASSWORD CELL */
  var pwSeq = 0;
  ui.passwordCell = function (value, alwaysMask) {
    if (!value) return '<span class="muted">—</span>';
    var id = 'pw' + (++pwSeq);
    return '<span class="pw-cell">' +
      '<span class="pw-val" id="' + id + '" data-pw="' + U.escAttr(value) + '" data-shown="0">••••••••</span>' +
      '<button type="button" class="pw-toggle" data-pw-toggle="' + id + '" title="Show / hide password" aria-label="Show or hide password">' +
      ITL.icon('eye') + '</button></span>';
  };

  /** Global delegated handler for password reveal toggles. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pw-toggle]');
    if (!btn) return;
    e.stopPropagation();
    var span = document.getElementById(btn.getAttribute('data-pw-toggle'));
    if (!span) return;
    var shown = span.getAttribute('data-shown') === '1';
    if (shown) {
      span.textContent = '••••••••';
      span.setAttribute('data-shown', '0');
      btn.innerHTML = ITL.icon('eye');
    } else {
      span.textContent = span.getAttribute('data-pw') || '';
      span.setAttribute('data-shown', '1');
      btn.innerHTML = ITL.icon('eyeOff');
    }
  });

  /* --------------------------------------------------------- DETAIL FIELD */
  ui.field = function (label, value, opts) {
    opts = opts || {};
    var v;
    if (opts.html) v = value || '<span class="detail-value empty">Not set</span>';
    else if (value === null || value === undefined || String(value).trim() === '') v = '<span class="detail-value empty">Not set</span>';
    else v = '<div class="detail-value' + (opts.mono ? ' mono' : '') + '">' + U.esc(value) + '</div>';
    return '<div class="detail-field' + (opts.full ? ' col-span-3' : '') + '">' +
      '<div class="detail-label">' + U.esc(label) + '</div>' + v + '</div>';
  };

  ui.sectionTitle = function (label, icon) {
    return '<div class="section-title">' + (icon ? ITL.icon(icon) : '') + U.esc(label) + '</div>';
  };

  /* ------------------------------------------------------------- SELECTS */
  ui.options = function (list, selected, placeholder) {
    var out = placeholder !== undefined
      ? '<option value="">' + U.esc(placeholder) + '</option>' : '';
    (list || []).forEach(function (o) {
      var val = typeof o === 'object' ? o.value : o;
      var lab = typeof o === 'object' ? o.label : o;
      out += '<option value="' + U.escAttr(val) + '"' +
        (String(selected) === String(val) ? ' selected' : '') + '>' + U.esc(lab) + '</option>';
    });
    return out;
  };

  ui.datalist = function (id, values) {
    return '<datalist id="' + U.escAttr(id) + '">' +
      (values || []).map(function (v) { return '<option value="' + U.escAttr(v) + '"></option>'; }).join('') +
      '</datalist>';
  };

  /* ============================================================== TABLE */
  /**
   * Render a full data table with sorting + pagination into `mount`.
   *
   * cfg = {
   *   mount: HTMLElement,
   *   view: state object from ITL.state.view(name)  (holds page/sort/pageSize)
   *   columns: [{ key, label, sortable, align, width, cls, render(row, i) }]
   *   rows: [] (already searched & filtered)
   *   rowId: fn(row) -> id string
   *   rowClass: fn(row) -> string
   *   onRowClick: fn(row)
   *   actions: fn(row) -> HTML string  (rendered in last cell)
   *   empty: {icon,title,desc,actions}
   *   totalUnfiltered: number (for "no results" vs "no records" copy)
   *   noun: 'PC' / 'record'
   * }
   * Returns the page rows currently displayed.
   */
  ui.renderTable = function (cfg) {
    var mount = cfg.mount;
    if (!mount) return [];
    var view = cfg.view || {};
    var cols = cfg.columns || [];
    var rows = cfg.rows || [];
    var noun = cfg.noun || 'record';

    // ---- sort
    if (view.sortKey) {
      rows = U.sortBy(rows, view.sortKey, view.sortDir || 'asc');
    }

    // ---- page
    var sizeSetting = view.pageSize !== undefined ? view.pageSize
      : (ITL.settings ? ITL.settings.get().tablePageSize : 25);
    var size = sizeSetting === 'All' || sizeSetting === 'all' ? rows.length || 1 : U.int(sizeSetting, 25);
    if (size <= 0) size = 25;
    var pages = Math.max(1, Math.ceil(rows.length / size));
    var page = Math.min(Math.max(1, U.int(view.page, 1)), pages);
    view.page = page;
    var start = (page - 1) * size;
    var pageRows = rows.slice(start, start + size);

    // ---- empty
    if (!rows.length) {
      var emptyCfg = cfg.empty || {};
      if (cfg.totalUnfiltered > 0) {
        emptyCfg = {
          icon: 'search',
          title: 'No matching ' + noun + 's',
          desc: 'No ' + noun + 's match your current search or filters. Try clearing them.',
          actions: [{ label: 'Clear filters', icon: 'x', cls: 'btn-secondary', action: 'clear-filters' }]
        };
      }
      mount.innerHTML = ui.emptyState(emptyCfg);
      return [];
    }

    // ---- head
    var head = '<thead><tr>' + cols.map(function (c) {
      var sorted = view.sortKey === c.key;
      var ico = !c.sortable ? '' :
        ITL.icon(sorted ? (view.sortDir === 'desc' ? 'sortDesc' : 'sortAsc') : 'sortNone', 'sort-ico');
      return '<th' +
        (c.sortable ? ' class="sortable' + (sorted ? ' sorted' : '') + '" data-sort="' + U.escAttr(c.key) + '" tabindex="0" role="button" aria-label="Sort by ' + U.escAttr(c.label) + '"' : (c.thCls ? ' class="' + c.thCls + '"' : '')) +
        (c.width ? ' style="width:' + c.width + (c.align ? ';text-align:' + c.align : '') + '"' : (c.align ? ' style="text-align:' + c.align + '"' : '')) +
        '><span class="th-in">' + U.esc(c.label) + ico + '</span></th>';
    }).join('') + (cfg.actions ? '<th style="width:1%"></th>' : '') + '</tr></thead>';

    // ---- body
    var body = '<tbody>' + pageRows.map(function (row, i) {
      var rid = cfg.rowId ? cfg.rowId(row) : (row.id || i);
      var rcls = (cfg.rowClass ? cfg.rowClass(row) : '') || '';
      return '<tr data-row-id="' + U.escAttr(rid) + '" class="' + rcls + (cfg.onRowClick ? ' clickable' : '') + '">' +
        cols.map(function (c) {
          var content;
          try { content = c.render ? c.render(row, start + i) : U.esc(row[c.key]); }
          catch (e) { content = ''; console.error('[table] render error for ' + c.key, e); }
          if (content === undefined || content === null || content === '') content = '<span class="muted">—</span>';
          return '<td' + (c.cls ? ' class="' + c.cls + '"' : '') +
            (c.align ? ' style="text-align:' + c.align + '"' : '') + '>' + content + '</td>';
        }).join('') +
        (cfg.actions ? '<td class="cell-actions">' + cfg.actions(row) + '</td>' : '') +
        '</tr>';
    }).join('') + '</tbody>';

    // ---- footer
    var from = start + 1, to = Math.min(start + size, rows.length);
    var sizes = C.PAGE_SIZES.map(function (s) {
      return '<option value="' + s + '"' + (String(sizeSetting) === String(s) ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    var foot =
      '<div class="table-foot">' +
      '<div class="tf-size"><span>Rows</span><select data-page-size aria-label="Rows per page">' + sizes + '</select></div>' +
      '<div class="tf-info">Showing <b>' + U.fmtNum(from) + '–' + U.fmtNum(to) + '</b> of <b>' + U.fmtNum(rows.length) + '</b> ' + noun + (rows.length === 1 ? '' : 's') +
      (cfg.totalUnfiltered && cfg.totalUnfiltered !== rows.length ? ' <span class="muted">(filtered from ' + U.fmtNum(cfg.totalUnfiltered) + ')</span>' : '') +
      '</div>' + ui.pager(page, pages) + '</div>';

    mount.innerHTML = '<div class="table-wrap"><table class="data-table">' + head + body + '</table></div>' + foot;

    // ---- bind
    U.qsa('th[data-sort]', mount).forEach(function (th) {
      var handler = function () {
        var k = th.getAttribute('data-sort');
        if (view.sortKey === k) view.sortDir = view.sortDir === 'asc' ? 'desc' : 'asc';
        else { view.sortKey = k; view.sortDir = 'asc'; }
        if (cfg.onChange) cfg.onChange();
      };
      th.addEventListener('click', handler);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });

    var sizeSel = mount.querySelector('[data-page-size]');
    if (sizeSel) sizeSel.addEventListener('change', function () {
      view.pageSize = sizeSel.value === 'All' ? 'All' : U.int(sizeSel.value, 25);
      view.page = 1;
      if (cfg.onChange) cfg.onChange();
    });

    U.qsa('[data-page]', mount).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-page');
        view.page = p === 'prev' ? page - 1 : p === 'next' ? page + 1 : U.int(p, 1);
        if (cfg.onChange) cfg.onChange();
        var main = document.getElementById('appMain');
        if (main) main.scrollTo({ top: Math.max(0, mount.offsetTop - 90), behavior: 'smooth' });
      });
    });

    if (cfg.onRowClick) {
      U.qsa('tbody tr', mount).forEach(function (tr) {
        tr.addEventListener('click', function (e) {
          if (e.target.closest('button, a, input, select, .pw-cell')) return;
          var id = tr.getAttribute('data-row-id');
          var row = pageRows.filter(function (r) { return String(cfg.rowId ? cfg.rowId(r) : r.id) === String(id); })[0];
          if (row) cfg.onRowClick(row, tr);
        });
      });
    }

    return pageRows;
  };

  /** Pagination control markup. */
  ui.pager = function (page, pages) {
    if (pages <= 1) return '<div class="pager"></div>';
    var out = '<div class="pager" role="navigation" aria-label="Pagination">';
    out += '<button type="button" data-page="prev"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + ITL.icon('chevronLeft') + '</button>';

    var nums = [];
    if (pages <= 7) { for (var i = 1; i <= pages; i++) nums.push(i); }
    else {
      nums.push(1);
      var s = Math.max(2, page - 1), e = Math.min(pages - 1, page + 1);
      if (s > 2) nums.push('…');
      for (var j = s; j <= e; j++) nums.push(j);
      if (e < pages - 1) nums.push('…');
      nums.push(pages);
    }
    nums.forEach(function (n) {
      if (n === '…') out += '<button class="ellipsis" disabled>…</button>';
      else out += '<button type="button" data-page="' + n + '" class="' + (n === page ? 'active' : '') + '"' +
        (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>';
    });
    out += '<button type="button" data-page="next"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page">' + ITL.icon('chevronRight') + '</button>';
    return out + '</div>';
  };

  /** Standard row action buttons. */
  ui.rowActions = function (items) {
    return '<div class="row-actions">' + items.map(function (a) {
      return '<button type="button" class="row-btn' + (a.danger ? ' danger' : '') + '" data-action="' + U.escAttr(a.action) +
        '" data-id="' + U.escAttr(a.id) + '" title="' + U.escAttr(a.label) + '" aria-label="' + U.escAttr(a.label) + '">' +
        ITL.icon(a.icon) + '</button>';
    }).join('') + '</div>';
  };

  /* ============================================================== CHARTS */
  var PALETTE = ['#3b66f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
  ui.palette = PALETTE;

  var STATUS_COLORS = {
    'Working': '#10b981', 'Pending': '#f59e0b', 'Faulty': '#ef4444',
    'Hold': '#3b82f6', 'Retired': '#94a3b8',
    'In Progress': '#3b82f6', 'Resolved': '#10b981', 'Cancelled': '#94a3b8',
    'Available': '#10b981', 'Low Stock': '#f59e0b', 'Out of Stock': '#ef4444'
  };
  ui.statusColor = function (s, i) { return STATUS_COLORS[s] || PALETTE[(i || 0) % PALETTE.length]; };

  function chartEmpty(msg, icon) {
    return '<div class="empty-state compact"><div class="es-ico">' + ITL.icon(icon || 'barChart') + '</div>' +
      '<h4 style="font-size:13.5px">No data yet</h4><p style="font-size:12.5px">' + U.esc(msg || 'Add records to see this chart.') + '</p></div>';
  }
  ui.chartEmpty = chartEmpty;

  /**
   * Horizontal bar chart. data = [{label, value, color}]
   */
  ui.barChart = function (data, opts) {
    opts = opts || {};
    data = (data || []).filter(function (d) { return d.value !== undefined; });
    var total = data.reduce(function (a, d) { return a + U.num(d.value); }, 0);
    if (!data.length || (total === 0 && !opts.showZero)) return chartEmpty(opts.emptyMsg, opts.emptyIcon);
    var max = Math.max.apply(null, data.map(function (d) { return U.num(d.value); }));
    if (max <= 0) max = 1;
    return '<div class="stack-2">' + data.map(function (d, i) {
      var c = d.color || ui.statusColor(d.label, i);
      var pctW = Math.max(U.num(d.value) > 0 ? 2 : 0, (U.num(d.value) / max) * 100);
      return '<div class="bar-row"' + (d.onClick ? ' style="cursor:pointer"' : '') + '>' +
        '<div class="bar-label truncate" title="' + U.escAttr(d.label) + '">' + U.esc(d.label) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pctW + '%;background:' + c + '"></div></div>' +
        '<div class="bar-value">' + U.fmtNum(d.value) + '</div></div>';
    }).join('') + '</div>';
  };

  /**
   * Donut chart with centre total. data = [{label, value, color}]
   */
  ui.donutChart = function (data, opts) {
    opts = opts || {};
    data = (data || []).filter(function (d) { return U.num(d.value) > 0; });
    var total = data.reduce(function (a, d) { return a + U.num(d.value); }, 0);
    if (!total) return chartEmpty(opts.emptyMsg, 'pieChart');

    var size = 168, r = 62, cx = size / 2, cy = size / 2, sw = 22;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var arcs = data.map(function (d, i) {
      var frac = U.num(d.value) / total;
      var len = frac * circ;
      var c = d.color || ui.statusColor(d.label, i);
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + c + '" ' +
        'stroke-width="' + sw + '" stroke-dasharray="' + (len - (data.length > 1 ? 2 : 0)) + ' ' + (circ - len + (data.length > 1 ? 2 : 0)) + '" ' +
        'stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" ' +
        'data-tip="' + U.escAttr(d.label + ': ' + U.fmtNum(d.value) + ' (' + Math.round(frac * 100) + '%)') + '" style="cursor:default"></circle>';
      offset += len;
      return seg;
    }).join('');

    var legend = data.map(function (d, i) {
      var c = d.color || ui.statusColor(d.label, i);
      return '<div class="legend-item"><i style="background:' + c + '"></i>' +
        '<span>' + U.esc(d.label) + '</span><b>' + U.fmtNum(d.value) + '</b>' +
        '<span class="muted">(' + Math.round((U.num(d.value) / total) * 100) + '%)</span></div>';
    }).join('');

    return '<div class="donut-wrap">' +
      '<svg class="chart-svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="flex:0 0 ' + size + 'px" role="img" aria-label="' + U.escAttr(opts.title || 'Distribution chart') + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg-surface-3)" stroke-width="' + sw + '"></circle>' +
      arcs +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="donut-center-val" fill="var(--text-primary)" font-size="23" font-weight="700">' + U.fmtNum(total) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle" class="donut-center-lbl" fill="var(--text-muted)" font-size="10">' + U.esc(opts.centerLabel || 'TOTAL') + '</text>' +
      '</svg>' +
      '<div style="flex:1;min-width:140px"><div class="chart-legend" style="flex-direction:column;gap:7px;margin:0">' + legend + '</div></div>' +
      '</div>';
  };

  /**
   * Vertical column chart for time series. data = [{label, value, full}]
   */
  ui.columnChart = function (data, opts) {
    opts = opts || {};
    data = data || [];
    var total = data.reduce(function (a, d) { return a + U.num(d.value); }, 0);
    if (!data.length || (!total && !opts.showZero)) return chartEmpty(opts.emptyMsg, 'barChart');

    var W = 100, H = 150, padB = 22, padT = 14;
    var max = Math.max.apply(null, data.map(function (d) { return U.num(d.value); }));
    if (max <= 0) max = 1;
    var n = data.length;
    var gap = 2.2;
    var bw = (W - gap * (n - 1)) / n;
    var color = opts.color || '#3b66f6';

    var bars = data.map(function (d, i) {
      var v = U.num(d.value);
      var h = (v / max) * (H - padB - padT);
      var x = i * (bw + gap);
      var y = H - padB - h;
      return '<g>' +
        '<rect x="' + x + '" y="' + padT + '" width="' + bw + '" height="' + (H - padB - padT) + '" fill="var(--bg-surface-3)" rx="1.2"></rect>' +
        (v > 0 ? '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(h, 1.2) + '" fill="' + color + '" rx="1.2">' +
          '<title>' + U.esc((d.full || d.label) + ': ' + v) + '</title></rect>' : '') +
        '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 9) + '" text-anchor="middle" font-size="5.4" fill="var(--text-muted)">' + U.esc(d.label) + '</text>' +
        (v > 0 ? '<text x="' + (x + bw / 2) + '" y="' + (y - 2.5) + '" text-anchor="middle" font-size="5.6" font-weight="700" fill="var(--text-primary)">' + v + '</text>' : '') +
        '</g>';
    }).join('');

    return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="height:190px" role="img" aria-label="' + U.escAttr(opts.title || 'Column chart') + '">' +
      bars + '</svg>';
  };

  /** Stacked horizontal proportion bar. data = [{label,value,color}] */
  ui.stackBar = function (data, opts) {
    opts = opts || {};
    data = (data || []).filter(function (d) { return U.num(d.value) > 0; });
    var total = data.reduce(function (a, d) { return a + U.num(d.value); }, 0);
    if (!total) return chartEmpty(opts.emptyMsg);
    var segs = data.map(function (d, i) {
      var c = d.color || ui.statusColor(d.label, i);
      var pct = (U.num(d.value) / total) * 100;
      return '<div title="' + U.escAttr(d.label + ': ' + d.value) + '" style="width:' + pct + '%;background:' + c + '"></div>';
    }).join('');
    var legend = data.map(function (d, i) {
      var c = d.color || ui.statusColor(d.label, i);
      return '<div class="legend-item"><i style="background:' + c + '"></i><span>' + U.esc(d.label) + '</span><b>' + U.fmtNum(d.value) + '</b></div>';
    }).join('');
    return '<div style="display:flex;height:12px;border-radius:99px;overflow:hidden;gap:1.5px;background:var(--bg-surface-3)">' + segs + '</div>' +
      '<div class="chart-legend">' + legend + '</div>';
  };

  /* --------------------------------------------------------- MINI STATS */
  ui.miniStats = function (items) {
    return '<div class="mini-stats">' + items.map(function (it) {
      return '<div class="mini-stat">' +
        '<div class="ms-label">' + (it.color ? '<i style="background:' + it.color + '"></i>' : '') + U.esc(it.label) + '</div>' +
        '<div class="ms-value">' + U.fmtNum(it.value) + '</div></div>';
    }).join('') + '</div>';
  };

  /** Big stat card. */
  ui.statCard = function (o) {
    return '<div class="stat-card' + (o.action ? ' clickable' : '') + '" style="--accent:' + (o.color || 'var(--brand-500)') +
      ';--accent-bg:' + (o.bg || 'var(--brand-50)') + '"' +
      (o.action ? ' data-action="' + U.escAttr(o.action) + '"' : '') +
      (o.args ? ' data-args="' + U.escAttr(JSON.stringify(o.args)) + '"' : '') +
      (o.action ? ' role="button" tabindex="0"' : '') + '>' +
      '<div class="stat-top"><div class="stat-label">' + U.esc(o.label) + '</div>' +
      '<div class="stat-ico">' + ITL.icon(o.icon || 'barChart') + '</div></div>' +
      '<div class="stat-value">' + U.fmtNum(o.value) + '</div>' +
      (o.meta ? '<div class="stat-meta">' + (o.metaHtml ? o.meta : U.esc(o.meta)) + '</div>' : '') +
      '</div>';
  };

  /* -------------------------------------------------------- FILTER CHIPS */
  ui.filterChips = function (filters, labels) {
    var keys = Object.keys(filters || {}).filter(function (k) { return filters[k] !== '' && filters[k] !== undefined && filters[k] !== null && filters[k] !== 'all'; });
    if (!keys.length) return '';
    return '<div class="filter-summary">' + ITL.icon('filter') +
      '<span><b>Active filters:</b></span>' +
      keys.map(function (k) {
        return '<span class="chip">' + U.esc((labels && labels[k]) || U.titleCase(k)) + ': <b>' + U.esc(filters[k]) + '</b>' +
          '<button type="button" data-clear-filter="' + U.escAttr(k) + '" aria-label="Remove filter">' + ITL.icon('x') + '</button></span>';
      }).join('') +
      '<button type="button" class="btn btn-sm btn-ghost" data-action="clear-filters">Clear all</button>' +
      '</div>';
  };

  /* ------------------------------------------------------- TOOLBAR PIECES */
  ui.searchInput = function (value, placeholder) {
    return '<div class="toolbar-search">' + ITL.icon('search') +
      '<input type="search" data-search value="' + U.escAttr(value || '') + '" placeholder="' +
      U.escAttr(placeholder || 'Search…') + '" aria-label="Search records" autocomplete="off">' +
      '</div>';
  };

  ui.selectFilter = function (name, label, values, selected) {
    return '<select class="filter-select" data-filter="' + U.escAttr(name) + '" aria-label="' + U.escAttr(label) + '">' +
      '<option value="">' + U.esc(label) + ': All</option>' +
      (values || []).map(function (v) {
        var val = typeof v === 'object' ? v.value : v;
        var lab = typeof v === 'object' ? v.label : v;
        return '<option value="' + U.escAttr(val) + '"' + (String(selected) === String(val) ? ' selected' : '') + '>' + U.esc(lab) + '</option>';
      }).join('') + '</select>';
  };

  /* --------------------------------------------------------- KV & TIMELINE */
  ui.kv = function (rows) {
    return '<div class="kv-list">' + rows.map(function (r) {
      return '<div class="kv-row"><span class="kv-k">' + U.esc(r[0]) + '</span>' +
        '<span class="kv-v">' + (r[2] ? r[1] : U.esc(r[1])) + '</span></div>';
    }).join('') + '</div>';
  };

  /** Scroll to a table row and flash it. */
  ui.highlightRow = function (id) {
    setTimeout(function () {
      var tr = document.querySelector('tr[data-row-id="' + (window.CSS && CSS.escape ? CSS.escape(String(id)) : String(id)) + '"]');
      if (tr) {
        try { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
        U.flashElement(tr);
      }
    }, 260);
  };

})(window);
