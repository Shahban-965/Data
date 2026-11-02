/* ==========================================================================
   toast.js — toast notification system
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var stack = null;
  var seq = 0;

  function root() {
    if (!stack) {
      stack = document.getElementById('toastStack');
      if (!stack) {
        stack = U.el('div', 'toast-stack');
        stack.id = 'toastStack';
        stack.setAttribute('role', 'status');
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
      }
    }
    return stack;
  }

  var ICONS = { success: 'check', error: 'x', warn: 'alert', info: 'info' };

  function show(type, title, msg, duration) {
    var host = root();
    var id = 'toast-' + (++seq);
    var el = U.el('div', 'toast ' + type);
    el.id = id;
    el.innerHTML =
      '<div class="toast-ico">' + ITL.icon(ICONS[type] || 'info') + '</div>' +
      '<div class="toast-body">' +
      '<div class="toast-title">' + U.esc(title) + '</div>' +
      (msg ? '<div class="toast-msg">' + U.esc(msg) + '</div>' : '') +
      '</div>' +
      '<button class="toast-x" type="button" aria-label="Dismiss notification">' + ITL.icon('x') + '</button>';

    el.querySelector('.toast-x').addEventListener('click', function () { dismiss(el); });
    host.appendChild(el);

    // Cap visible toasts
    var all = host.children;
    while (all.length > 5) { host.removeChild(all[0]); }

    var ms = duration === undefined ? (type === 'error' ? 6500 : 3800) : duration;
    if (ms > 0) setTimeout(function () { dismiss(el); }, ms);
    return el;
  }

  function dismiss(el) {
    if (!el || !el.parentNode || el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 180);
  }

  ITL.toast = {
    success: function (t, m, d) { return show('success', t, m, d); },
    error: function (t, m, d) { return show('error', t, m, d); },
    warn: function (t, m, d) { return show('warn', t, m, d); },
    info: function (t, m, d) { return show('info', t, m, d); },
    show: show,
    dismiss: dismiss,
    clear: function () { var h = root(); while (h.firstChild) h.removeChild(h.firstChild); }
  };

})(window);
