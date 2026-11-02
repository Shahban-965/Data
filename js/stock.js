/* ==========================================================================
   stock.js — stock movement engine + stock operation modals
   Every quantity change goes through ITL.stock.apply() so that a transaction
   is always recorded and negative stock is impossible.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  var stock = ITL.stock = {};

  /**
   * Apply a stock movement.
   * opts = { itemId, type:'Stock In'|'Stock Out'|'Adjustment'|'Return',
   *          quantity (for In/Out/Return), targetQty (for Adjustment),
   *          reason, maintenanceId, purchaseId, date, remarks, silent }
   * Returns { ok:boolean, tx, item, error, available, requested }
   */
  stock.apply = function (opts) {
    opts = opts || {};
    var item = S.find(K.store, opts.itemId);
    if (!item) return { ok: false, error: 'Store item not found.' };

    var prev = U.int(item.quantity, 0);
    var type = opts.type || 'Adjustment';
    var qty, next;

    if (type === 'Adjustment') {
      var target = U.int(opts.targetQty, prev);
      if (target < 0) return { ok: false, error: 'Quantity cannot be negative.' };
      next = target;
      qty = next - prev;             // signed delta
    } else {
      qty = U.int(opts.quantity, 0);
      if (qty <= 0) return { ok: false, error: 'Quantity must be at least 1.' };
      if (type === 'Stock Out') {
        if (qty > prev) {
          return {
            ok: false, error: 'INSUFFICIENT STOCK', insufficient: true,
            available: prev, requested: qty, item: item
          };
        }
        next = prev - qty;
      } else {
        // Stock In / Return
        next = prev + qty;
      }
    }

    if (next < 0) return { ok: false, error: 'Operation would make stock negative.', insufficient: true, available: prev, requested: qty, item: item };

    // Persist item
    var updated = Object.assign({}, item, {
      quantity: next,
      updatedAt: U.nowISO()
    });
    // clear a manual Out of Stock/Available override so status stays derived
    if (updated.status === 'Available' || updated.status === 'Low Stock' || updated.status === 'Out of Stock') updated.status = '';
    S.replace(K.store, item.id, updated);

    // Record the transaction
    var tx = ITL.factory.stockTx({
      itemId: item.id,
      itemName: item.itemName,
      type: type,
      quantity: Math.abs(qty),
      prevQty: prev,
      newQty: next,
      reason: opts.reason || '',
      maintenanceId: opts.maintenanceId || '',
      purchaseId: opts.purchaseId || '',
      date: opts.date || U.today(),
      remarks: opts.remarks || ''
    });
    S.insert(K.stockTx, tx);

    if (!opts.silent) {
      ITL.activity.log('Store', type, item.id,
        type + ' — ' + item.itemName + ' · ' + Math.abs(qty) + ' ' + (item.unit || 'Piece') +
        ' (' + prev + ' → ' + next + ')' + (opts.reason ? ' · ' + opts.reason : ''));
    }

    return { ok: true, tx: tx, item: updated, prev: prev, next: next };
  };

  /** Reverse a previously applied transaction (used when editing/deleting). */
  stock.reverse = function (txId, reason) {
    var tx = S.find(K.stockTx, txId);
    if (!tx) return { ok: false, error: 'Transaction not found.' };
    var inverse = tx.type === 'Stock In' || tx.type === 'Return' ? 'Stock Out' : 'Stock In';
    var res = stock.apply({
      itemId: tx.itemId,
      type: inverse,
      quantity: tx.quantity,
      reason: reason || ('Reversal of ' + tx.id),
      maintenanceId: tx.maintenanceId,
      purchaseId: tx.purchaseId,
      silent: true
    });
    if (res.ok) {
      ITL.activity.log('Store', 'Adjusted', tx.itemId,
        'Reversed transaction ' + tx.id + ' (' + tx.type + ' ' + tx.quantity + ' ' + tx.itemName + ')');
    }
    return res;
  };

  stock.history = function (itemId) {
    return S.list(K.stockTx).filter(function (t) { return String(t.itemId) === String(itemId); });
  };

  /* ====================================================== STOCK OPERATION UI */

  var TYPE_META = {
    'Stock In': { icon: 'plusCircle', tone: 'success', verb: 'Add stock', help: 'Increase the quantity held in the store.' },
    'Stock Out': { icon: 'minusCircle', tone: 'danger', verb: 'Use stock', help: 'Issue items out of the store (repairs, replacements, hand-outs).' },
    'Adjustment': { icon: 'sliders', tone: 'warn', verb: 'Adjust stock', help: 'Correct the recorded quantity after a physical count.' },
    'Return': { icon: 'rotate', tone: 'purple', verb: 'Return stock', help: 'Items returned to the store from a lab or user.' }
  };

  /**
   * Open the stock operation modal.
   * type: one of TX types. itemId optional (a picker is shown when omitted).
   */
  stock.openModal = function (type, itemId, onDone) {
    type = type || 'Stock In';
    var meta = TYPE_META[type] || TYPE_META['Stock In'];
    var items = S.list(K.store);

    if (!items.length) {
      ITL.toast.warn('No store items', 'Add an item to the store inventory first.');
      return;
    }

    var current = itemId ? S.find(K.store, itemId) : null;

    var body =
      '<form id="stockForm" novalidate>' +
      '<div data-error-summary style="display:none;margin-bottom:14px"></div>' +
      '<div class="form-grid cols-1">' +

      '<div class="field"><label for="stItem">Store item <span class="req">*</span></label>' +
      '<select id="stItem" name="itemId" data-autofocus>' +
      '<option value="">Select an item…</option>' +
      items.map(function (it) {
        return '<option value="' + U.escAttr(it.id) + '"' + (current && current.id === it.id ? ' selected' : '') + '>' +
          U.esc(it.itemName) + ' — ' + U.esc(it.category) + ' (' + U.int(it.quantity) + ' ' + U.esc(it.unit || 'Piece') + ')' +
          '</option>';
      }).join('') +
      '</select></div>' +

      '<div id="stockInfo"></div>' +

      '<div class="form-grid">' +
      (type === 'Adjustment'
        ? '<div class="field"><label for="stQty">Corrected quantity <span class="req">*</span></label>' +
        '<input type="number" id="stQty" name="targetQty" min="0" step="1" value="' + (current ? U.int(current.quantity) : 0) + '">' +
        '<div class="help-text">Enter the actual counted quantity. The difference is recorded as an adjustment.</div></div>'
        : '<div class="field"><label for="stQty">Quantity <span class="req">*</span></label>' +
        '<input type="number" id="stQty" name="quantity" min="1" step="1" value="1">' +
        '<div class="help-text">' + U.esc(meta.help) + '</div></div>') +

      '<div class="field"><label for="stDate">Date</label>' +
      '<input type="date" id="stDate" name="date" value="' + U.today() + '"></div>' +
      '</div>' +

      '<div class="field"><label for="stReason">Reason</label>' +
      '<input type="text" id="stReason" name="reason" placeholder="' +
      (type === 'Stock In' ? 'e.g. New purchase received' :
        type === 'Stock Out' ? 'e.g. Replaced faulty part in Lab1-PC-05' :
          type === 'Return' ? 'e.g. Returned unused cable from Lab 2' : 'e.g. Physical stock count correction') +
      '"></div>' +

      '<div class="field"><label for="stRemarks">Remarks</label>' +
      '<textarea id="stRemarks" name="remarks" rows="2" placeholder="Optional notes"></textarea></div>' +

      '</div></form>';

    var m = ITL.modal.open({
      title: meta.verb,
      subtitle: type + ' transaction',
      icon: meta.icon,
      iconTone: meta.tone === 'danger' ? 'danger' : meta.tone === 'warn' ? 'warn' : 'success',
      size: 'md',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="stSave">' + ITL.icon('check') + meta.verb + '</button>',
      onMount: function (el, api) {
        var sel = el.querySelector('#stItem');
        var info = el.querySelector('#stockInfo');
        var qtyIn = el.querySelector('#stQty');

        function refresh() {
          var it = S.find(K.store, sel.value);
          if (!it) { info.innerHTML = ''; return; }
          var q = U.int(it.quantity, 0);
          var min = U.int(it.minStock, 5);
          var cls = q <= 0 ? 'bad' : q <= min ? 'low' : 'ok';
          info.innerHTML =
            '<div class="stock-strip ' + cls + '">' + ITL.icon(q <= 0 ? 'alert' : q <= min ? 'alert' : 'checkCircle') +
            '<span>Available now: <b>' + q + ' ' + U.esc(it.unit || 'Piece') + '</b>' +
            ' · Minimum level: <b>' + min + '</b>' +
            ' · Status: <b>' + U.esc(ITL.data.itemStatus(it)) + '</b></span></div>';
          if (type === 'Adjustment') qtyIn.value = q;
          if (type === 'Stock Out') qtyIn.max = q;
        }
        sel.addEventListener('change', refresh);
        refresh();

        el.querySelector('#stSave').addEventListener('click', function () {
          var form = el.querySelector('#stockForm');
          var d = ITL.validation.readForm(form);
          var rules = {
            itemId: { label: 'Store item', required: true }
          };
          if (type === 'Adjustment') rules.targetQty = { label: 'Corrected quantity', required: true, integer: true, min: 0 };
          else rules.quantity = { label: 'Quantity', required: true, integer: true, min: 1 };
          rules.date = { label: 'Date', date: true };

          var res = ITL.validation.check(d, rules);
          if (!ITL.validation.apply(form, res)) return;

          api.setBusy(true, 'Saving…');
          setTimeout(function () {
            var out = stock.apply({
              itemId: d.itemId,
              type: type,
              quantity: d.quantity,
              targetQty: d.targetQty,
              reason: d.reason,
              date: d.date,
              remarks: d.remarks
            });
            api.setBusy(false);

            if (!out.ok) {
              if (out.insufficient) {
                ITL.validation.insufficientStock({ available: out.available, requested: out.requested, item: out.item });
                ITL.validation.setError(form, 'quantity', 'Only ' + out.available + ' available.');
              } else {
                ITL.toast.error('Unable to save', out.error);
              }
              return;
            }
            api.close();
            ITL.toast.success('Stock updated',
              out.item.itemName + ': ' + out.prev + ' → ' + out.next + ' ' + (out.item.unit || 'Piece'));
            if (onDone) onDone(out);
            else ITL.router.reload();
            ITL.app.refreshChrome();
          }, 40);
        });
      }
    });
    return m;
  };

  /** Stock history modal for one item. */
  stock.openHistory = function (itemId) {
    var item = S.find(K.store, itemId);
    if (!item) { ITL.toast.error('Item not found'); return; }
    var rows = stock.history(itemId);

    var body =
      '<div class="info-strip" style="margin-bottom:16px">' +
      '<div class="is-item"><div class="is-label">Item</div><div class="is-value">' + U.esc(item.itemName) + '</div></div>' +
      '<div class="is-item"><div class="is-label">Category</div><div class="is-value">' + U.esc(item.category) + '</div></div>' +
      '<div class="is-item"><div class="is-label">Current quantity</div><div class="is-value">' + U.int(item.quantity) + ' ' + U.esc(item.unit || 'Piece') + '</div></div>' +
      '<div class="is-item"><div class="is-label">Transactions</div><div class="is-value">' + rows.length + '</div></div>' +
      '</div>' +
      (rows.length
        ? '<div class="preview-scroll"><table class="data-table compact-table"><thead><tr>' +
        '<th>Date</th><th>Type</th><th style="text-align:right">Qty</th><th style="text-align:right">Before</th><th style="text-align:right">After</th><th>Reason</th><th>Reference</th>' +
        '</tr></thead><tbody>' +
        rows.map(function (t) {
          return '<tr><td class="cell-date">' + U.esc(U.fmtDate(t.date)) + '</td>' +
            '<td>' + ITL.ui.txBadge(t.type) + '</td>' +
            '<td class="cell-num">' + U.int(t.quantity) + '</td>' +
            '<td class="cell-num muted">' + U.int(t.prevQty) + '</td>' +
            '<td class="cell-num">' + U.int(t.newQty) + '</td>' +
            '<td>' + (U.esc(t.reason) || '<span class="muted">—</span>') + '</td>' +
            '<td class="mono" style="font-size:11.5px">' +
            (t.maintenanceId ? U.esc(t.maintenanceId) : t.purchaseId ? U.esc(t.purchaseId) : '<span class="muted">—</span>') +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div>'
        : ITL.ui.emptyState({
          icon: 'history', compact: true,
          title: 'No stock movements yet',
          desc: 'Transactions appear here whenever stock is added, used, adjusted or returned.'
        }));

    ITL.modal.open({
      title: 'Stock history',
      subtitle: item.itemName,
      icon: 'history',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-excel" data-tx-export>' + ITL.icon('excel') + 'Download Excel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-secondary" data-modal-close>Close</button>',
      onMount: function (el) {
        var b = el.querySelector('[data-tx-export]');
        if (b) b.addEventListener('click', function () {
          ITL.excel.exportCollection({
            schemaId: 'stockTx',
            rows: rows,
            reportTitle: 'STOCK TRANSACTION HISTORY — ' + String(item.itemName).toUpperCase(),
            sheetName: 'Stock History',
            filenameBase: 'IT_Lab_Stock_History_' + U.slug(item.itemName),
            scope: 'Single item',
            totals: false
          });
          ITL.activity.log('Store', 'Exported', item.id, 'Downloaded stock history for ' + item.itemName);
          ITL.toast.success('Excel downloaded', 'Stock history exported');
        });
      }
    });
  };

})(window);
