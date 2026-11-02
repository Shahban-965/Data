/* ==========================================================================
   search.js — global search (Ctrl+K) across every module
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;

  var search = ITL.search = {};

  var els = {};
  var activeIndex = -1;
  var currentResults = [];

  var GROUPS = [
    {
      id: 'pcs', label: 'PCs', icon: 'desktop', page: 'inventory',
      get: function () { return ITL.data.pcs(); },
      fields: ['id', 'pcName', 'serialNumber', 'lab', 'processor', 'ram', 'storage', 'os', 'software', 'status', 'remarks'],
      title: function (r) { return r.pcName || r.id; },
      sub: function (r) { return [r.lab, r.status, r.processor].filter(Boolean).join(' · '); }
    },
    {
      id: 'staff', label: 'Staff Systems', icon: 'users', page: 'staff',
      get: function () { return ITL.data.staff(); },
      fields: ['id', 'pcName', 'staffName', 'department', 'serialNumber', 'processor', 'os', 'status', 'remarks'],
      title: function (r) { return (r.staffName || '') + (r.pcName ? ' — ' + r.pcName : ''); },
      sub: function (r) { return [r.department, r.status].filter(Boolean).join(' · '); }
    },
    {
      id: 'maintenance', label: 'Maintenance', icon: 'wrench', page: 'maintenance',
      get: function () { return ITL.data.maintenance(); },
      fields: ['id', 'pcName', 'lab', 'problem', 'category', 'oldPart', 'newPart', 'status', 'technician', 'remarks'],
      title: function (r) { return (r.pcName || r.id) + ' — ' + (r.problem || ''); },
      sub: function (r) { return [U.fmtDate(r.complaintDate), r.category, r.status].filter(Boolean).join(' · '); }
    },
    {
      id: 'store', label: 'Store Items', icon: 'package', page: 'store',
      get: function () { return ITL.data.store(); },
      fields: ['id', 'itemName', 'category', 'brand', 'model', 'location', 'condition', 'remarks'],
      title: function (r) { return r.itemName || r.id; },
      sub: function (r) { return [r.category, U.int(r.quantity, 0) + ' ' + (r.unit || 'Piece'), ITL.data.itemStatus(r)].filter(Boolean).join(' · '); }
    },
    {
      id: 'purchases', label: 'Purchases', icon: 'cart', page: 'purchases',
      get: function () { return ITL.data.purchases(); },
      fields: ['id', 'supplier', 'item', 'processor', 'ram', 'storage', 'status', 'remarks'],
      title: function (r) { return r.item || r.id; },
      sub: function (r) { return [U.fmtDate(r.purchaseDate), r.supplier, 'Qty ' + U.int(r.quantity, 0)].filter(Boolean).join(' · '); }
    }
  ];

  search.init = function () {
    els.input = document.getElementById('globalSearch');
    els.results = document.getElementById('gsResults');
    if (!els.input || !els.results) return;

    els.input.addEventListener('input', U.debounce(function () { run(els.input.value); }, 140));
    els.input.addEventListener('focus', function () { if (els.input.value) run(els.input.value); });
    els.input.addEventListener('keydown', onKey);

    document.addEventListener('click', function (e) {
      if (!els.results.contains(e.target) && e.target !== els.input) close();
    });

    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        els.input.focus();
        els.input.select();
      }
    });
  };

  function onKey(e) {
    if (e.key === 'Escape') { close(); els.input.blur(); return; }
    if (!currentResults.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var pick = currentResults[activeIndex >= 0 ? activeIndex : 0];
      if (pick) openResult(pick);
    }
  }

  function move(dir) {
    activeIndex += dir;
    if (activeIndex < 0) activeIndex = currentResults.length - 1;
    if (activeIndex >= currentResults.length) activeIndex = 0;
    U.qsa('.gs-item', els.results).forEach(function (el, i) {
      el.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function run(term) {
    term = U.str(term).trim();
    activeIndex = -1;
    currentResults = [];

    if (term.length < 2) {
      els.results.innerHTML =
        '<div class="gs-hint">' + ITL.icon('search') +
        '<span>Type at least 2 characters to search PCs, staff systems, maintenance, store items and purchases.</span></div>';
      els.results.classList.add('open');
      return;
    }

    var html = '';
    var total = 0;

    GROUPS.forEach(function (g) {
      var hits = g.get().filter(function (r) { return U.matches(r, term, g.fields); });
      if (!hits.length) return;
      total += hits.length;
      html += '<div class="gs-group-title">' + ITL.icon(g.icon) + U.esc(g.label) +
        '<span class="gs-count">' + hits.length + '</span></div>';
      hits.slice(0, 6).forEach(function (r) {
        var idx = currentResults.length;
        currentResults.push({ group: g, record: r });
        html += '<div class="gs-item" data-gs="' + idx + '" role="option" tabindex="-1">' +
          '<div class="gs-item-ico">' + ITL.icon(g.icon) + '</div>' +
          '<div class="gs-item-body">' +
          '<div class="gs-item-title">' + highlight(g.title(r), term) + '</div>' +
          '<div class="gs-item-sub">' + U.esc(g.sub(r)) + '</div>' +
          '</div>' +
          '<div class="gs-item-id mono">' + U.esc(r.id) + '</div>' +
          '</div>';
      });
      if (hits.length > 6) {
        html += '<div class="gs-more" data-gs-more="' + g.id + '">Show all ' + hits.length + ' ' + U.esc(g.label) + ' ' + ITL.icon('arrowRight') + '</div>';
      }
    });

    if (!total) {
      html = '<div class="gs-hint">' + ITL.icon('inbox') +
        '<span>No matches for <b>' + U.esc(term) + '</b>. Try a PC name, serial number, item name or supplier.</span></div>';
    } else {
      html = '<div class="gs-head">' + total + ' result' + (total === 1 ? '' : 's') +
        ' · <span class="muted">use ↑ ↓ and Enter</span></div>' + html;
    }

    els.results.innerHTML = html;
    els.results.classList.add('open');

    U.on(els.results, 'click', '[data-gs]', function (e, el) {
      var i = U.int(el.getAttribute('data-gs'), -1);
      if (currentResults[i]) openResult(currentResults[i]);
    });
    U.on(els.results, 'click', '[data-gs-more]', function (e, el) {
      var gid = el.getAttribute('data-gs-more');
      var g = GROUPS.filter(function (x) { return x.id === gid; })[0];
      if (!g) return;
      close();
      ITL.router.go(g.page, { search: term });
    });
    U.on(els.results, 'mousemove', '.gs-item', function (e, el) {
      var i = U.int(el.getAttribute('data-gs'), -1);
      if (i === activeIndex) return;
      activeIndex = i;
      U.qsa('.gs-item', els.results).forEach(function (x, j) { x.classList.toggle('active', j === i); });
    });
  }

  function highlight(text, term) {
    var t = U.str(text);
    var i = t.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return U.esc(t);
    return U.esc(t.slice(0, i)) + '<mark>' + U.esc(t.slice(i, i + term.length)) + '</mark>' + U.esc(t.slice(i + term.length));
  }

  function openResult(res) {
    close();
    els.input.value = '';
    ITL.router.go(res.group.page, { open: res.record.id, focus: res.record.id });
  }

  function close() {
    if (els.results) { els.results.classList.remove('open'); }
    activeIndex = -1;
  }
  search.close = close;

})(window);
