/* ==========================================================================
   maintenance.js — Maintenance / fault management with store integration
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
  var mnt = ITL.maintenance = {};

  var VIEW = 'maintenance';

  /**
   * Archived-month lock: a maintenance record can only be added to,
   * edited, resolved or deleted while its complaint date falls in the
   * CURRENT calendar month. Once the month rolls over, the record is
   * locked — view-only, download only from Monthly Archive. Nothing is
   * ever deleted; this only prevents further changes to a closed month.
   */
  function isLocked(r) {
    return !!(r && r.complaintDate && U.monthKey(r.complaintDate) !== U.monthKey(new Date()));
  }

  function showLockedInfo(id) {
    var r = ITL.data.maint(id);
    var label = r ? U.monthLabel(U.monthKey(r.complaintDate)) : 'this month';
    ITL.modal.confirm({
      heading: 'Archived record',
      title: label + ' is locked',
      message: 'This record belongs to ' + label + ', which has already closed. Past months can no longer be added to, edited, resolved or deleted — only downloaded. Open Monthly Archive to download the full ' + label + ' report.',
      tone: 'info', confirmLabel: 'Open Monthly Archive', cancelLabel: 'Close'
    }).then(function (ok) { if (ok) ITL.router.go('archive'); });
  }

  function view() {
    return ITL.state.view(VIEW, {
      search: '', page: 1, sortKey: 'complaintDate', sortDir: 'desc',
      filters: { lab: '', pcName: '', status: '', category: '', from: '', to: '' }
    });
  }

  function currentMonthRows() {
    var key = U.monthKey(new Date());
    return ITL.data.maintenance().filter(function (r) { return U.monthKey(r.complaintDate) === key; });
  }

  function filtered() {
    var v = view(), f = v.filters;
    return currentMonthRows().filter(function (r) {
      if (f.lab && r.lab !== f.lab) return false;
      if (f.pcName && r.pcName !== f.pcName) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.category && r.category !== f.category) return false;
      if (f.from) { var d1 = U.parseDate(r.complaintDate); if (!d1 || d1 < U.parseDate(f.from)) return false; }
      if (f.to) { var d2 = U.parseDate(r.complaintDate); if (!d2 || d2 > U.parseDate(f.to)) return false; }
      if (v.search && !U.matches(r, v.search,
        ['id', 'pcId', 'pcName', 'lab', 'problem', 'category', 'oldPart', 'newPart', 'status', 'technician', 'remarks'])) return false;
      return true;
    });
  }

  /* ================================================================ PAGE */
  pages.maintenance = {
    title: 'Maintenance',

    render: function (root, params) {
      var v = view();
      if (params && params.status) { v.filters.status = params.status; v.page = 1; }
      if (params && params.month) {
        var mk = params.month.split('-');
        v.filters.from = params.month + '-01';
        var last = new Date(+mk[0], +mk[1], 0);
        v.filters.to = U.toDateInput(last);
      }
      var curKey = U.monthKey(new Date());
      var curLabel = U.monthLabel(curKey);
      var all = currentMonthRows();
      var st = {
        total: all.length,
        pending: all.filter(function (r) { return r.status === 'Pending'; }).length,
        inProgress: all.filter(function (r) { return r.status === 'In Progress'; }).length,
        resolved: all.filter(function (r) { return r.status === 'Resolved'; }).length,
        cancelled: all.filter(function (r) { return r.status === 'Cancelled'; }).length
      };
      var archivedCount = (function () {
        var keys = {};
        ITL.data.maintenance().forEach(function (r) { var k = U.monthKey(r.complaintDate); if (k && k !== curKey) keys[k] = 1; });
        return Object.keys(keys).length;
      })();

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Maintenance</div>' +
        '<div class="page-sub">Showing ' + U.esc(curLabel) + ' only — fault reports, repairs and replacement parts consumed from the store</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-excel" data-action="export">' + ITL.icon('excel') + 'Download Excel</button>' +
        '<button class="btn btn-primary" data-action="add">' + ITL.icon('plus') + 'Report Fault</button>' +
        '</div></div>' +

        '<div class="alert alert-info mb-4">' + ITL.icon('info') +
        '<div class="alert-body"><div class="alert-title">Only ' + U.esc(curLabel) + ' shows here</div>' +
        'Maintenance only ever displays and accepts the current month. ' +
        (archivedCount ? U.fmtNum(archivedCount) + ' earlier month' + (archivedCount === 1 ? '' : 's') + ' ' + (archivedCount === 1 ? 'is' : 'are') + ' safely kept — ' : 'Earlier months are safely kept — ') +
        '<a href="#/archive" data-action="go-archive">open Monthly Archive</a> to view or download them.</div></div>' +

        '<div class="stat-grid mb-4">' +
        ui.statCard({ label: 'Total faults (' + U.esc(curLabel) + ')', value: st.total, icon: 'wrench', color: '#3b66f6', bg: 'var(--info-bg)' }) +
        ui.statCard({ label: 'Pending', value: st.pending, icon: 'clock', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'filter-status', args: { status: 'Pending' } }) +
        ui.statCard({ label: 'In progress', value: st.inProgress, icon: 'tool', color: '#3b82f6', bg: 'var(--info-bg)', action: 'filter-status', args: { status: 'In Progress' } }) +
        ui.statCard({ label: 'Resolved', value: st.resolved, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'filter-status', args: { status: 'Resolved' } }) +
        ui.statCard({ label: 'Cancelled', value: st.cancelled, icon: 'slash', color: '#94a3b8', bg: 'var(--neutral-bg)', action: 'filter-status', args: { status: 'Cancelled' } }) +
        '</div>' +

        '<div class="card">' +
        '<div class="toolbar">' +
        ui.searchInput(v.search, 'Search PC, problem, part, technician…') +
        ui.selectFilter('lab', 'Lab', C.labs(), v.filters.lab) +
        ui.selectFilter('pcName', 'PC', U.uniqueValues(all, 'pcName'), v.filters.pcName) +
        ui.selectFilter('status', 'Status', C.MAINT_STATUS, v.filters.status) +
        ui.selectFilter('category', 'Category', C.PROBLEM_CATEGORIES, v.filters.category) +
        '<div class="toolbar-group">' +
        '<span class="muted" style="font-size:12px">From</span>' +
        '<input type="date" class="sm" data-filter="from" value="' + U.escAttr(v.filters.from) + '" style="width:140px" aria-label="From date">' +
        '<span class="muted" style="font-size:12px">To</span>' +
        '<input type="date" class="sm" data-filter="to" value="' + U.escAttr(v.filters.to) + '" style="width:140px" aria-label="To date">' +
        '</div>' +
        '<div class="toolbar-spacer"></div>' +
        '<button class="btn btn-secondary btn-sm" data-action="clear-filters">' + ITL.icon('x') + 'Clear</button>' +
        '</div>' +
        '<div id="mtFilterChips"></div>' +
        '<div id="mtTable"></div>' +
        '</div>';

      renderTable(root);
      bind(root);
      if (params && params.focus) ui.highlightRow(params.focus);
      if (params && params.open) { var rec = ITL.data.maint(params.open); if (rec) mnt.openDetail(rec.id); }
    }
  };

  function renderTable(root) {
    var v = view();
    var rows = filtered();
    var chips = root.querySelector('#mtFilterChips');
    if (chips) chips.innerHTML = ui.filterChips(v.filters, {
      lab: 'Lab', pcName: 'PC', status: 'Status', category: 'Category', from: 'From', to: 'To'
    });

    ui.renderTable({
      mount: root.querySelector('#mtTable'),
      view: v,
      noun: 'maintenance record',
      totalUnfiltered: ITL.data.maintenance().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      rowClass: function (r) { return r.status === 'Pending' ? 'row-warn' : ''; },
      columns: [
        { key: 'id', label: 'ID', sortable: true, cls: 'cell-id', width: '104px' },
        { key: 'complaintDate', label: 'Complaint', sortable: true, cls: 'cell-date', width: '108px', render: function (r) { return U.esc(U.fmtDate(r.complaintDate)); } },
        {
          key: 'pcName', label: 'PC', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.pcName) || '—') + '</span>' +
              (r.lab ? '<span class="cs-sub">' + U.esc(r.lab) + '</span>' : '') + '</div>';
          }
        },
        {
          key: 'problem', label: 'Problem', sortable: true, render: function (r) {
            return '<div class="truncate" style="max-width:280px" title="' + U.escAttr(r.problem) + '">' + (U.esc(r.problem) || '—') + '</div>';
          }
        },
        { key: 'category', label: 'Category', sortable: true, width: '124px', render: function (r) { return r.category ? ui.badge(r.category, 'neutral', true) : ''; } },
        {
          key: 'newPart', label: 'Part used', sortable: true, render: function (r) {
            if (!r.newPart) return '<span class="muted">—</span>';
            return '<div class="cell-stack"><span class="cs-main">' + U.esc(r.newPart) + '</span>' +
              (r.quantity ? '<span class="cs-sub">Qty ' + U.int(r.quantity) + '</span>' : '') + '</div>';
          }
        },
        { key: 'repairDate', label: 'Repaired', sortable: true, cls: 'cell-date', width: '106px', render: function (r) { return r.repairDate ? U.esc(U.fmtDate(r.repairDate)) : ''; } },
        { key: 'status', label: 'Status', sortable: true, width: '120px', render: function (r) { return ui.maintStatusBadge(r.status); } }
      ],
      actions: function (r) {
        var acts = [{ action: 'view', id: r.id, icon: 'eye', label: 'View details' }];
        if (isLocked(r)) {
          acts.push({ action: 'locked', id: r.id, icon: 'lock', label: 'Archived — locked' });
        } else {
          if (r.status !== 'Resolved' && r.status !== 'Cancelled') acts.push({ action: 'resolve', id: r.id, icon: 'checkCircle', label: 'Mark resolved' });
          acts.push({ action: 'edit', id: r.id, icon: 'edit', label: 'Edit record' });
          acts.push({ action: 'delete', id: r.id, icon: 'trash', label: 'Delete record', danger: true });
        }
        return ui.rowActions(acts);
      },
      onRowClick: function (r) { mnt.openDetail(r.id); },
      empty: {
        icon: 'wrench',
        title: 'No maintenance records',
        desc: 'Report your first fault to start tracking repairs and the parts consumed from the store.',
        actions: [{ label: 'Report Fault', icon: 'plus', cls: 'btn-primary', action: 'add' }]
      },
      onChange: function () { renderTable(root); }
    });
  }

  function bind(root) {
    var v = view();
    var search = root.querySelector('[data-search]');
    if (search) search.addEventListener('input', U.debounce(function () {
      v.search = search.value; v.page = 1; renderTable(root);
    }, 200));

    U.on(root, 'change', '[data-filter]', function (e, el) {
      v.filters[el.getAttribute('data-filter')] = el.value; v.page = 1; renderTable(root);
    });
    U.on(root, 'click', '[data-clear-filter]', function (e, el) {
      v.filters[el.getAttribute('data-clear-filter')] = ''; v.page = 1; ITL.router.reload();
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      var id = el.getAttribute('data-id');
      var args = el.getAttribute('data-args');
      try { args = args ? JSON.parse(args) : null; } catch (x) { args = null; }
      switch (a) {
        case 'add': mnt.openForm(); break;
        case 'view': mnt.openDetail(id); break;
        case 'edit': mnt.openForm(id); break;
        case 'resolve': mnt.resolve(id); break;
        case 'delete': mnt.remove(id); break;
        case 'locked': showLockedInfo(id); break;
        case 'export': mnt.exportExcel(); break;
        case 'clear-filters':
          v.search = ''; v.page = 1;
          Object.keys(v.filters).forEach(function (k) { v.filters[k] = ''; });
          ITL.router.reload();
          break;
        case 'filter-status':
          if (args && args.status) {
            v.filters.status = v.filters.status === args.status ? '' : args.status;
            v.page = 1; ITL.router.reload();
          }
          break;
      }
    });
  }

  /* ================================================== SMART FAULT FORM */
  /** Combined machine list: lab PCs + staff systems. */
  function machineOptions() {
    var out = [];
    ITL.data.pcs().forEach(function (p) {
      out.push({ id: p.id, name: p.pcName, lab: p.lab, status: p.status, kind: 'PC', rec: p });
    });
    ITL.data.staff().forEach(function (p) {
      out.push({ id: p.id, name: p.pcName || p.staffName, lab: 'Staff Systems', status: p.status, kind: 'Staff', rec: p });
    });
    return out;
  }

  mnt.openForm = function (id, prefill) {
    var editing = !!id;
    var rec = editing ? ITL.data.maint(id) : null;
    if (editing && !rec) { ITL.toast.error('Record not found'); return; }
    if (editing && isLocked(rec)) { showLockedInfo(id); return; }
    var d = rec || ITL.factory.maintenance(prefill || {});
    var machines = machineOptions();
    var storeItems = ITL.data.store();
    var curMonthKey = U.monthKey(new Date());
    var curMonthLabel = U.monthLabel(curMonthKey);
    var minDate = curMonthKey + '-01';
    var maxDate = curMonthKey + '-31'; // browsers clamp to the real last day automatically

    if (!machines.length && !editing) {
      ITL.modal.confirm({
        heading: 'No computers registered',
        title: 'Add a PC first',
        message: 'Maintenance records are linked to a computer. Add a PC in the inventory (or a staff system) before reporting a fault.',
        tone: 'info', confirmLabel: 'Go to PC Inventory', cancelLabel: 'Cancel'
      }).then(function (ok) { if (ok) ITL.router.go('inventory'); });
      return;
    }

    var body =
      '<form id="mtForm" novalidate autocomplete="off">' +
      '<div data-error-summary style="display:none;margin-bottom:16px"></div>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('desktop') + 'Computer</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="mtPc">Select PC <span class="req">*</span></label>' +
      '<select id="mtPc" name="pcId" data-autofocus>' +
      '<option value="">Choose a computer…</option>' +
      machines.map(function (mo) {
        return '<option value="' + U.escAttr(mo.id) + '"' + (String(d.pcId) === String(mo.id) ? ' selected' : '') + '>' +
          U.esc(mo.name) + ' — ' + U.esc(mo.lab) + '</option>';
      }).join('') +
      '</select>' +
      '<div class="help-text">Lab, PC name and current status fill in automatically.</div></div>' +

      '<div class="field"><label for="mtDate">Complaint Date <span class="req">*</span></label>' +
      '<input type="date" id="mtDate" name="complaintDate" value="' + U.escAttr(d.complaintDate || U.today()) + '" min="' + U.escAttr(minDate) + '" max="' + U.escAttr(maxDate) + '"></div>' +

      '<div class="field col-span-2" style="margin-top:-8px"><div class="help-text">Only ' + U.esc(curMonthLabel) + ' can be logged or changed here — past months are archived and locked (view them in Monthly Archive).</div></div>' +

      '<div class="field col-span-2" id="mtPcInfo"></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('alert') + 'Problem</legend>' +
      '<div class="form-grid">' +
      '<div class="field col-span-2"><label for="mtProblem">Problem Description <span class="req">*</span></label>' +
      '<textarea id="mtProblem" name="problem" rows="2" placeholder="e.g. Ethernet port not detecting network cable">' + U.esc(d.problem) + '</textarea></div>' +

      '<div class="field"><label for="mtCat">Problem Category <span class="req">*</span></label>' +
      '<select id="mtCat" name="category">' + ui.options(C.PROBLEM_CATEGORIES, d.category || 'Other') + '</select></div>' +

      '<div class="field"><label for="mtTech">Technician</label>' +
      '<input type="text" id="mtTech" name="technician" value="' + U.escAttr(d.technician) + '" list="dlTech" placeholder="Who is handling this?">' +
      ui.datalist('dlTech', U.uniqueValues(ITL.data.maintenance(), 'technician')) + '</div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('package') + 'Replacement part (optional)</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="mtOldPart">Old / removed part</label>' +
      '<input type="text" id="mtOldPart" name="oldPart" value="' + U.escAttr(d.oldPart) + '" placeholder="e.g. Faulty RJ45 connector"></div>' +

      '<div class="field"><label for="mtNewPartItem">New part (from store)</label>' +
      '<select id="mtNewPartItem" name="newPartItemId">' +
      '<option value="">No part used</option>' +
      storeItems.map(function (it) {
        return '<option value="' + U.escAttr(it.id) + '"' + (String(d.newPartItemId) === String(it.id) ? ' selected' : '') + '>' +
          U.esc(it.itemName) + ' — ' + U.int(it.quantity) + ' ' + U.esc(it.unit || 'Piece') + ' available</option>';
      }).join('') +
      '</select>' +
      (storeItems.length ? '' : '<div class="help-text">No store items yet — add items in Store Inventory to link parts.</div>') +
      '</div>' +

      '<div class="field"><label for="mtQty">Quantity used</label>' +
      '<input type="number" id="mtQty" name="quantity" min="0" step="1" value="' + U.int(d.quantity, 0) + '">' +
      '<div class="help-text">Stock is deducted automatically when you save.</div></div>' +

      '<div class="field"><label for="mtNewPartText">Part name (free text)</label>' +
      '<input type="text" id="mtNewPartText" name="newPart" value="' + U.escAttr(d.newPart) + '" placeholder="Filled automatically from the store item">' +
      '<div class="help-text">Use this if the part is not tracked in the store.</div></div>' +

      '<div class="field col-span-2" id="mtStockInfo"></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('activity') + 'Resolution</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="mtStatus">Status <span class="req">*</span></label>' +
      '<select id="mtStatus" name="status">' + ui.options(C.MAINT_STATUS, d.status) + '</select></div>' +

      '<div class="field"><label for="mtRepairDate">Repair Date</label>' +
      '<input type="date" id="mtRepairDate" name="repairDate" value="' + U.escAttr(d.repairDate) + '">' +
      '<div class="help-text">Set automatically when the status becomes Resolved.</div></div>' +

      '<div class="field col-span-2"><label for="mtRemarks">Remarks</label>' +
      '<textarea id="mtRemarks" name="remarks" rows="2">' + U.esc(d.remarks) + '</textarea></div>' +
      '</div></fieldset></form>';

    ITL.modal.open({
      title: editing ? 'Edit maintenance record' : 'Report a fault',
      subtitle: editing ? d.id : 'Log a new fault and record any parts consumed',
      icon: 'wrench',
      iconTone: 'warn',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="mtSave">' + ITL.icon('check') + (editing ? 'Save changes' : 'Save fault report') + '</button>',
      onMount: function (el, api) {
        var pcSel = el.querySelector('#mtPc');
        var infoBox = el.querySelector('#mtPcInfo');
        var partSel = el.querySelector('#mtNewPartItem');
        var partText = el.querySelector('#mtNewPartText');
        var qtyIn = el.querySelector('#mtQty');
        var stockBox = el.querySelector('#mtStockInfo');
        var statusSel = el.querySelector('#mtStatus');
        var repairIn = el.querySelector('#mtRepairDate');

        function refreshPc() {
          var mo = machines.filter(function (x) { return String(x.id) === String(pcSel.value); })[0];
          if (!mo) { infoBox.innerHTML = ''; return; }
          var r = mo.rec;
          infoBox.innerHTML =
            '<div class="info-strip">' +
            '<div class="is-item"><div class="is-label">PC Name</div><div class="is-value">' + U.esc(mo.name) + '</div></div>' +
            '<div class="is-item"><div class="is-label">Lab</div><div class="is-value">' + U.esc(mo.lab) + '</div></div>' +
            '<div class="is-item"><div class="is-label">Current status</div><div class="is-value">' + U.esc(mo.status || '—') + '</div></div>' +
            '<div class="is-item"><div class="is-label">Processor</div><div class="is-value">' + (U.esc(r.processor) || '—') + '</div></div>' +
            '<div class="is-item"><div class="is-label">RAM</div><div class="is-value">' + (U.esc(r.ram) || '—') + '</div></div>' +
            '<div class="is-item"><div class="is-label">Storage</div><div class="is-value">' + (U.esc(r.storage) || '—') + '</div></div>' +
            '<div class="is-item"><div class="is-label">Past faults</div><div class="is-value">' + ITL.data.maintenanceForPc(r).length + '</div></div>' +
            '</div>';
        }

        function refreshStock() {
          var it = partSel.value ? ITL.data.item(partSel.value) : null;
          if (!it) {
            stockBox.innerHTML = '';
            if (qtyIn.value === '0' || !partSel.value) { /* keep as is */ }
            return;
          }
          if (partText) partText.value = it.itemName;
          if (U.int(qtyIn.value, 0) < 1) qtyIn.value = 1;
          var avail = U.int(it.quantity, 0);
          // when editing, the previously consumed quantity is still deducted
          var creditBack = (editing && String(rec.newPartItemId) === String(it.id)) ? U.int(rec.quantity, 0) : 0;
          var effective = avail + creditBack;
          var req = U.int(qtyIn.value, 0);
          var cls = effective <= 0 ? 'bad' : req > effective ? 'bad' : (effective <= U.int(it.minStock, 5) ? 'low' : 'ok');
          stockBox.innerHTML =
            '<div class="stock-strip ' + cls + '">' + ITL.icon(cls === 'ok' ? 'checkCircle' : 'alert') +
            '<span>' + U.esc(it.itemName) + ' — available <b>' + effective + ' ' + U.esc(it.unit || 'Piece') + '</b>' +
            (creditBack ? ' <span style="opacity:.75">(includes ' + creditBack + ' currently allocated to this record)</span>' : '') +
            (req > effective ? ' · <b>INSUFFICIENT STOCK</b> — requested ' + req : '') +
            '</span></div>';
        }

        pcSel.addEventListener('change', refreshPc);
        partSel.addEventListener('change', refreshStock);
        qtyIn.addEventListener('input', refreshStock);
        statusSel.addEventListener('change', function () {
          if (statusSel.value === 'Resolved' && !repairIn.value) repairIn.value = U.today();
          if (statusSel.value !== 'Resolved' && repairIn.value === U.today() && !editing) repairIn.value = '';
        });

        refreshPc();
        refreshStock();

        el.querySelector('#mtSave').addEventListener('click', function () { save(el, api); });
      }
    });

    function save(el, api) {
      var form = el.querySelector('#mtForm');
      var data = ITL.validation.readForm(form);

      var res = ITL.validation.check(data, {
        pcId: { label: 'PC', required: true },
        complaintDate: { label: 'Complaint Date', required: true, date: true },
        problem: { label: 'Problem Description', required: true, maxLength: 600 },
        category: { label: 'Problem Category', required: true, oneOf: C.PROBLEM_CATEGORIES },
        status: { label: 'Status', required: true, oneOf: C.MAINT_STATUS },
        quantity: { label: 'Quantity', integer: true, min: 0 },
        repairDate: { label: 'Repair Date', date: true },
        remarks: { label: 'Remarks', maxLength: 500 }
      });
      if (!ITL.validation.apply(form, res)) return;

      if (U.monthKey(data.complaintDate) !== curMonthKey) {
        ITL.validation.setError(form, 'complaintDate', 'Only ' + curMonthLabel + ' can be logged or edited here. Past months are archived — download them from Monthly Archive.');
        return;
      }

      var mo = machines.filter(function (x) { return String(x.id) === String(data.pcId); })[0];
      if (!mo) { ITL.validation.setError(form, 'pcId', 'Please choose a computer.'); return; }

      var qty = U.int(data.quantity, 0);
      var itemId = data.newPartItemId;

      /* ---- stock validation BEFORE saving anything ---- */
      if (itemId && qty > 0) {
        var item = ITL.data.item(itemId);
        if (!item) { ITL.validation.setError(form, 'newPartItemId', 'Store item no longer exists.'); return; }
        var creditBack = (editing && String(rec.newPartItemId) === String(itemId)) ? U.int(rec.quantity, 0) : 0;
        var effective = U.int(item.quantity, 0) + creditBack;
        if (qty > effective) {
          ITL.validation.insufficientStock({ available: effective, requested: qty, item: item });
          ITL.validation.setError(form, 'quantity', 'INSUFFICIENT STOCK — only ' + effective + ' available.');
          return;
        }
      }
      if (itemId && qty <= 0) {
        ITL.validation.setError(form, 'quantity', 'Enter how many units were used, or clear the store part.');
        return;
      }

      api.setBusy(true, 'Saving…');
      setTimeout(function () {
        try { commit(api, data, mo, qty, itemId); }
        catch (err) {
          api.setBusy(false);
          console.error(err);
          ITL.toast.error('Unable to save record', err.message || 'Unexpected error');
        }
      }, 40);
    }

    function commit(api, data, mo, qty, itemId) {
      var now = U.nowISO();
      var payload = Object.assign({}, data, {
        pcName: mo.name,
        lab: mo.lab,
        quantity: qty,
        newPartItemId: itemId || '',
        updatedAt: now
      });
      if (payload.status === 'Resolved' && !payload.repairDate) payload.repairDate = U.today();

      var record;

      if (editing) {
        /* Reverse any previous stock consumption before applying the new one */
        if (rec.stockTxId) {
          ITL.stock.reverse(rec.stockTxId, 'Maintenance ' + rec.id + ' edited');
          var oldTx = S.find(K.stockTx, rec.stockTxId);
          if (oldTx) S.delete(K.stockTx, rec.stockTxId);
        }
        record = Object.assign({}, rec, payload, { stockTxId: '' });
      } else {
        record = ITL.factory.maintenance(payload);
      }

      /* Apply new stock consumption */
      if (itemId && qty > 0) {
        var out = ITL.stock.apply({
          itemId: itemId,
          type: 'Stock Out',
          quantity: qty,
          reason: 'Used in maintenance — ' + (record.pcName || '') + (record.category ? ' (' + record.category + ')' : ''),
          maintenanceId: record.id,
          date: record.repairDate || record.complaintDate,
          silent: true
        });
        if (!out.ok) {
          api.setBusy(false);
          ITL.validation.insufficientStock({ available: out.available, requested: out.requested, item: out.item });
          return; // nothing saved
        }
        record.stockTxId = out.tx.id;
        record.newPart = out.item.itemName || record.newPart;
        ITL.activity.log('Store', 'Stock Out', out.item.id,
          'Stock used for maintenance ' + record.id + ' — ' + qty + ' × ' + out.item.itemName +
          ' (' + out.prev + ' → ' + out.next + ')');
      }

      if (editing) S.replace(K.maintenance, id, record);
      else S.insert(K.maintenance, record);

      /* Keep the PC status in sync with the fault */
      syncPcStatus(mo, record);

      ITL.activity.log('Maintenance', editing ? 'Updated' : 'Created', record.id,
        (editing ? 'Maintenance updated — ' : 'Fault reported — ') + record.pcName + ': ' + record.problem);

      api.setBusy(false);
      api.close();
      ITL.toast.success(editing ? 'Maintenance saved' : 'Fault reported',
        record.pcName + ' · ' + record.status + (qty && itemId ? ' · ' + qty + ' part(s) issued from store' : ''));
      ITL.router.reload();
      ITL.app.refreshChrome();
    }
  };

  /** Faulty PC while a fault is open; back to Working once resolved. */
  function syncPcStatus(mo, record) {
    if (!mo || !mo.rec) return;
    var key = mo.kind === 'Staff' ? K.staff : K.pcs;
    var current = S.find(key, mo.id);
    if (!current) return;
    if (current.status === 'Retired' || current.status === 'Hold') return;

    var open = ITL.data.maintenance().filter(function (m) {
      return String(m.pcId) === String(mo.id) && (m.status === 'Pending' || m.status === 'In Progress');
    });
    var next = open.length ? 'Faulty' : 'Working';
    if (current.status !== next) {
      S.patch(key, mo.id, { status: next, updatedAt: U.nowISO() });
      ITL.activity.log(mo.kind === 'Staff' ? 'Staff Systems' : 'PC Inventory', 'Updated', mo.id,
        'Status changed to ' + next + ' (linked to maintenance ' + record.id + ')');
    }
  }

  /* ============================================================== DETAIL */
  mnt.openDetail = function (id) {
    var r = ITL.data.maint(id);
    if (!r) { ITL.toast.error('Record not found'); return; }
    var tx = r.stockTxId ? S.find(K.stockTx, r.stockTxId) : null;
    var pc = r.pcId ? (ITL.data.pc(r.pcId) || ITL.data.staffMember(r.pcId)) : null;

    var locked = isLocked(r);
    var canResolve = !locked && r.status !== 'Resolved' && r.status !== 'Cancelled';

    ITL.modal.open({
      title: 'Maintenance ' + r.id,
      subtitle: (r.pcName || '') + ' · ' + (r.lab || '') + ' · ' + r.status,
      icon: 'wrench',
      iconTone: r.status === 'Resolved' ? 'success' : 'warn',
      size: 'lg',
      panel: true,
      body:
        (locked ? '<div class="alert alert-info mb-4">' + ITL.icon('lock') +
          '<div class="alert-body"><div class="alert-title">Archived — ' + U.esc(U.monthLabel(U.monthKey(r.complaintDate))) + '</div>' +
          'This month is closed. The record is view-only — download the full month from Monthly Archive.</div></div>' : '') +
        '<div class="detail-section">' + ui.sectionTitle('Fault information', 'alert') +
        '<div class="detail-grid">' +
        ui.field('Maintenance ID', r.id, { mono: true }) +
        ui.field('Complaint Date', U.fmtDate(r.complaintDate)) +
        ui.field('Status', ui.maintStatusBadge(r.status), { html: true }) +
        ui.field('Category', r.category ? ui.badge(r.category, 'neutral', true) : '', { html: true }) +
        ui.field('Technician', r.technician) +
        ui.field('Repair Date', r.repairDate ? U.fmtDate(r.repairDate) : '') +
        ui.field('Problem Description', r.problem, { full: true }) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Computer', 'desktop') +
        '<div class="detail-grid">' +
        ui.field('PC Name', r.pcName) +
        ui.field('PC Record ID', r.pcId, { mono: true }) +
        ui.field('Lab', ui.labBadge(r.lab), { html: true }) +
        (pc ? ui.field('Current PC status', ui.pcStatusBadge(pc.status), { html: true }) : '') +
        '</div>' +
        (pc ? '<div class="mt-4"><button type="button" class="btn btn-secondary btn-sm" data-mt="openpc">' + ITL.icon('externalLink') + 'Open PC record</button></div>' : '') +
        '</div>' +

        '<div class="detail-section">' + ui.sectionTitle('Parts', 'package') +
        '<div class="detail-grid">' +
        ui.field('Old / removed part', r.oldPart) +
        ui.field('New part', r.newPart) +
        ui.field('Quantity used', r.quantity ? String(r.quantity) : '') +
        (tx ? ui.field('Stock transaction', tx.id + ' (' + tx.prevQty + ' → ' + tx.newQty + ')', { mono: true }) : '') +
        '</div>' +
        (tx ? '<div class="mt-4"><button type="button" class="btn btn-secondary btn-sm" data-mt="openitem">' + ITL.icon('externalLink') + 'Open store item</button></div>' : '') +
        '</div>' +

        '<div class="detail-section">' + ui.sectionTitle('Remarks & audit', 'info') +
        '<div class="detail-grid">' +
        ui.field('Remarks', r.remarks, { full: true }) +
        ui.field('Created', U.fmtDateTime(r.createdAt)) +
        ui.field('Last updated', U.fmtDateTime(r.updatedAt)) +
        '</div></div>',
      footer:
        locked ?
          '<button type="button" class="btn btn-secondary" data-modal-close>Close</button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="btn btn-primary" data-primary data-mt="archive">' + ITL.icon('archive') + 'Open Monthly Archive</button>'
        :
          '<button type="button" class="btn btn-danger-soft" data-mt="delete">' + ITL.icon('trash') + 'Delete</button>' +
          '<div style="flex:1"></div>' +
          (canResolve ? '<button type="button" class="btn btn-success" data-mt="resolve">' + ITL.icon('checkCircle') + 'Mark resolved</button>' : '') +
          '<button type="button" class="btn btn-primary" data-primary data-mt="edit">' + ITL.icon('edit') + 'Edit</button>',
      onMount: function (el, api) {
        U.on(el, 'click', '[data-mt]', function (e, b) {
          var act = b.getAttribute('data-mt');
          if (act === 'edit') { api.close(); mnt.openForm(r.id); }
          else if (act === 'delete') { api.close(); mnt.remove(r.id); }
          else if (act === 'resolve') { api.close(); mnt.resolve(r.id); }
          else if (act === 'archive') { api.close(); ITL.router.go('archive'); }
          else if (act === 'openpc') {
            api.close();
            if (ITL.data.pc(r.pcId)) ITL.router.go('inventory', { open: r.pcId });
            else ITL.router.go('staff', { open: r.pcId });
          }
          else if (act === 'openitem' && tx) { api.close(); ITL.router.go('store', { open: tx.itemId }); }
        });
      }
    });
  };

  /* ============================================================= RESOLVE */
  mnt.resolve = function (id) {
    var r = ITL.data.maint(id);
    if (!r) return;
    if (isLocked(r)) { showLockedInfo(id); return; }

    ITL.modal.open({
      title: 'Mark as resolved',
      subtitle: r.id + ' · ' + (r.pcName || ''),
      icon: 'checkCircle',
      iconTone: 'success',
      size: 'sm',
      body:
        '<form id="rsForm">' +
        '<div class="field"><label for="rsDate">Repair date</label>' +
        '<input type="date" id="rsDate" name="repairDate" value="' + U.escAttr(r.repairDate || U.today()) + '" data-autofocus></div>' +
        '<div class="field mt-4"><label for="rsRemarks">Resolution remarks</label>' +
        '<textarea id="rsRemarks" name="remarks" rows="3" placeholder="What was done to fix it?">' + U.esc(r.remarks) + '</textarea></div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-success" data-primary id="rsGo">' + ITL.icon('check') + 'Mark resolved</button>',
      onMount: function (el, api) {
        el.querySelector('#rsGo').addEventListener('click', function () {
          var data = ITL.validation.readForm(el.querySelector('#rsForm'));
          api.setBusy(true, 'Saving…');
          setTimeout(function () {
            var updated = S.patch(K.maintenance, id, {
              status: 'Resolved',
              repairDate: data.repairDate || U.today(),
              remarks: data.remarks,
              updatedAt: U.nowISO()
            });
            var mo = machineOptions().filter(function (x) { return String(x.id) === String(r.pcId); })[0];
            if (mo) syncPcStatus(mo, updated || r);
            ITL.activity.log('Maintenance', 'Resolved', id, 'Fault resolved — ' + r.pcName + ': ' + r.problem);
            api.setBusy(false);
            api.close();
            ITL.toast.success('Maintenance resolved', (r.pcName || r.id) + ' marked as resolved');
            ITL.router.reload();
            ITL.app.refreshChrome();
          }, 40);
        });
      }
    });
  };

  /* ============================================================== DELETE */
  mnt.remove = function (id) {
    var r = ITL.data.maint(id);
    if (!r) return;
    if (isLocked(r)) { showLockedInfo(id); return; }
    var tx = r.stockTxId ? S.find(K.stockTx, r.stockTxId) : null;

    var doDelete = function () {
      if (tx) {
        ITL.stock.reverse(tx.id, 'Maintenance ' + r.id + ' deleted — stock returned');
        S.delete(K.stockTx, tx.id);
      }
      S.delete(K.maintenance, id);
      var mo = machineOptions().filter(function (x) { return String(x.id) === String(r.pcId); })[0];
      if (mo) syncPcStatus(mo, r);
      ITL.activity.log('Maintenance', 'Deleted', id, 'Maintenance deleted — ' + (r.pcName || '') + ': ' + (r.problem || ''));
      ITL.toast.success('Maintenance deleted', tx ? 'Record removed and ' + tx.quantity + ' × ' + tx.itemName + ' returned to store' : 'Record removed');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };

    if (ITL.settings.get().confirmDeletes === false) { doDelete(); return; }

    ITL.modal.confirm({
      heading: 'Delete maintenance record',
      title: 'Delete ' + r.id + '?',
      messageHtml: 'This permanently removes the maintenance record.' +
        (tx ? '<br><br><b>' + tx.quantity + ' × ' + U.esc(tx.itemName) + '</b> will be returned to the store inventory.' : ''),
      tone: 'danger', confirmLabel: 'Delete record'
    }).then(function (ok) { if (ok) doDelete(); });
  };

  /* =============================================================== EXCEL */
  mnt.exportExcel = function () {
    var rows = filtered(), all = currentMonthRows(), v = view();
    ITL.exporter.chooseScope({ filteredCount: rows.length, totalCount: all.length, noun: 'maintenance records' })
      .then(function (scope) {
        if (!scope) return;
        var data = scope === 'all' ? all : rows;
        if (!data.length) { ITL.toast.warn('Nothing to export', 'No maintenance records to include.'); return; }
        var ft = [];
        if (scope !== 'all') {
          Object.keys(v.filters).forEach(function (k) { if (v.filters[k]) ft.push(U.titleCase(k) + ' = ' + v.filters[k]); });
          if (v.search) ft.push('Search: "' + v.search + '"');
        }
        ITL.modal.withBusy('Generating Excel…', 'Building the maintenance report', function () {
          var name = ITL.excel.exportCollection({
            schemaId: 'maintenance',
            rows: U.sortBy(data, 'complaintDate', 'desc'),
            scope: scope === 'all' ? 'All records' : 'Filtered records',
            filters: ft.join(', ') || 'None',
            filenameBase: 'IT_Lab_Maintenance',
            totals: ['quantity']
          });
          ITL.activity.log('Maintenance', 'Exported', '', 'Downloaded ' + name + ' (' + data.length + ' records)');
          ITL.toast.success('Excel downloaded', name);
        });
      });
  };

})(window);
