/* ==========================================================================
   modal.js — reusable modal + side panel + confirm + busy overlay
   Handles: ESC, focus trap, focus restore, backdrop click, stacking,
            duplicate-submit prevention.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;

  var host = null;
  var stack = [];         // open modal descriptors
  var seq = 0;

  function ensureHost() {
    if (!host) {
      host = document.getElementById('modalRoot');
      if (!host) {
        host = U.el('div', 'modal-root');
        host.id = 'modalRoot';
        document.body.appendChild(host);
      }
    }
    return host;
  }

  var FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    var items = U.qsa(FOCUSABLE, container).filter(function (n) {
      return n.offsetParent !== null || n === document.activeElement;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /**
   * Open a modal.
   * opts: { title, subtitle, icon, iconTone, body(HTML string|Node), footer(HTML),
   *         size:'sm|md|lg|xl|full', panel:false, closeOnBackdrop:true,
   *         onMount(el, api), onClose(), tabs:[{id,label}], initialTab }
   * Returns an api object { close, el, setBody, setFooter, setBusy, id }
   */
  function open(opts) {
    opts = opts || {};
    var h = ensureHost();
    var id = 'modal-' + (++seq);
    var isPanel = !!opts.panel;

    var layer = U.el('div', isPanel ? 'panel-layer' : 'modal-layer');
    layer.dataset.modalId = id;

    var box = U.el('div', isPanel
      ? ('side-panel' + (opts.size === 'lg' || opts.size === 'xl' ? ' wide' : ''))
      : ('modal size-' + (opts.size || 'md')));
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', id + '-title');

    var headHtml = '';
    if (opts.title !== false) {
      headHtml =
        '<div class="modal-head">' +
        (opts.icon ? '<div class="modal-head-ico ' + (opts.iconTone || '') + '">' + ITL.icon(opts.icon) + '</div>' : '') +
        '<div style="min-width:0;flex:1">' +
        '<div class="modal-title" id="' + id + '-title">' + U.esc(opts.title || '') + '</div>' +
        (opts.subtitle ? '<div class="modal-sub">' + U.esc(opts.subtitle) + '</div>' : '') +
        '</div>' +
        '<button type="button" class="modal-close" data-modal-close aria-label="Close dialog">' + ITL.icon('x') + '</button>' +
        '</div>';
    }

    var tabsHtml = '';
    if (opts.tabs && opts.tabs.length) {
      tabsHtml = '<div class="modal-tabs" role="tablist">' + opts.tabs.map(function (t, i) {
        var active = opts.initialTab ? (t.id === opts.initialTab) : i === 0;
        return '<button type="button" role="tab" class="tab' + (active ? ' active' : '') +
          '" data-modal-tab="' + U.esc(t.id) + '" aria-selected="' + active + '">' +
          (t.icon ? ITL.icon(t.icon) : '') + U.esc(t.label) +
          (t.count !== undefined ? '<span class="tab-count">' + t.count + '</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    }

    box.innerHTML = headHtml + tabsHtml +
      '<div class="modal-body' + (opts.bodyClass ? ' ' + opts.bodyClass : '') + '" id="' + id + '-body"></div>' +
      (opts.footer !== false ? '<div class="modal-foot" id="' + id + '-foot"></div>' : '');

    var bodyEl = box.querySelector('#' + id + '-body');
    var footEl = box.querySelector('#' + id + '-foot');

    if (opts.body instanceof Node) bodyEl.appendChild(opts.body);
    else bodyEl.innerHTML = opts.body || '';
    if (footEl) {
      if (opts.footer) footEl.innerHTML = opts.footer;
      else footEl.style.display = 'none';
    }

    layer.appendChild(box);

    var backdrop = null;
    if (!stack.length) {
      backdrop = U.el('div', 'modal-backdrop');
      backdrop.id = 'modalBackdrop';
      h.appendChild(backdrop);
    }
    h.appendChild(layer);
    h.classList.add('open');
    document.body.style.overflow = 'hidden';

    var prevFocus = document.activeElement;

    var api = {
      id: id,
      el: box,
      body: bodyEl,
      foot: footEl,
      layer: layer,
      close: function (result) { close(id, result); },
      setBody: function (html) {
        if (html instanceof Node) { bodyEl.innerHTML = ''; bodyEl.appendChild(html); }
        else bodyEl.innerHTML = html;
      },
      setFooter: function (html) {
        if (!footEl) return;
        footEl.innerHTML = html;
        footEl.style.display = html ? '' : 'none';
      },
      setTitle: function (t) {
        var el = box.querySelector('.modal-title');
        if (el) el.textContent = t;
      },
      /** Disable footer buttons while an async action runs. */
      setBusy: function (on, label) {
        var btns = U.qsa('button', box);
        btns.forEach(function (b) {
          if (on) { b.dataset._disabled = b.disabled ? '1' : '0'; b.disabled = true; }
          else if (b.dataset._disabled !== undefined) { b.disabled = b.dataset._disabled === '1'; delete b.dataset._disabled; }
        });
        var primary = box.querySelector('[data-primary]');
        if (primary) {
          if (on) {
            primary.dataset._html = primary.innerHTML;
            primary.innerHTML = '<span class="spinner"></span>' + U.esc(label || 'Working…');
            primary.classList.add('is-busy');
          } else if (primary.dataset._html) {
            primary.innerHTML = primary.dataset._html;
            delete primary.dataset._html;
            primary.classList.remove('is-busy');
          }
        }
      },
      onTab: function (fn) { api._tabHandler = fn; }
    };

    var desc = {
      id: id, layer: layer, box: box, backdrop: backdrop,
      prevFocus: prevFocus, onClose: opts.onClose, api: api,
      closeOnBackdrop: opts.closeOnBackdrop !== false
    };
    stack.push(desc);

    // events
    box.addEventListener('keydown', function (e) { trapFocus(e, box); });
    U.qsa('[data-modal-close]', box).forEach(function (b) {
      b.addEventListener('click', function () { close(id); });
    });
    layer.addEventListener('mousedown', function (e) {
      if (e.target === layer && desc.closeOnBackdrop) close(id);
    });

    if (opts.tabs && opts.tabs.length) {
      U.qsa('[data-modal-tab]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          U.qsa('[data-modal-tab]', box).forEach(function (x) {
            x.classList.remove('active'); x.setAttribute('aria-selected', 'false');
          });
          b.classList.add('active'); b.setAttribute('aria-selected', 'true');
          if (api._tabHandler) api._tabHandler(b.dataset.modalTab, api);
        });
      });
    }

    // Prevent duplicate submit on forms inside modal
    var form = box.querySelector('form');
    if (form) {
      form.addEventListener('submit', function (e) {
        if (form.dataset.submitting === '1') { e.preventDefault(); return false; }
        form.dataset.submitting = '1';
        setTimeout(function () { form.dataset.submitting = '0'; }, 700);
      }, true);
    }

    // focus first meaningful control
    setTimeout(function () {
      var target = box.querySelector('[data-autofocus]') ||
        box.querySelector('input:not([type=hidden]):not([disabled]), select, textarea') ||
        box.querySelector('[data-primary]') ||
        box.querySelector('.modal-close');
      if (target) { try { target.focus(); } catch (e) { } }
    }, 60);

    if (opts.onMount) {
      try { opts.onMount(box, api); } catch (e) { console.error('[modal] onMount error', e); }
    }
    return api;
  }

  function close(id, result) {
    var idx = -1;
    for (var i = stack.length - 1; i >= 0; i--) { if (stack[i].id === id) { idx = i; break; } }
    if (idx === -1) return;
    var d = stack[idx];
    stack.splice(idx, 1);

    if (d.layer && d.layer.parentNode) d.layer.parentNode.removeChild(d.layer);
    if (!stack.length) {
      var bd = document.getElementById('modalBackdrop');
      if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      if (host) host.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (d.prevFocus && d.prevFocus.focus) { try { d.prevFocus.focus(); } catch (e) { } }
    if (d.onClose) { try { d.onClose(result); } catch (e) { console.error(e); } }
  }

  function closeTop() { if (stack.length) close(stack[stack.length - 1].id); }
  function closeAll() { while (stack.length) close(stack[stack.length - 1].id); }

  /* ------------------------------------------------------------- confirm */
  /**
   * confirm({ title, message, confirmLabel, cancelLabel, tone:'danger|warn|info',
   *           requireText:'DELETE', onConfirm(){} })
   * Returns a Promise<boolean> as well as supporting onConfirm.
   */
  function confirm(opts) {
    opts = opts || {};
    var tone = opts.tone || 'danger';
    var reqText = opts.requireText || '';
    return new Promise(function (resolve) {
      var settled = false;
      var body =
        '<div class="confirm-body">' +
        '<div class="confirm-ico ' + tone + '">' + ITL.icon(tone === 'danger' ? 'alert' : (tone === 'warn' ? 'alert' : 'info')) + '</div>' +
        '<div class="confirm-text" style="flex:1;min-width:0">' +
        '<h4>' + U.esc(opts.title || 'Are you sure?') + '</h4>' +
        '<p>' + (opts.messageHtml || U.esc(opts.message || '')) + '</p>' +
        (reqText
          ? '<div class="field" style="margin-top:14px">' +
          '<label for="confirmText">Type <b>' + U.esc(reqText) + '</b> to confirm</label>' +
          '<input type="text" id="confirmText" autocomplete="off" spellcheck="false" data-autofocus placeholder="' + U.esc(reqText) + '">' +
          '</div>'
          : '') +
        '</div></div>';

      var api = open({
        title: opts.heading || (tone === 'danger' ? 'Confirm deletion' : 'Please confirm'),
        icon: tone === 'danger' ? 'trash' : 'helpCircle',
        iconTone: tone === 'danger' ? 'danger' : (tone === 'warn' ? 'warn' : ''),
        size: 'sm',
        body: body,
        footer:
          '<button type="button" class="btn btn-secondary" data-modal-close>' + U.esc(opts.cancelLabel || 'Cancel') + '</button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="btn ' + (tone === 'danger' ? 'btn-danger' : 'btn-primary') + '" data-primary data-confirm-ok' +
          (reqText ? ' disabled' : '') + '>' + U.esc(opts.confirmLabel || 'Confirm') + '</button>',
        onClose: function () { if (!settled) { settled = true; resolve(false); } },
        onMount: function (el, m) {
          var ok = el.querySelector('[data-confirm-ok]');
          var input = el.querySelector('#confirmText');
          if (input) {
            input.addEventListener('input', function () {
              ok.disabled = input.value.trim() !== reqText;
            });
            input.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' && !ok.disabled) { e.preventDefault(); ok.click(); }
            });
          }
          ok.addEventListener('click', function () {
            if (ok.disabled) return;
            settled = true;
            m.close();
            if (opts.onConfirm) { try { opts.onConfirm(); } catch (e) { console.error(e); } }
            resolve(true);
          });
        }
      });
      void api;
    });
  }

  /* -------------------------------------------------------- busy overlay */
  var busyEl = null;
  function busy(on, title, sub) {
    if (on) {
      if (!busyEl) {
        busyEl = U.el('div', 'busy-overlay');
        busyEl.innerHTML =
          '<div class="busy-card" role="status" aria-live="polite">' +
          '<div class="load-spinner"></div>' +
          '<div class="bc-title"></div><div class="bc-sub"></div></div>';
        document.body.appendChild(busyEl);
      }
      busyEl.querySelector('.bc-title').textContent = title || 'Working…';
      busyEl.querySelector('.bc-sub').textContent = sub || 'Please wait';
      busyEl.style.display = 'grid';
    } else if (busyEl) {
      busyEl.style.display = 'none';
    }
  }

  /** Run an async task with a busy overlay + guaranteed teardown. */
  function withBusy(title, sub, task) {
    busy(true, title, sub);
    return new Promise(function (resolve, reject) {
      // let the browser paint the overlay before heavy sync work
      setTimeout(function () {
        Promise.resolve()
          .then(task)
          .then(function (r) { busy(false); resolve(r); })
          .catch(function (e) { busy(false); reject(e); });
      }, 30);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) {
      e.stopPropagation();
      closeTop();
    }
  });

  ITL.modal = {
    open: open,
    close: close,
    closeTop: closeTop,
    closeAll: closeAll,
    confirm: confirm,
    busy: busy,
    withBusy: withBusy,
    isOpen: function () { return stack.length > 0; },
    count: function () { return stack.length; }
  };

})(window);
