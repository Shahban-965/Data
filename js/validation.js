/* ==========================================================================
   validation.js — form validation helpers & duplicate detection
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  var V = ITL.validation = {};

  /** Read all named values from a form element into a plain object. */
  V.readForm = function (form) {
    var out = {};
    U.qsa('[name]', form).forEach(function (el) {
      var n = el.name;
      if (!n) return;
      if (el.type === 'checkbox') out[n] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[n] = el.value; }
      else if (el.type === 'number') out[n] = el.value === '' ? '' : U.num(el.value);
      else out[n] = typeof el.value === 'string' ? el.value.trim() : el.value;
    });
    return out;
  };

  /** Clear all error UI in a form. */
  V.clearErrors = function (form) {
    U.qsa('.field.has-error', form).forEach(function (f) { f.classList.remove('has-error'); });
    U.qsa('[data-error-for]', form).forEach(function (e) { e.remove(); });
    var summary = form.querySelector('[data-error-summary]');
    if (summary) { summary.innerHTML = ''; summary.style.display = 'none'; }
  };

  /** Attach an error message to a named field. */
  V.setError = function (form, name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return;
    var field = input.closest('.field') || input.parentNode;
    field.classList.add('has-error');
    if (!field.querySelector('[data-error-for="' + name + '"]')) {
      var e = U.el('div', 'error-text');
      e.setAttribute('data-error-for', name);
      e.innerHTML = ITL.icon('alert') + '<span>' + U.esc(message) + '</span>';
      field.appendChild(e);
    }
  };

  /**
   * Apply a rules map to form data.
   * rules: { field: { label, required, min, max, integer, date, oneOf,
   *                   maxLength, custom(value, data) -> string|null } }
   * Returns { valid, errors:{field:msg}, firstField }
   */
  V.check = function (data, rules) {
    var errors = {}, first = null;
    Object.keys(rules).forEach(function (name) {
      var r = rules[name] || {};
      var v = data[name];
      var label = r.label || name;
      var sv = (v === null || v === undefined) ? '' : String(v).trim();

      if (r.required && !sv) { errors[name] = label + ' is required.'; }
      else if (sv) {
        if (r.integer || r.number) {
          var n = U.num(sv, NaN);
          if (!isFinite(n)) errors[name] = label + ' must be a number.';
          else if (r.integer && Math.trunc(n) !== n) errors[name] = label + ' must be a whole number.';
          else if (r.min !== undefined && n < r.min) errors[name] = label + ' cannot be less than ' + r.min + '.';
          else if (r.max !== undefined && n > r.max) errors[name] = label + ' cannot be more than ' + r.max + '.';
        }
        if (!errors[name] && r.date) {
          var d = U.parseDate(sv);
          if (!d) errors[name] = label + ' is not a valid date.';
          else if (r.notFuture && d.getTime() > Date.now() + 86400000) errors[name] = label + ' cannot be in the future.';
        }
        if (!errors[name] && r.maxLength && sv.length > r.maxLength) {
          errors[name] = label + ' must be ' + r.maxLength + ' characters or fewer.';
        }
        if (!errors[name] && r.oneOf && r.oneOf.indexOf(sv) === -1) {
          errors[name] = label + ' must be one of: ' + r.oneOf.join(', ') + '.';
        }
      }
      if (!errors[name] && r.custom) {
        var msg = r.custom(v, data);
        if (msg) errors[name] = msg;
      }
      if (errors[name] && !first) first = name;
    });
    return { valid: Object.keys(errors).length === 0, errors: errors, firstField: first };
  };

  /** Render a rule-check result onto a form; returns validity. */
  V.apply = function (form, result) {
    V.clearErrors(form);
    if (result.valid) return true;
    Object.keys(result.errors).forEach(function (n) { V.setError(form, n, result.errors[n]); });
    var summary = form.querySelector('[data-error-summary]');
    if (summary) {
      var list = Object.keys(result.errors).map(function (n) { return '<li>' + U.esc(result.errors[n]) + '</li>'; }).join('');
      summary.innerHTML =
        '<div class="alert alert-danger">' + ITL.icon('alert') +
        '<div class="alert-body"><div class="alert-title">Please fix ' +
        Object.keys(result.errors).length + ' issue' + (Object.keys(result.errors).length > 1 ? 's' : '') +
        '</div><ul style="margin:4px 0 0;padding-left:16px;list-style:disc">' + list + '</ul></div></div>';
      summary.style.display = '';
    }
    var el = form.querySelector('[name="' + result.firstField + '"]');
    if (el) { try { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
    return false;
  };

  /* ------------------------------------------------- duplicate detection */

  /**
   * PC duplicate check.
   * Returns { duplicate:bool, reason:string, record } or {duplicate:false}
   */
  V.checkPcDuplicate = function (pc, excludeId) {
    var rows = S.list(K.pcs);
    var nName = U.normKey(pc.pcName), nLab = U.normKey(pc.lab), nSn = U.normKey(pc.serialNumber);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (excludeId && String(r.id) === String(excludeId)) continue;
      if (nSn && U.normKey(r.serialNumber) === nSn) {
        return { duplicate: true, field: 'serialNumber', reason: 'Serial Number "' + pc.serialNumber + '" already exists on ' + (r.pcName || r.id) + '.', record: r };
      }
      if (nName && U.normKey(r.pcName) === nName && U.normKey(r.lab) === nLab) {
        return { duplicate: true, field: 'pcName', reason: 'PC Name "' + pc.pcName + '" already exists in ' + pc.lab + '.', record: r };
      }
    }
    return { duplicate: false };
  };

  V.checkStaffDuplicate = function (rec, excludeId) {
    var rows = S.list(K.staff);
    var nName = U.normKey(rec.pcName), nSn = U.normKey(rec.serialNumber);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (excludeId && String(r.id) === String(excludeId)) continue;
      if (nSn && U.normKey(r.serialNumber) === nSn) {
        return { duplicate: true, field: 'serialNumber', reason: 'Serial Number "' + rec.serialNumber + '" already exists on ' + (r.pcName || r.id) + '.', record: r };
      }
      if (nName && U.normKey(r.pcName) === nName) {
        return { duplicate: true, field: 'pcName', reason: 'A staff system named "' + rec.pcName + '" already exists.', record: r };
      }
    }
    return { duplicate: false };
  };

  V.checkStoreDuplicate = function (rec, excludeId) {
    var rows = S.list(K.store);
    var nName = U.normKey(rec.itemName), nCat = U.normKey(rec.category);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (excludeId && String(r.id) === String(excludeId)) continue;
      if (nName && U.normKey(r.itemName) === nName && U.normKey(r.category) === nCat) {
        return { duplicate: true, field: 'itemName', reason: 'Item "' + rec.itemName + '" already exists in category ' + rec.category + '. Use "Add Stock" to increase its quantity.', record: r };
      }
    }
    return { duplicate: false };
  };

  /** Present a duplicate warning modal. Resolves true if user proceeds. */
  V.warnDuplicate = function (dupe, opts) {
    opts = opts || {};
    return ITL.modal.confirm({
      heading: 'Duplicate record detected',
      title: opts.title || 'This record already exists',
      messageHtml: U.esc(dupe.reason) +
        '<br><br><span class="muted">Existing record: <b>' + U.esc(dupe.record.id) + '</b></span>' +
        (opts.allowProceed === false ? '' : '<br><br>Do you still want to save this as a separate record?'),
      tone: 'warn',
      confirmLabel: opts.confirmLabel || 'Save anyway',
      cancelLabel: 'Cancel'
    });
  };

  /* ------------------------------------------------------ stock validation */

  /**
   * Verify that an item has enough stock. Returns
   * { ok, available, requested, message }
   */
  V.checkStock = function (itemId, requested) {
    var item = S.find(K.store, itemId);
    if (!item) return { ok: false, available: 0, requested: requested, message: 'Store item not found.' };
    var avail = U.int(item.quantity, 0);
    var req = U.int(requested, 0);
    if (req <= 0) return { ok: false, available: avail, requested: req, message: 'Quantity must be at least 1.' };
    if (req > avail) {
      return {
        ok: false, available: avail, requested: req, item: item,
        message: 'INSUFFICIENT STOCK — Available: ' + avail + ', Requested: ' + req
      };
    }
    return { ok: true, available: avail, requested: req, item: item };
  };

  /** Standard "insufficient stock" alert. */
  V.insufficientStock = function (res) {
    ITL.toast.error(
      'Insufficient stock',
      'Available: ' + res.available + ' · Requested: ' + res.requested +
      (res.item ? ' · ' + res.item.itemName : '') + '. Operation cancelled.'
    );
  };

})(window);
