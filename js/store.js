/* ==========================================================================
   store.js — Store Inventory page
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
  var store = ITL.store = {};

  var VIEW = 'store';

  function view() {
    return ITL.state.view(VIEW, {
      search: '', page: 1, sortKey: 'itemName', sortDir: 'asc',
      tab: 'items',
      filters: { category: '', status: '', condition: '', location: '' }
    });
  }

  function txView() {
    return ITL.state.view('storeTx', {
      search: '', page: 1, sortKey: 'date', sortDir: 'desc',
      filters: { type: '', itemName: '' }
    });
  }

  function filtered() {
    var v = view(), f = v.filters;
    return ITL.data.store().filter(function (r) {
      if (f.category && r.category !== f.category) return false;
      if (f.condition && r.condition !== f.condition) return false;
      if (f.location && r.location !== f.location) return false;
      if (f.status && ITL.data.itemStatus(r) !== f.status) return false;
      if (v.search && !U.matches(r, v.search,
        ['id', 'itemName', 'category', 'brand', 'model', 'unit', 'condition', 'location', 'remarks'])) return false;
      return true;
    });
  }

  function filteredTx() {
    var v = txView(), f = v.filters;
    return ITL.data.stockTx().filter(function (r) {
      if (f.type && r.type !== f.type) return false;
      if (f.itemName && r.itemName !== f.itemName) return false;
      if (v.search && !U.matches(r, v.search, ['id', 'itemId', 'itemName', 'type', 'reason', 'maintenanceId', 'purchaseId', 'remarks'])) return false;
      return true;
    });
  }

  /* ================================================================ PAGE */
  pages.store = {
    title: 'Store Inventory',

    render: function (root, params) {
      var v = view();
      if (params && params.status) { v.filters.status = params.status; v.page = 1; v.tab = 'items'; }
      if (params && params.tab) v.tab = params.tab;

      var all = ITL.data.store();
      var st = ITL.data.stats().store;

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Store Inventory</div>' +
        '<div class="page-sub">Spare parts, consumables and every stock movement</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="import">' + ITL.icon('upload') + 'Import Excel</button>' +
        '<button class="btn btn-excel" data-action="export">' + ITL.icon('excel') + 'Download Excel</button>' +
        '<button class="btn btn-primary" data-action="add">' + ITL.icon('plus') + 'Add Item</button>' +
        '</div></div>' +

        '<div class="stat-grid mb-4">' +
        ui.statCard({ label: 'Total items', value: st.total, icon: 'package', color: '#3b66f6', bg: 'var(--info-bg)', meta: U.fmtNum(st.totalUnits) + ' units in stock' }) +
        ui.statCard({ label: 'Available', value: st.available, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'filter-status', args: { status: 'Available' } }) +
        ui.statCard({ label: 'Low stock', value: st.lowStock, icon: 'alert', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'filter-status', args: { status: 'Low Stock' } }) +
        ui.statCard({ label: 'Out of stock', value: st.outOfStock, icon: 'slash', color: '#ef4444', bg: 'var(--danger-bg)', action: 'filter-status', args: { status: 'Out of Stock' } }) +
        ui.statCard({ label: 'Faulty', value: st.faulty, icon: 'alert', color: '#ef4444', bg: 'var(--danger-bg)', action: 'filter-status', args: { status: 'Faulty' } }) +
        ui.statCard({ label: 'Hold', value: st.hold, icon: 'slash', color: '#3b82f6', bg: 'var(--info-bg)', action: 'filter-status', args: { status: 'Hold' } }) +
        '</div>' +

        '<div class="card mb-4"><div class="card-body tight">' +
        '<div class="row-2">' +
        '<button class="btn btn-success btn-sm" data-action="stock-in">' + ITL.icon('plusCircle') + 'Add Stock</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="stock-out">' + ITL.icon('minusCircle') + 'Use Stock</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="stock-adjust">' + ITL.icon('sliders') + 'Adjust Stock</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="stock-return">' + ITL.icon('rotate') + 'Return Stock</button>' +
        '<div class="toolbar-spacer"></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="export-tx">' + ITL.icon('download') + 'Export transactions</button>' +
        '</div></div></div>' +

        '<div class="card">' +
        '<div class="tabs" role="tablist">' +
        '<button class="tab' + (v.tab === 'items' ? ' active' : '') + '" data-tab="items" role="tab">' + ITL.icon('package') + 'Items<span class="tab-count">' + all.length + '</span></button>' +
        '<button class="tab' + (v.tab === 'tx' ? ' active' : '') + '" data-tab="tx" role="tab">' + ITL.icon('history') + 'Stock Transactions<span class="tab-count">' + ITL.data.stockTx().length + '</span></button>' +
        '</div>' +
        '<div id="storeBody"></div>' +
        '</div>';

      renderBody(root);
      bind(root);
      if (params && params.focus) ui.highlightRow(params.focus);
      if (params && params.open) { var rec = ITL.data.item(params.open); if (rec) store.openDetail(rec.id); }
    }
  };

  function renderBody(root) {
    var v = view();
    var host = root.querySelector('#storeBody');
    if (!host) return;

    if (v.tab === 'tx') { renderTxTable(root, host); return; }

    var all = ITL.data.store();
    host.innerHTML =
      '<div class="toolbar">' +
      ui.searchInput(v.search, 'Search item, brand, model, location…') +
      ui.selectFilter('category', 'Category', C.STORE_CATEGORIES, v.filters.category) +
      ui.selectFilter('status', 'Status', C.STORE_STATUS, v.filters.status) +
      ui.selectFilter('condition', 'Condition', C.CONDITIONS, v.filters.condition) +
      ui.selectFilter('location', 'Location', U.uniqueValues(all, 'location'), v.filters.location) +
      '<div class="toolbar-spacer"></div>' +
      '<button class="btn btn-secondary btn-sm" data-action="clear-filters">' + ITL.icon('x') + 'Clear</button>' +
      '</div>' +
      '<div id="stFilterChips2"></div>' +
      '<div id="storeTable"></div>';

    renderItemTable(root);
  }

  function renderItemTable(root) {
    var v = view();
    var rows = filtered();
    var chips = root.querySelector('#stFilterChips2');
    if (chips) chips.innerHTML = ui.filterChips(v.filters, {
      category: 'Category', status: 'Status', condition: 'Condition', location: 'Location'
    });

    ui.renderTable({
      mount: root.querySelector('#storeTable'),
      view: v,
      noun: 'item',
      totalUnfiltered: ITL.data.store().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      rowClass: function (r) {
        var s = ITL.data.itemStatus(r);
        return s === 'Out of Stock' ? 'row-danger' : (s === 'Low Stock' ? 'row-warn' : '');
      },
      columns: [
        { key: 'id', label: 'Item ID', sortable: true, cls: 'cell-id', width: '96px' },
        {
          key: 'itemName', label: 'Item', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.itemName) || '—') + '</span>' +
              ((r.brand || r.model) ? '<span class="cs-sub">' + U.esc([r.brand, r.model].filter(Boolean).join(' · ')) + '</span>' : '') + '</div>';
          }
        },
        { key: 'category', label: 'Category', sortable: true, width: '146px', render: function (r) { return r.category ? ui.badge(r.category, 'neutral', true) : ''; } },
        {
          key: 'quantity', label: 'Quantity', sortable: true, align: 'right', width: '110px', render: function (r) {
            var q = U.int(r.quantity, 0), min = U.int(r.minStock, 0);
            var color = q <= 0 ? 'var(--danger-fg)' : q <= min ? 'var(--warn-fg)' : 'var(--text-primary)';
            return '<div class="cell-stack" style="align-items:flex-end">' +
              '<span class="cs-main" style="color:' + color + '">' + U.fmtNum(q) + ' ' + U.esc(r.unit || '') + '</span>' +
              '<span class="cs-sub">min ' + min + '</span></div>';
          }
        },
        { key: 'condition', label: 'Condition', sortable: true, width: '110px' },
        { key: 'location', label: 'Location', sortable: true },
        { key: 'status', label: 'Status', sortable: true, width: '124px', render: function (r) { return ui.storeStatusBadge(ITL.data.itemStatus(r)); } },
        { key: 'updatedAt', label: 'Updated', sortable: true, cls: 'cell-date', width: '112px', render: function (r) { return U.esc(U.fmtDate(r.updatedAt)); } }
      ],
      actions: function (r) {
        return ui.rowActions([
          { action: 'view', id: r.id, icon: 'eye', label: 'View details' },
          { action: 'row-in', id: r.id, icon: 'plusCircle', label: 'Add stock' },
          { action: 'row-out', id: r.id, icon: 'minusCircle', label: 'Use stock' },
          { action: 'row-history', id: r.id, icon: 'history', label: 'Stock history' },
          { action: 'edit', id: r.id, icon: 'edit', label: 'Edit item' },
          { action: 'delete', id: r.id, icon: 'trash', label: 'Delete item', danger: true }
        ]);
      },
      onRowClick: function (r) { store.openDetail(r.id); },
      empty: {
        icon: 'package',
        title: 'Store inventory is empty',
        desc: 'Add the spare parts and consumables you keep in the store, or import an existing Excel sheet.',
        actions: [
          { label: 'Add Item', icon: 'plus', cls: 'btn-primary', action: 'add' },
          { label: 'Import Excel', icon: 'upload', cls: 'btn-secondary', action: 'import' }
        ]
      },
      onChange: function () { renderItemTable(root); }
    });
  }

  function renderTxTable(root, host) {
    var v = txView();
    host.innerHTML =
      '<div class="toolbar">' +
      ui.searchInput(v.search, 'Search item, reason, reference…') +
      ui.selectFilter('type', 'Type', C.TX_TYPES, v.filters.type) +
      ui.selectFilter('itemName', 'Item', U.uniqueValues(ITL.data.stockTx(), 'itemName'), v.filters.itemName) +
      '<div class="toolbar-spacer"></div>' +
      '<button class="btn btn-excel btn-sm" data-action="export-tx">' + ITL.icon('excel') + 'Download Excel</button>' +
      '</div><div id="txTable"></div>';

    var rows = filteredTx();
    ui.renderTable({
      mount: host.querySelector('#txTable'),
      view: v,
      noun: 'transaction',
      totalUnfiltered: ITL.data.stockTx().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      columns: [
        { key: 'id', label: 'Transaction ID', sortable: true, cls: 'cell-id', width: '128px' },
        { key: 'date', label: 'Date', sortable: true, cls: 'cell-date', width: '110px', render: function (r) { return U.esc(U.fmtDate(r.date)); } },
        {
          key: 'itemName', label: 'Item', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.itemName) || '—') + '</span>' +
              '<span class="cs-sub mono">' + U.esc(r.itemId) + '</span></div>';
          }
        },
        { key: 'type', label: 'Type', sortable: true, width: '120px', render: function (r) { return ui.txBadge(r.type); } },
        { key: 'quantity', label: 'Qty', sortable: true, align: 'right', cls: 'cell-num', width: '76px' },
        { key: 'prevQty', label: 'Before', sortable: true, align: 'right', cls: 'cell-num', width: '84px' },
        { key: 'newQty', label: 'After', sortable: true, align: 'right', cls: 'cell-num', width: '80px' },
        {
          key: 'reason', label: 'Reason', sortable: true, render: function (r) {
            return '<div class="truncate" style="max-width:260px" title="' + U.escAttr(r.reason) + '">' + (U.esc(r.reason) || '—') + '</div>';
          }
        },
        {
          key: 'maintenanceId', label: 'Reference', sortable: true, width: '130px', render: function (r) {
            if (r.maintenanceId) return '<button class="btn btn-sm btn-ghost" data-action="open-maint" data-id="' + U.escAttr(r.maintenanceId) + '">' + U.esc(r.maintenanceId) + '</button>';
            if (r.purchaseId) return '<button class="btn btn-sm btn-ghost" data-action="open-purchase" data-id="' + U.escAttr(r.purchaseId) + '">' + U.esc(r.purchaseId) + '</button>';
            return '';
          }
        }
      ],
      actions: function (r) {
        return ui.rowActions([{ action: 'row-history', id: r.itemId, icon: 'history', label: 'Item stock history' }]);
      },
      empty: {
        icon: 'history',
        title: 'No stock transactions yet',
        desc: 'Every stock movement — in, out, adjustment or return — is recorded here automatically.',
        actions: [{ label: 'Add Stock', icon: 'plusCircle', cls: 'btn-primary', action: 'stock-in' }]
      },
      onChange: function () { renderTxTable(root, host); }
    });
  }

  function bind(root) {
    var v = view();

    U.on(root, 'click', '[data-tab]', function (e, el) {
      v.tab = el.getAttribute('data-tab');
      U.qsa('[data-tab]', root).forEach(function (t) { t.classList.remove('active'); });
      el.classList.add('active');
      renderBody(root);
    });

    U.on(root, 'input', '[data-search]', U.debounce(function (e, el) {
      var vv = view().tab === 'tx' ? txView() : view();
      vv.search = el.value; vv.page = 1;
      if (view().tab === 'tx') renderTxTable(root, root.querySelector('#storeBody'));
      else renderItemTable(root);
    }, 200));

    U.on(root, 'change', '[data-filter]', function (e, el) {
      var vv = view().tab === 'tx' ? txView() : view();
      vv.filters[el.getAttribute('data-filter')] = el.value;
      vv.page = 1;
      if (view().tab === 'tx') renderTxTable(root, root.querySelector('#storeBody'));
      else renderItemTable(root);
    });

    U.on(root, 'click', '[data-clear-filter]', function (e, el) {
      v.filters[el.getAttribute('data-clear-filter')] = ''; v.page = 1; ITL.router.reload();
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      var id = el.getAttribute('data-id');
      var args = el.getAttribute('data-args');
      try { args = args ? JSON.parse(args) : null; } catch (x) { args = null; }
      var reload = function () { ITL.router.reload(); };

      switch (a) {
        case 'add': store.openForm(); break;
        case 'view': store.openDetail(id); break;
        case 'edit': store.openForm(id); break;
        case 'delete': store.remove(id); break;
        case 'import': store.importExcel(); break;
        case 'export': store.exportExcel(); break;
        case 'export-tx': store.exportTransactions(); break;
        case 'stock-in': ITL.stock.openModal('Stock In', null, reload); break;
        case 'stock-out': ITL.stock.openModal('Stock Out', null, reload); break;
        case 'stock-adjust': ITL.stock.openModal('Adjustment', null, reload); break;
        case 'stock-return': ITL.stock.openModal('Return', null, reload); break;
        case 'row-in': ITL.stock.openModal('Stock In', id, reload); break;
        case 'row-out': ITL.stock.openModal('Stock Out', id, reload); break;
        case 'row-history': ITL.stock.openHistory(id); break;
        case 'open-maint': ITL.router.go('maintenance', { open: id }); break;
        case 'open-purchase': ITL.router.go('purchases', { open: id }); break;
        case 'clear-filters':
          v.search = ''; v.page = 1;
          Object.keys(v.filters).forEach(function (k) { v.filters[k] = ''; });
          ITL.router.reload();
          break;
        case 'filter-status':
          if (args && args.status) {
            v.tab = 'items';
            v.filters.status = v.filters.status === args.status ? '' : args.status;
            v.page = 1; ITL.router.reload();
          }
          break;
      }
    });
  }

  /* ============================================================ ADD/EDIT */
  store.openForm = function (id) {
    var editing = !!id;
    var rec = editing ? ITL.data.item(id) : null;
    if (editing && !rec) { ITL.toast.error('Item not found'); return; }
    var d = rec || ITL.factory.storeItem({});
    var all = ITL.data.store();

    var body =
      '<form id="itForm" novalidate autocomplete="off">' +
      '<div data-error-summary style="display:none;margin-bottom:16px"></div>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('clipboard') + 'Identification</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="itName">Item Name <span class="req">*</span></label>' +
      '<input type="text" id="itName" name="itemName" value="' + U.escAttr(d.itemName) + '" placeholder="e.g. Ethernet Connector RJ45" data-autofocus></div>' +

      '<div class="field"><label for="itCat">Category <span class="req">*</span></label>' +
      '<select id="itCat" name="category">' + ui.options(C.STORE_CATEGORIES, d.category) + '</select></div>' +

      '<div class="field"><label for="itBrand">Brand</label>' +
      '<input type="text" id="itBrand" name="brand" value="' + U.escAttr(d.brand) + '" list="dlBrand">' +
      ui.datalist('dlBrand', U.uniqueValues(all, 'brand')) + '</div>' +

      '<div class="field"><label for="itModel">Model</label>' +
      '<input type="text" id="itModel" name="model" value="' + U.escAttr(d.model) + '"></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('package') + 'Stock</legend>' +
      '<div class="form-grid cols-3">' +
      '<div class="field"><label for="itQty">Quantity <span class="req">*</span></label>' +
      '<input type="number" id="itQty" name="quantity" min="0" step="1" value="' + U.int(d.quantity, 0) + '"' + (editing ? ' readonly' : '') + '>' +
      '<div class="help-text">' + (editing
        ? 'Quantity is changed through stock operations so every movement is recorded.'
        : 'Opening stock. An opening "Stock In" transaction is created.') + '</div></div>' +

      '<div class="field"><label for="itUnit">Unit</label>' +
      '<select id="itUnit" name="unit">' + ui.options(C.UNITS, d.unit) + '</select></div>' +

      '<div class="field"><label for="itMin">Minimum stock level</label>' +
      '<input type="number" id="itMin" name="minStock" min="0" step="1" value="' + U.int(d.minStock, 5) + '">' +
      '<div class="help-text">Flags the item as Low Stock at or below this level.</div></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('info') + 'Details</legend>' +
      '<div class="form-grid cols-3">' +
      '<div class="field"><label for="itCond">Condition</label>' +
      '<select id="itCond" name="condition">' + ui.options(C.CONDITIONS, d.condition) + '</select></div>' +

      '<div class="field"><label for="itLoc">Location</label>' +
      '<input type="text" id="itLoc" name="location" value="' + U.escAttr(d.location) + '" list="dlLoc" placeholder="e.g. Rack A / Shelf 2">' +
      ui.datalist('dlLoc', U.uniqueValues(all, 'location')) + '</div>' +

      '<div class="field"><label for="itPurchase">Purchase date</label>' +
      '<input type="date" id="itPurchase" name="purchaseDate" value="' + U.escAttr(d.purchaseDate) + '"></div>' +

      '<div class="field"><label for="itStatus">Status override</label>' +
      '<select id="itStatus" name="status">' +
      '<option value="">Automatic (from quantity)</option>' +
      '<option value="Faulty"' + (d.status === 'Faulty' ? ' selected' : '') + '>Faulty</option>' +
      '<option value="Hold"' + (d.status === 'Hold' ? ' selected' : '') + '>Hold</option>' +
      '</select>' +
      '<div class="help-text">Leave automatic unless the stock is faulty or reserved.</div></div>' +

      '<div class="field col-span-2"><label for="itRemarks">Remarks</label>' +
      '<textarea id="itRemarks" name="remarks" rows="2">' + U.esc(d.remarks) + '</textarea></div>' +
      '</div></fieldset></form>';

    ITL.modal.open({
      title: editing ? 'Edit store item' : 'Add store item',
      subtitle: editing ? d.id + ' · ' + d.itemName : 'Register a new part or consumable',
      icon: 'package',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="itSave">' + ITL.icon('check') + (editing ? 'Save changes' : 'Add item') + '</button>',
      onMount: function (el, api) {
        el.querySelector('#itSave').addEventListener('click', function () { save(el, api); });
      }
    });

    function save(el, api) {
      var form = el.querySelector('#itForm');
      var data = ITL.validation.readForm(form);
      var res = ITL.validation.check(data, {
        itemName: { label: 'Item Name', required: true, maxLength: 80 },
        category: { label: 'Category', required: true, oneOf: C.STORE_CATEGORIES },
        quantity: { label: 'Quantity', required: true, integer: true, min: 0 },
        minStock: { label: 'Minimum stock level', integer: true, min: 0 },
        purchaseDate: { label: 'Purchase date', date: true },
        remarks: { label: 'Remarks', maxLength: 500 }
      });
      if (!ITL.validation.apply(form, res)) return;

      if (!editing) {
        var dupe = ITL.validation.checkStoreDuplicate(data, null);
        if (dupe.duplicate) {
          ITL.validation.warnDuplicate(dupe, { confirmLabel: 'Create separate item' }).then(function (ok) {
            if (ok) commit(el, api, data);
          });
          return;
        }
      }
      commit(el, api, data);
    }

    function commit(el, api, data) {
      api.setBusy(true, 'Saving…');
      setTimeout(function () {
        try {
          if (editing) {
            var merged = Object.assign({}, rec, data, {
              quantity: U.int(rec.quantity, 0),   // never change quantity here
              updatedAt: U.nowISO()
            });
            S.replace(K.store, id, merged);
            ITL.activity.log('Store', 'Updated', id, 'Store item updated — ' + merged.itemName);
            ITL.toast.success('Item updated', merged.itemName);
          } else {
            var created = ITL.factory.storeItem(data);
            var opening = U.int(created.quantity, 0);
            created.quantity = 0;
            S.insert(K.store, created);
            if (opening > 0) {
              ITL.stock.apply({
                itemId: created.id, type: 'Stock In', quantity: opening,
                reason: 'Opening stock', date: created.purchaseDate || U.today(), silent: true
              });
            }
            ITL.activity.log('Store', 'Created', created.id,
              'Store item added — ' + created.itemName + ' (' + opening + ' ' + created.unit + ')');
            ITL.toast.success('Item added', created.itemName + ' · ' + opening + ' ' + created.unit);
          }
          api.setBusy(false);
          api.close();
          ITL.router.reload();
          ITL.app.refreshChrome();
        } catch (err) {
          api.setBusy(false);
          ITL.toast.error('Unable to save record', err.message);
        }
      }, 40);
    }
  };

  /* ============================================================== DETAIL */
  store.openDetail = function (id) {
    var r = ITL.data.item(id);
    if (!r) { ITL.toast.error('Item not found'); return; }
    var tx = ITL.stock.history(id);
    var status = ITL.data.itemStatus(r);
    var q = U.int(r.quantity, 0), min = U.int(r.minStock, 0);

    ITL.modal.open({
      title: r.itemName,
      subtitle: r.id + ' · ' + r.category + ' · ' + q + ' ' + (r.unit || 'Piece') + ' in stock',
      icon: 'package',
      iconTone: status === 'Out of Stock' ? 'danger' : status === 'Low Stock' ? 'warn' : 'success',
      size: 'lg',
      panel: true,
      body:
        '<div class="stock-strip ' + (q <= 0 ? 'bad' : q <= min ? 'low' : 'ok') + '" style="margin-bottom:18px">' +
        ITL.icon(q <= 0 ? 'alert' : q <= min ? 'alert' : 'checkCircle') +
        '<span><b>' + q + ' ' + U.esc(r.unit || 'Piece') + '</b> currently in stock · minimum level <b>' + min + '</b> · status <b>' + U.esc(status) + '</b></span></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Item information', 'clipboard') +
        '<div class="detail-grid">' +
        ui.field('Item ID', r.id, { mono: true }) +
        ui.field('Item Name', r.itemName) +
        ui.field('Category', r.category ? ui.badge(r.category, 'neutral', true) : '', { html: true }) +
        ui.field('Brand', r.brand) +
        ui.field('Model', r.model) +
        ui.field('Condition', r.condition) +
        ui.field('Location', r.location) +
        ui.field('Unit', r.unit) +
        ui.field('Purchase date', r.purchaseDate ? U.fmtDate(r.purchaseDate) : '') +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Stock movements (' + tx.length + ')', 'history') +
        (tx.length
          ? '<div class="preview-scroll" style="max-height:280px"><table class="data-table compact-table"><thead><tr>' +
          '<th>Date</th><th>Type</th><th style="text-align:right">Qty</th><th style="text-align:right">After</th><th>Reason</th></tr></thead><tbody>' +
          tx.slice(0, 40).map(function (t) {
            return '<tr><td class="cell-date">' + U.esc(U.fmtDate(t.date)) + '</td>' +
              '<td>' + ui.txBadge(t.type) + '</td>' +
              '<td class="cell-num">' + U.int(t.quantity) + '</td>' +
              '<td class="cell-num">' + U.int(t.newQty) + '</td>' +
              '<td>' + (U.esc(t.reason) || '<span class="muted">—</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          (tx.length > 40 ? '<div class="help-text" style="margin-top:6px">Showing the 40 most recent movements.</div>' : '')
          : ui.emptyState({ icon: 'history', compact: true, title: 'No movements yet', desc: 'Stock changes will be listed here.' })) +
        '</div>' +

        '<div class="detail-section">' + ui.sectionTitle('Remarks & audit', 'info') +
        '<div class="detail-grid">' +
        ui.field('Remarks', r.remarks, { full: true }) +
        ui.field('Created', U.fmtDateTime(r.createdAt)) +
        ui.field('Last updated', U.fmtDateTime(r.updatedAt)) +
        '</div></div>',
      footer:
        '<button type="button" class="btn btn-success btn-sm" data-si="in">' + ITL.icon('plusCircle') + 'Add</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-si="out">' + ITL.icon('minusCircle') + 'Use</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-si="adjust">' + ITL.icon('sliders') + 'Adjust</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-si="return">' + ITL.icon('rotate') + 'Return</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary data-si="edit">' + ITL.icon('edit') + 'Edit</button>',
      onMount: function (el, api) {
        U.on(el, 'click', '[data-si]', function (e, b) {
          var act = b.getAttribute('data-si');
          var after = function () { api.close(); ITL.router.reload(); };
          if (act === 'edit') { api.close(); store.openForm(r.id); }
          else if (act === 'in') ITL.stock.openModal('Stock In', r.id, after);
          else if (act === 'out') ITL.stock.openModal('Stock Out', r.id, after);
          else if (act === 'adjust') ITL.stock.openModal('Adjustment', r.id, after);
          else if (act === 'return') ITL.stock.openModal('Return', r.id, after);
        });
      }
    });
  };

  /* ============================================================== DELETE */
  store.remove = function (id) {
    var r = ITL.data.item(id);
    if (!r) return;
    var tx = ITL.stock.history(id).length;
    var doDelete = function () {
      S.delete(K.store, id);
      ITL.activity.log('Store', 'Deleted', id, 'Store item deleted — ' + r.itemName);
      ITL.toast.success('Item deleted', r.itemName + ' removed from the store');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };
    if (ITL.settings.get().confirmDeletes === false) { doDelete(); return; }
    ITL.modal.confirm({
      heading: 'Delete store item',
      title: 'Delete ' + r.itemName + '?',
      messageHtml: 'This permanently removes the item from the store inventory.' +
        (tx ? '<br><br><b>' + tx + ' stock transaction' + (tx > 1 ? 's' : '') + '</b> will be kept for history but will no longer link to an item record.' : '') +
        (U.int(r.quantity, 0) > 0 ? '<br><br>Current stock: <b>' + U.int(r.quantity) + ' ' + U.esc(r.unit || 'Piece') + '</b>.' : ''),
      tone: 'danger', confirmLabel: 'Delete item'
    }).then(function (ok) { if (ok) doDelete(); });
  };

  /* =============================================================== EXCEL */
  store.exportExcel = function () {
    var rows = filtered(), all = ITL.data.store(), v = view();
    ITL.exporter.chooseScope({ filteredCount: rows.length, totalCount: all.length, noun: 'items' })
      .then(function (scope) {
        if (!scope) return;
        var data = (scope === 'all' ? all : rows).map(function (r) {
          return Object.assign({}, r, { status: ITL.data.itemStatus(r) });
        });
        if (!data.length) { ITL.toast.warn('Nothing to export', 'No store items to include.'); return; }
        var ft = [];
        if (scope !== 'all') {
          Object.keys(v.filters).forEach(function (k) { if (v.filters[k]) ft.push(U.titleCase(k) + ' = ' + v.filters[k]); });
          if (v.search) ft.push('Search: "' + v.search + '"');
        }
        ITL.modal.withBusy('Generating Excel…', 'Building the store inventory report', function () {
          var name = ITL.excel.exportCollection({
            schemaId: 'store', rows: data,
            scope: scope === 'all' ? 'All records' : 'Filtered records',
            filters: ft.join(', ') || 'None',
            filenameBase: 'IT_Lab_Store_Inventory',
            totals: ['quantity']
          });
          ITL.activity.log('Store', 'Exported', '', 'Downloaded ' + name + ' (' + data.length + ' items)');
          ITL.toast.success('Excel downloaded', name);
        });
      });
  };

  store.exportTransactions = function () {
    var rows = view().tab === 'tx' ? filteredTx() : ITL.data.stockTx();
    if (!rows.length) { ITL.toast.warn('Nothing to export', 'There are no stock transactions yet.'); return; }
    ITL.modal.withBusy('Generating Excel…', 'Building the stock transaction report', function () {
      var name = ITL.excel.exportCollection({
        schemaId: 'stockTx',
        rows: U.sortBy(rows, 'date', 'desc'),
        scope: view().tab === 'tx' ? 'Filtered records' : 'All records',
        filenameBase: 'IT_Lab_Stock_Transactions',
        totals: ['quantity']
      });
      ITL.activity.log('Store', 'Exported', '', 'Downloaded ' + name + ' (' + rows.length + ' transactions)');
      ITL.toast.success('Excel downloaded', name);
    });
  };

  store.importExcel = function () {
    ITL.importer.open({
      schemaId: 'store',
      dupCheck: function (data) {
        if (data.id) { var byId = ITL.data.item(data.id); if (byId) return byId; }
        var res = ITL.validation.checkStoreDuplicate(data, null);
        return res.duplicate ? res.record : null;
      },
      buildRecord: function (data) {
        var rec = ITL.factory.storeItem(data);
        rec.category = normalizeCategory(rec.category);
        return rec;
      },
      applyUpdate: function (existing, data) {
        var patch = {};
        Object.keys(data).forEach(function (k) {
          if (k === 'id' || k === 'createdAt' || k === 'quantity') return; // quantity only via transactions
          if (data[k] !== '' && data[k] !== null && data[k] !== undefined) patch[k] = data[k];
        });
        if (patch.category) patch.category = normalizeCategory(patch.category);
        var merged = Object.assign({}, existing, patch, { updatedAt: U.nowISO() });
        // if the sheet supplies a quantity, reconcile it as an adjustment
        var newQty = U.int(data.quantity, null);
        if (data.quantity !== '' && data.quantity !== null && data.quantity !== undefined && isFinite(newQty) && newQty !== U.int(existing.quantity, 0)) {
          S.replace(K.store, existing.id, merged);
          ITL.stock.apply({
            itemId: existing.id, type: 'Adjustment', targetQty: newQty,
            reason: 'Quantity reconciled from Excel import', silent: true
          });
          return S.find(K.store, existing.id) || merged;
        }
        return merged;
      },
      onDone: function () { ITL.router.reload(); }
    });
  };

  function normalizeCategory(v) {
    var n = U.normKey(v);
    if (!n) return 'Other';
    for (var i = 0; i < C.STORE_CATEGORIES.length; i++) {
      if (U.normKey(C.STORE_CATEGORIES[i]) === n) return C.STORE_CATEGORIES[i];
    }
    if (/lcd|monitor|screen|display/.test(n)) return 'LCD';
    if (/keyboard|kb/.test(n)) return 'Keyboard';
    if (/mouse|mice/.test(n)) return 'Mouse';
    if (/rj45|connector/.test(n)) return 'Ethernet Connector';
    if (/lan|ethernetcable|networkcable|cat6|cat5/.test(n)) return 'Ethernet Cable';
    if (/powercable|powercord/.test(n)) return 'Power Cable';
    if (/vga/.test(n)) return 'VGA Cable';
    if (/ram|memory/.test(n)) return 'RAM';
    if (/ssd/.test(n)) return 'SSD';
    if (/hdd|harddisk|harddrive/.test(n)) return 'HDD';
    if (/motherboard|mainboard/.test(n)) return 'Motherboard';
    if (/psu|powersupply|smps/.test(n)) return 'Power Supply';
    if (/desktop|pc|cpu|system/.test(n)) return 'Desktop';
    return 'Other';
  }

})(window);
