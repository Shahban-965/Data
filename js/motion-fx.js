/* Motion-powered animations (Motion = the Framer Motion engine for vanilla JS, bundled locally, works offline) */
(function () {
  'use strict';
  var M = window.Motion; if (!M || !M.animate) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return;
  var animate = M.animate, stagger = M.stagger;
  function pageIn(root) {
    var page = root.querySelector('.page') || root;
    animate(page, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, { duration: .32, ease: 'easeOut' });
    var items = root.querySelectorAll('.stat-card,.stat-tile,.card,.report-card,.page-head');
    if (items.length) animate(items, { opacity: [0, 1], transform: ['translateY(18px) scale(.97)', 'translateY(0px) scale(1)'] }, { duration: .42, delay: stagger(.035, { startDelay: .05 }), ease: [.22, 1, .36, 1] });
    var rows = root.querySelectorAll('tbody tr');
    if (rows.length) animate(Array.prototype.slice.call(rows, 0, 14), { opacity: [0, 1], transform: ['translateX(-10px)', 'translateX(0px)'] }, { duration: .3, delay: stagger(.02, { startDelay: .15 }) });
    root.querySelectorAll('.stat-value').forEach(function (el) {
      var t = el.textContent.trim(), n = parseFloat(t.replace(/,/g, ''));
      if (!isFinite(n) || n > 1e6 || /[^\d,.]/.test(t)) return;
      animate(0, n, { duration: .8, ease: 'easeOut', onUpdate: function (v) { el.textContent = Math.round(v).toLocaleString(); } });
    });
  }
  var main = document.getElementById('appMain'), busy = false;
  if (main) new MutationObserver(function () {
    if (busy) return; busy = true;
    requestAnimationFrame(function () { busy = false; pageIn(main); });
  }).observe(main, { childList: true });
  /* modals spring in, buttons press, sidebar items nudge */
  new MutationObserver(function (list) {
    list.forEach(function (l) { l.addedNodes.forEach(function (n) {
      if (n.nodeType !== 1) return;
      var m = n.matches && n.matches('.modal-backdrop,.modal-overlay') ? n : null, box = (m || n).querySelector && (m || n).querySelector('.modal');
      if (box) animate(box, { opacity: [0, 1], transform: ['translateY(24px) scale(.94)', 'translateY(0px) scale(1)'] }, { type: 'spring', stiffness: 380, damping: 26 });
      if (n.classList && n.classList.contains('toast')) animate(n, { opacity: [0, 1], transform: ['translateX(40px)', 'translateX(0px)'] }, { type: 'spring', stiffness: 420, damping: 28 });
    }); });
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('.btn,.icon-btn,.nav-item'); if (b) animate(b, { scale: [1, .94, 1] }, { duration: .22 }); });
  document.addEventListener('pointerover', function (e) { var c = e.target.closest && e.target.closest('.nav-item'); if (c && !c._h) { c._h = 1; animate(c, { x: [0, 4, 0] }, { duration: .28 }); setTimeout(function () { c._h = 0; }, 300); } });
  var side = document.querySelector('.app-sidebar,aside'); if (side) animate(side.querySelectorAll('.nav-item'), { opacity: [0, 1], transform: ['translateX(-18px)', 'translateX(0px)'] }, { delay: stagger(.03, { startDelay: .1 }), duration: .35 });
})();
