/* ==========================================================================
   purchases.js — Purchases page with optional Store Inventory integration
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
  var pur = ITL.purchases = {};

  var VIEW = 'purchases';

  /** Accessory fields that can be pushed into the store as their own items. */
  var ACCESSORIES = [
    { key: 'keyboard', name: 'Keyboard', category: 'Keyboard' },
    { key: 'mouse', name: 'Mouse', category: 'Mouse' },
    { key: 'lcd', name: 'LCD Monitor', category: 'LCD' },
    { key: 'ethernetConnector', name: 'Ethernet Connector', category: 'Ethernet Connector' },
    { key: 'powerCable', name: 'Power Cable', category: 'Power Cable' },
    { key: 'vgaCable', name: 'VGA Cable', category: 'VGA Cable' }
  ];
  pur.ACCESSORIES = ACCESSORIES;

  function view() {
    return ITL.state.view(VIEW, {
      search: '', page: 1, sortKey: 'purchaseDate', sortDir: 'desc',
      filters: { supplier: '', status: '', from: '', to: '' }
    });
  }

  function filtered() {
    var v = view(), f = v.filters;
    return ITL.data.purchases().filter(function (r) {
      if (f.supplier && r.supplier !== f.supplier) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.from) { var d1 = U.parseDate(r.purchaseDate); if (!d1 || d1 < U.parseDate(f.from)) return false; }
      if (f.to) { var d2 = U.parseDate(r.purchaseDate); if (!d2 || d2 > U.parseDate(f.to)) return false; }
      if (v.search && !U.matches(r, v.search,
        ['id', 'supplier', 'item', 'processor', 'ram', 'storage', 'status', 'remarks'])) return false;
      return true;
    });
  }

  /* ================================================================ PAGE */
  pages.purchases = {
    title: 'Purchases',

    render: function (root, params) {
      var v = view();
      var all = ITL.data.purchases();
      var st = ITL.data.stats().purchases;
      var linked = all.filter(function (p) { return p.addedToStore; }).length;

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Purchases</div>' +
        '<div class="page-sub">Procurement records, devices received and their link to the store</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="import">' + ITL.icon('upload') + 'Import Excel</button>' +
        '<button class="btn btn-excel" data-action="export">' + ITL.icon('excel') + 'Download Excel</button>' +
        '<button class="btn btn-primary" data-action="add">' + ITL.icon('plus') + 'Record Purchase</button>' +
        '</div></div>' +

        '<div class="stat-grid mb-4">' +
        ui.statCard({ label: 'Total purchases', value: st.total, icon: 'cart', color: '#3b66f6', bg: 'var(--info-bg)' }) +
        ui.statCard({ label: 'This month', value: st.thisMonth, icon: 'calendar', color: '#8b5cf6', bg: 'var(--purple-bg)' }) +
        ui.statCard({ label: 'Units purchased', value: st.units, icon: 'package', color: '#10b981', bg: 'var(--success-bg)' }) +
        ui.statCard({ label: 'Added to store', value: linked, icon: 'link', color: '#06b6d4', bg: 'var(--info-bg)', meta: (st.total - linked) + ' not linked' }) +
        '</div>' +

        '<div class="card">' +
        '<div class="toolbar">' +
        ui.searchInput(v.search, 'Search supplier, item, specification…') +
        ui.selectFilter('supplier', 'Supplier', U.uniqueValues(all, 'supplier'), v.filters.supplier) +
        ui.selectFilter('status', 'Status', C.PURCHASE_STATUS, v.filters.status) +
        '<div class="toolbar-group">' +
        '<span class="muted" style="font-size:12px">From</span>' +
        '<input type="date" class="sm" data-filter="from" value="' + U.escAttr(v.filters.from) + '" style="width:140px" aria-label="From date">' +
        '<span class="muted" style="font-size:12px">To</span>' +
        '<input type="date" class="sm" data-filter="to" value="' + U.escAttr(v.filters.to) + '" style="width:140px" aria-label="To date">' +
        '</div>' +
        '<div class="toolbar-spacer"></div>' +
        '<button class="btn btn-secondary btn-sm" data-action="clear-filters">' + ITL.icon('x') + 'Clear</button>' +
        '</div>' +
        '<div id="prFilterChips"></div>' +
        '<div id="prTable"></div>' +
        '</div>';

      renderTable(root);
      bind(root);
      if (params && params.focus) ui.highlightRow(params.focus);
      if (params && params.open) { var rec = ITL.data.purchase(params.open); if (rec) pur.openDetail(rec.id); }
    }
  };

  function renderTable(root) {
    var v = view();
    var rows = filtered();
    var chips = root.querySelector('#prFilterChips');
    if (chips) chips.innerHTML = ui.filterChips(v.filters, { supplier: 'Supplier', status: 'Status', from: 'From', to: 'To' });

    ui.renderTable({
      mount: root.querySelector('#prTable'),
      view: v,
      noun: 'purchase',
      totalUnfiltered: ITL.data.purchases().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      columns: [
        { key: 'id', label: 'Purchase ID', sortable: true, cls: 'cell-id', width: '110px' },
        { key: 'purchaseDate', label: 'Date', sortable: true, cls: 'cell-date', width: '108px', render: function (r) { return U.esc(U.fmtDate(r.purchaseDate)); } },
        {
          key: 'item', label: 'Item / Device', sortable: true, render: function (r) {
            var spec = [r.processor, r.ram, r.storage].filter(Boolean).join(' · ');
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.item) || '—') + '</span>' +
              (spec ? '<span class="cs-sub">' + U.esc(spec) + '</span>' : '') + '</div>';
          }
        },
        { key: 'supplier', label: 'Supplier', sortable: true },
        { key: 'quantity', label: 'Qty', sortable: true, align: 'right', cls: 'cell-num', width: '72px' },
        {
          key: 'accessories', label: 'Accessories', render: function (r) {
            var parts = ACCESSORIES.filter(function (a) { return U.int(r[a.key], 0) > 0; })
              .map(function (a) { return '<span class="chip">' + U.esc(a.name) + ' ×' + U.int(r[a.key]) + '</span>'; });
            return parts.length ? '<div class="row-2" style="gap:4px">' + parts.join('') + '</div>' : '';
          }
        },
        { key: 'status', label: 'Status', sortable: true, width: '140px', render: function (r) { return ui.purchaseStatusBadge(r.status); } },
        {
          key: 'addedToStore', label: 'Store', sortable: true, width: '104px', render: function (r) {
            return r.addedToStore ? ui.badge('Linked', 'success') : '<span class="muted">Not added</span>';
          }
        }
      ],
      actions: function (r) {
        var acts = [{ action: 'view', id: r.id, icon: 'eye', label: 'View details' }];
        if (!r.addedToStore) acts.push({ action: 'to-store', id: r.id, icon: 'package', label: 'Add to store inventory' });
        acts.push({ action: 'edit', id: r.id, icon: 'edit', label: 'Edit purchase' });
        acts.push({ action: 'delete', id: r.id, icon: 'trash', label: 'Delete purchase', danger: true });
        return ui.rowActions(acts);
      },
      onRowClick: function (r) { pur.openDetail(r.id); },
      empty: {
        icon: 'cart',
        title: 'No purchases recorded',
        desc: 'Record what you buy so you can track suppliers, devices and stock received.',
        actions: [
          { label: 'Record Purchase', icon: 'plus', cls: 'btn-primary', action: 'add' },
          { label: 'Import Excel', icon: 'upload', cls: 'btn-secondary', action: 'import' }
        ]
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
      switch (a) {
        case 'add': pur.openForm(); break;
        case 'view': pur.openDetail(id); break;
        case 'edit': pur.openForm(id); break;
        case 'delete': pur.remove(id); break;
        case 'to-store': pur.addToStore(id); break;
        case 'import': pur.importExcel(); break;
        case 'export': pur.exportExcel(); break;
        case 'clear-filters':
          v.search = ''; v.page = 1;
          Object.keys(v.filters).forEach(function (k) { v.filters[k] = ''; });
          ITL.router.reload();
          break;
      }
    });
  }

  /* ============================================================ ADD/EDIT */
  pur.openForm = function (id) {
    var editing = !!id;
    var rec = editing ? ITL.data.purchase(id) : null;
    if (editing && !rec) { ITL.toast.error('Purchase not found'); return; }
    var d = rec || ITL.factory.purchase({});
    var all = ITL.data.purchases();

    var body =
      '<form id="prForm" novalidate autocomplete="off">' +
      '<div data-error-summary style="display:none;margin-bottom:16px"></div>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('clipboard') + 'Purchase details</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="prDate">Purchase Date <span class="req">*</span></label>' +
      '<input type="date" id="prDate" name="purchaseDate" value="' + U.escAttr(d.purchaseDate || U.today()) + '" data-autofocus></div>' +

      '<div class="field"><label for="prSupplier">Supplier</label>' +
      '<input type="text" id="prSupplier" name="supplier" value="' + U.escAttr(d.supplier) + '" list="dlSupplier" placeholder="e.g. City Computers">' +
      ui.datalist('dlSupplier', U.uniqueValues(all, 'supplier')) + '</div>' +

      '<div class="field"><label for="prItem">Item / Device <span class="req">*</span></label>' +
      '<input type="text" id="prItem" name="item" value="' + U.escAttr(d.item) + '" list="dlPrItem" placeholder="e.g. Dell OptiPlex 3080">' +
      ui.datalist('dlPrItem', U.uniqueValues(all, 'item').concat(U.uniqueValues(ITL.data.store(), 'itemName'))) + '</div>' +

      '<div class="field"><label for="prQty">Quantity <span class="req">*</span></label>' +
      '<input type="number" id="prQty" name="quantity" min="0" step="1" value="' + U.int(d.quantity, 1) + '"></div>' +

      '<div class="field"><label for="prPrice">Unit price</label>' +
      '<input type="number" id="prPrice" name="unitPrice" min="0" step="0.01" value="' + (d.unitPrice || '') + '" placeholder="Optional"></div>' +

      '<div class="field"><label for="prStatus">Status <span class="req">*</span></label>' +
      '<select id="prStatus" name="status">' + ui.options(C.PURCHASE_STATUS, d.status) + '</select></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('cpu') + 'Device specification (if applicable)</legend>' +
      '<div class="form-grid cols-3">' +
      '<div class="field"><label for="prProc">Processor</label>' +
      '<input type="text" id="prProc" name="processor" value="' + U.escAttr(d.processor) + '" list="dlProcP">' +
      ui.datalist('dlProcP', C.PROCESSOR_OPTIONS) + '</div>' +
      '<div class="field"><label for="prRam">RAM</label>' +
      '<input type="text" id="prRam" name="ram" value="' + U.escAttr(d.ram) + '" list="dlRamP">' +
      ui.datalist('dlRamP', C.RAM_OPTIONS) + '</div>' +
      '<div class="field"><label for="prStorage">Storage</label>' +
      '<input type="text" id="prStorage" name="storage" value="' + U.escAttr(d.storage) + '" list="dlStorP">' +
      ui.datalist('dlStorP', C.STORAGE_OPTIONS) + '</div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('keyboard') + 'Accessories received</legend>' +
      '<div class="form-grid cols-3">' +
      ACCESSORIES.map(function (a) {
        return '<div class="field"><label for="pr_' + a.key + '">' + U.esc(a.name) + '</label>' +
          '<input type="number" id="pr_' + a.key + '" name="' + a.key + '" min="0" step="1" value="' + U.int(d[a.key], 0) + '"></div>';
      }).join('') +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('package') + 'Store inventory</legend>' +
      (d.addedToStore
        ? '<div class="alert alert-success">' + ITL.icon('checkCircle') +
        '<div class="alert-body"><div class="alert-title">Already added to the store</div>' +
        'This purchase has already increased store stock (' + (d.stockTxIds || []).length + ' transaction' + ((d.stockTxIds || []).length === 1 ? '' : 's') + '). ' +
        'Editing this record will <b>not</b> add the quantity again.</div></div>'
        : '<label class="check-card" id="prStoreCard">' +
        '<input type="checkbox" name="addToStore" id="prAddStore">' +
        '<span><div class="cc-title">Add this purchase to Store Inventory</div>' +
        '<div class="cc-desc">Creates or increases the matching store items and records a <b>Stock In</b> transaction for the main item and every accessory. ' +
        'A purchase can only be added once, so stock can never be double counted.</div></span></label>') +

      '<div class="field mt-4"><label for="prRemarks">Remarks</label>' +
      '<textarea id="prRemarks" name="remarks" rows="2">' + U.esc(d.remarks) + '</textarea></div>' +
      '</fieldset></form>';

    ITL.modal.open({
      title: editing ? 'Edit purchase' : 'Record a purchase',
      subtitle: editing ? d.id : 'Log a procurement record',
      icon: 'cart',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="prSave">' + ITL.icon('check') + (editing ? 'Save changes' : 'Save purchase') + '</button>',
      onMount: function (el, api) {
        var card = el.querySelector('#prStoreCard');
        if (card) {
          var cb = el.querySelector('#prAddStore');
          card.addEventListener('click', function (e) {
            if (e.target !== cb) { cb.checked = !cb.checked; }
            card.classList.toggle('selected', cb.checked);
          });
        }
        el.querySelector('#prSave').addEventListener('click', function () { save(el, api); });
      }
    });

    function save(el, api) {
      var form = el.querySelector('#prForm');
      var data = ITL.validation.readForm(form);
      var res = ITL.validation.check(data, {
        purchaseDate: { label: 'Purchase Date', required: true, date: true },
        item: { label: 'Item / Device', required: true, maxLength: 100 },
        quantity: { label: 'Quantity', required: true, integer: true, min: 0 },
        unitPrice: { label: 'Unit price', number: true, min: 0 },
        status: { label: 'Status', required: true, oneOf: C.PURCHASE_STATUS },
        keyboard: { label: 'Keyboard', integer: true, min: 0 },
        mouse: { label: 'Mouse', integer: true, min: 0 },
        lcd: { label: 'LCD', integer: true, min: 0 },
        ethernetConnector: { label: 'Ethernet Connector', integer: true, min: 0 },
        powerCable: { label: 'Power Cable', integer: true, min: 0 },
        vgaCable: { label: 'VGA Cable', integer: true, min: 0 },
        remarks: { label: 'Remarks', maxLength: 500 }
      });
      if (!ITL.validation.apply(form, res)) return;

      var wantsStore = !!data.addToStore && !d.addedToStore;

      api.setBusy(true, 'Saving…');
      setTimeout(function () {
        try {
          var record;
          if (editing) {
            record = Object.assign({}, rec, data, { updatedAt: U.nowISO() });
            delete record.addToStore;
            S.replace(K.purchases, id, record);
            ITL.activity.log('Purchases', 'Updated', id, 'Purchase updated — ' + record.item + ' (' + record.quantity + ')');
          } else {
            record = ITL.factory.purchase(data);
            S.insert(K.purchases, record);
            ITL.activity.log('Purchases', 'Created', record.id,
              'Purchase recorded — ' + record.item + ' ×' + record.quantity + (record.supplier ? ' from ' + record.supplier : ''));
          }
          api.setBusy(false);
          api.close();
          ITL.toast.success(editing ? 'Purchase saved' : 'Purchase recorded', record.item + ' ×' + record.quantity);

          if (wantsStore) pur.addToStore(record.id, true);
          else { ITL.router.reload(); ITL.app.refreshChrome(); }
        } catch (err) {
          api.setBusy(false);
          console.error(err);
          ITL.toast.error('Unable to save record', err.message);
        }
      }, 40);
    }
  };

  /* ==================================================== STORE INTEGRATION */
  /**
   * Push a purchase into store inventory. Guarded so the same purchase
   * can never add its quantity twice.
   */
  pur.addToStore = function (id, skipPrompt) {
    var p = ITL.data.purchase(id);
    if (!p) { ITL.toast.error('Purchase not found'); return; }
    if (p.addedToStore) {
      ITL.toast.warn('Already added', 'This purchase has already been added to the store inventory.');
      return;
    }

    // Build the list of things to push
    var lines = [];
    if (U.int(p.quantity, 0) > 0 && U.str(p.item)) {
      lines.push({ name: p.item, qty: U.int(p.quantity, 0), category: guessCategory(p.item), main: true });
    }
    ACCESSORIES.forEach(function (a) {
      var q = U.int(p[a.key], 0);
      if (q > 0) lines.push({ name: a.name, qty: q, category: a.category, main: false });
    });

    if (!lines.length) {
      ITL.toast.warn('Nothing to add', 'This purchase has no quantities to move into the store.');
      return;
    }

    var run = function () {
      var created = 0, increased = 0, txIds = [];
      lines.forEach(function (ln) {
        var item = ITL.data.itemByName(ln.name);
        if (!item) {
          item = ITL.factory.storeItem({
            itemName: ln.name,
            category: ln.category,
            quantity: 0,
            unit: 'Piece',
            condition: 'New',
            purchaseDate: p.purchaseDate,
            remarks: 'Created from purchase ' + p.id
          });
          S.insert(K.store, item);
          created++;
        } else {
          increased++;
        }
        var out = ITL.stock.apply({
          itemId: item.id,
          type: 'Stock In',
          quantity: ln.qty,
          reason: 'Purchase received' + (p.supplier ? ' from ' + p.supplier : ''),
          purchaseId: p.id,
          date: p.purchaseDate,
          silent: true
        });
        if (out.ok) txIds.push(out.tx.id);
      });

      S.patch(K.purchases, p.id, {
        addedToStore: true,
        stockTxIds: txIds,
        storeItemId: '',
        updatedAt: U.nowISO()
      });

      ITL.activity.log('Purchases', 'Stock In', p.id,
        'Purchase ' + p.id + ' added to store — ' + lines.length + ' item line(s), ' +
        lines.reduce(function (a, l) { return a + l.qty; }, 0) + ' units (' + created + ' new item(s))');

      ITL.toast.success('Added to store inventory',
        lines.length + ' item line(s) · ' + created + ' new · ' + increased + ' increased');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };

    if (skipPrompt) { run(); return; }

    ITL.modal.confirm({
      heading: 'Add purchase to Store Inventory',
      title: 'Add this purchase to the store?',
      messageHtml: 'The following will be added as <b>Stock In</b> transactions:' +
        '<ul style="margin:8px 0 0;padding-left:18px;list-style:disc">' +
        lines.map(function (l) {
          var existing = ITL.data.itemByName(l.name);
          return '<li><b>' + U.esc(l.name) + '</b> ×' + l.qty +
            (existing ? ' <span class="muted">(existing item, ' + U.int(existing.quantity) + ' → ' + (U.int(existing.quantity) + l.qty) + ')</span>'
              : ' <span class="muted">(new store item)</span>') + '</li>';
        }).join('') + '</ul>' +
        '<br>A purchase can only be added once, so stock cannot be double counted.',
      tone: 'info',
      confirmLabel: 'Add to store'
    }).then(function (ok) { if (ok) run(); });
  };

  function guessCategory(name) {
    var n = U.normKey(name);
    if (/lcd|monitor|screen|display/.test(n)) return 'LCD';
    if (/keyboard/.test(n)) return 'Keyboard';
    if (/mouse/.test(n)) return 'Mouse';
    if (/rj45|connector/.test(n)) return 'Ethernet Connector';
    if (/lancable|ethernet|cat6|cat5|networkcable/.test(n)) return 'Ethernet Cable';
    if (/powercable|powercord/.test(n)) return 'Power Cable';
    if (/vga/.test(n)) return 'VGA Cable';
    if (/ram|memory|ddr/.test(n)) return 'RAM';
    if (/ssd|nvme/.test(n)) return 'SSD';
    if (/hdd|harddisk|harddrive/.test(n)) return 'HDD';
    if (/motherboard|mainboard/.test(n)) return 'Motherboard';
    if (/psu|powersupply|smps/.test(n)) return 'Power Supply';
    if (/desktop|optiplex|thinkcentre|pc|workstation|computer|system/.test(n)) return 'Desktop';
    return 'Other';
  }

  /* ============================================================== DETAIL */
  pur.openDetail = function (id) {
    var r = ITL.data.purchase(id);
    if (!r) { ITL.toast.error('Purchase not found'); return; }
    var txs = (r.stockTxIds || []).map(function (t) { return S.find(K.stockTx, t); }).filter(Boolean);
    var accessories = ACCESSORIES.filter(function (a) { return U.int(r[a.key], 0) > 0; });

    ITL.modal.open({
      title: r.item || r.id,
      subtitle: r.id + ' · ' + U.fmtDate(r.purchaseDate) + (r.supplier ? ' · ' + r.supplier : ''),
      icon: 'cart',
      size: 'lg',
      panel: true,
      body:
        '<div class="detail-section">' + ui.sectionTitle('Purchase information', 'clipboard') +
        '<div class="detail-grid">' +
        ui.field('Purchase ID', r.id, { mono: true }) +
        ui.field('Purchase Date', U.fmtDate(r.purchaseDate)) +
        ui.field('Supplier', r.supplier) +
        ui.field('Item / Device', r.item) +
        ui.field('Quantity', String(U.int(r.quantity, 0))) +
        ui.field('Unit price', r.unitPrice ? U.fmtNum(r.unitPrice) : '') +
        ui.field('Status', ui.purchaseStatusBadge(r.status), { html: true }) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Specification', 'cpu') +
        '<div class="detail-grid">' +
        ui.field('Processor', r.processor) + ui.field('RAM', r.ram) + ui.field('Storage', r.storage) +
        '</div></div>' +

        '<div class="detail-section">' + ui.sectionTitle('Accessories', 'keyboard') +
        (accessories.length
          ? '<div class="mini-stats">' + accessories.map(function (a) {
            return '<div class="mini-stat"><div class="ms-label">' + U.esc(a.name) + '</div>' +
              '<div class="ms-value">' + U.int(r[a.key]) + '</div></div>';
          }).join('') + '</div>'
          : '<div class="muted" style="font-size:12.5px">No accessories recorded for this purchase.</div>') +
        '</div>' +

        '<div class="detail-section">' + ui.sectionTitle('Store inventory link', 'package') +
        (r.addedToStore
          ? '<div class="alert alert-success">' + ITL.icon('checkCircle') +
          '<div class="alert-body"><div class="alert-title">Added to store inventory</div>' +
          txs.length + ' stock transaction' + (txs.length === 1 ? '' : 's') + ' created from this purchase.</div></div>' +
          (txs.length
            ? '<div class="preview-scroll mt-4" style="max-height:200px"><table class="data-table compact-table"><thead><tr>' +
            '<th>Transaction</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">After</th></tr></thead><tbody>' +
            txs.map(function (t) {
              return '<tr class="clickable" data-open-item="' + U.escAttr(t.itemId) + '">' +
                '<td class="mono" style="font-size:11.5px">' + U.esc(t.id) + '</td>' +
                '<td class="cell-primary">' + U.esc(t.itemName) + '</td>' +
                '<td class="cell-num">' + U.int(t.quantity) + '</td>' +
                '<td class="cell-num">' + U.int(t.newQty) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
            : '')
          : '<div class="alert alert-info">' + ITL.icon('info') +
          '<div class="alert-body"><div class="alert-title">Not added to the store</div>' +
          'This purchase has not increased store stock. Use the button below if these items should be tracked in the store.' +
          '<div style="margin-top:10px"><button type="button" class="btn btn-primary btn-sm" data-pu="tostore">' +
          ITL.icon('package') + 'Add to store inventory</button></div></div></div>') +
        '</div>' +

        '<div class="detail-section">' + ui.sectionTitle('Remarks & audit', 'info') +
        '<div class="detail-grid">' +
        ui.field('Remarks', r.remarks, { full: true }) +
        ui.field('Created', U.fmtDateTime(r.createdAt)) +
        ui.field('Last updated', U.fmtDateTime(r.updatedAt)) +
        '</div></div>',
      footer:
        '<button type="button" class="btn btn-danger-soft" data-pu="delete">' + ITL.icon('trash') + 'Delete</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary data-pu="edit">' + ITL.icon('edit') + 'Edit</button>',
      onMount: function (el, api) {
        U.on(el, 'click', '[data-pu]', function (e, b) {
          var act = b.getAttribute('data-pu');
          api.close();
          if (act === 'edit') pur.openForm(r.id);
          else if (act === 'delete') pur.remove(r.id);
          else if (act === 'tostore') pur.addToStore(r.id);
        });
        U.on(el, 'click', '[data-open-item]', function (e, tr) {
          api.close();
          ITL.router.go('store', { open: tr.getAttribute('data-open-item') });
        });
      }
    });
  };

  /* ============================================================== DELETE */
  pur.remove = function (id) {
    var r = ITL.data.purchase(id);
    if (!r) return;
    var txs = (r.stockTxIds || []).filter(function (t) { return !!S.find(K.stockTx, t); });

    var doDelete = function (reverseStock) {
      if (reverseStock) {
        txs.forEach(function (t) {
          ITL.stock.reverse(t, 'Purchase ' + r.id + ' deleted');
          S.delete(K.stockTx, t);
        });
      }
      S.delete(K.purchases, id);
      ITL.activity.log('Purchases', 'Deleted', id, 'Purchase deleted — ' + (r.item || id) +
        (reverseStock && txs.length ? ' (stock reversed)' : ''));
      ITL.toast.success('Purchase deleted', (r.item || id) + ' removed');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };

    if (!txs.length) {
      if (ITL.settings.get().confirmDeletes === false) { doDelete(false); return; }
      ITL.modal.confirm({
        heading: 'Delete purchase',
        title: 'Delete ' + (r.item || r.id) + '?',
        message: 'This permanently removes the purchase record from local storage.',
        tone: 'danger', confirmLabel: 'Delete purchase'
      }).then(function (ok) { if (ok) doDelete(false); });
      return;
    }

    ITL.modal.open({
      title: 'Delete purchase',
      subtitle: r.id,
      icon: 'trash',
      iconTone: 'danger',
      size: 'sm',
      body:
        '<div class="alert alert-warn">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">This purchase added stock to the store</div>' +
        txs.length + ' stock transaction' + (txs.length === 1 ? '' : 's') + ' came from this purchase. ' +
        'Choose what should happen to that stock.</div></div>' +
        '<div class="stack-2 mt-4">' +
        '<label class="check-card selected" data-del="reverse"><input type="radio" name="delMode" value="reverse" checked>' +
        '<span><div class="cc-title">Remove the stock as well</div>' +
        '<div class="cc-desc">Reverses the Stock In transactions so store quantities go back to what they were.</div></span></label>' +
        '<label class="check-card" data-del="keep"><input type="radio" name="delMode" value="keep">' +
        '<span><div class="cc-title">Keep the stock</div>' +
        '<div class="cc-desc">Store quantities stay as they are. Only the purchase record is deleted.</div></span></label>' +
        '</div>',
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-danger" data-primary id="delGo">' + ITL.icon('trash') + 'Delete purchase</button>',
      onMount: function (el, api) {
        U.qsa('[data-del]', el).forEach(function (c) {
          c.addEventListener('click', function () {
            U.qsa('[data-del]', el).forEach(function (x) { x.classList.remove('selected'); });
            c.classList.add('selected');
            c.querySelector('input').checked = true;
          });
        });
        el.querySelector('#delGo').addEventListener('click', function () {
          var mode = (el.querySelector('input[name="delMode"]:checked') || {}).value || 'reverse';
          api.close();
          doDelete(mode === 'reverse');
        });
      }
    });
  };

  /* =============================================================== EXCEL */
  pur.exportExcel = function () {
    var rows = filtered(), all = ITL.data.purchases(), v = view();
    ITL.exporter.chooseScope({ filteredCount: rows.length, totalCount: all.length, noun: 'purchases' })
      .then(function (scope) {
        if (!scope) return;
        var data = scope === 'all' ? all : rows;
        if (!data.length) { ITL.toast.warn('Nothing to export', 'No purchase records to include.'); return; }
        var ft = [];
        if (scope !== 'all') {
          Object.keys(v.filters).forEach(function (k) { if (v.filters[k]) ft.push(U.titleCase(k) + ' = ' + v.filters[k]); });
          if (v.search) ft.push('Search: "' + v.search + '"');
        }
        ITL.modal.withBusy('Generating Excel…', 'Building the purchase report', function () {
          var name = ITL.excel.exportCollection({
            schemaId: 'purchases',
            rows: U.sortBy(data, 'purchaseDate', 'desc'),
            scope: scope === 'all' ? 'All records' : 'Filtered records',
            filters: ft.join(', ') || 'None',
            filenameBase: 'IT_Lab_Purchases',
            totals: ['quantity', 'keyboard', 'mouse', 'lcd', 'ethernetConnector', 'powerCable', 'vgaCable']
          });
          ITL.activity.log('Purchases', 'Exported', '', 'Downloaded ' + name + ' (' + data.length + ' records)');
          ITL.toast.success('Excel downloaded', name);
        });
      });
  };

  pur.importExcel = function () {
    ITL.importer.open({
      schemaId: 'purchases',
      dupCheck: function (data) {
        if (data.id) { var byId = ITL.data.purchase(data.id); if (byId) return byId; }
        return null;
      },
      buildRecord: function (data) {
        var rec = ITL.factory.purchase(data);
        rec.status = normalizePurchaseStatus(rec.status);
        rec.addedToStore = false;
        rec.stockTxIds = [];
        return rec;
      },
      applyUpdate: function (existing, data) {
        var patch = {};
        Object.keys(data).forEach(function (k) {
          if (k === 'id' || k === 'createdAt') return;
          if (data[k] !== '' && data[k] !== null && data[k] !== undefined) patch[k] = data[k];
        });
        if (patch.status) patch.status = normalizePurchaseStatus(patch.status);
        // never re-trigger store integration through an import
        delete patch.addedToStore;
        delete patch.stockTxIds;
        return Object.assign({}, existing, patch, { updatedAt: U.nowISO() });
      },
      onDone: function () { ITL.router.reload(); }
    });
  };

  function normalizePurchaseStatus(v) {
    var n = U.normKey(v);
    if (!n) return 'Received';
    for (var i = 0; i < C.PURCHASE_STATUS.length; i++) {
      if (U.normKey(C.PURCHASE_STATUS[i]) === n) return C.PURCHASE_STATUS[i];
    }
    if (/receiv|deliver|complete|done|in/.test(n)) return 'Received';
    if (/order|placed/.test(n)) return 'Ordered';
    if (/partial/.test(n)) return 'Partially Received';
    if (/cancel/.test(n)) return 'Cancelled';
    if (/pending|await/.test(n)) return 'Pending';
    return 'Received';
  }

})(window);
