/* ==========================================================================
   motion.js — NOVA / ATLAS motion engine v2 (single, dependency-free)

   Replaces motion-fx.js / motion2.js / arrows.js.
   Uses native Web Animations + IntersectionObserver + CSS choreography.
   The bundled Motion engine is only used for a modal spring when present.
   Honours prefers-reduced-motion and View Studio's "Motion: off" switch.
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function off() {
    return reduce || document.documentElement.getAttribute('data-motion') === 'off';
  }

  var REVEAL = '.page-head, .card, .stat-card, .stat-tile, .report-card, .chart-box, .welcome-hero, .info-strip';
  var SPOT = '.stat-card, .stat-tile, .report-card';

  /* ------------------------------------------------------------ number count */
  function countUp(el) {
    var txt = el.textContent.trim();
    if (/[^\d,.\s]/.test(txt)) return;
    var n = parseFloat(txt.replace(/,/g, ''));
    if (!isFinite(n) || n > 1e7 || n === 0) return;
    var grouped = txt.indexOf(',') !== -1;
    var start = performance.now(), dur = 620;
    function frame(t) {
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.round(n * eased);
      el.textContent = grouped ? v.toLocaleString() : String(v);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = grouped ? n.toLocaleString() : String(n);
    }
    requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------------- page in */
  function pageIn(main) {
    var page = main.querySelector('.page');
    if (!page) return;
    if (page.getAttribute('data-sn-done')) return;
    page.setAttribute('data-sn-done', '1');

    wipe();
    if (off()) return;

    page.classList.remove('sn-page-enter');
    void page.offsetWidth;
    page.classList.add('sn-page-enter');

    var items = Array.prototype.slice.call(page.querySelectorAll(REVEAL), 0, 26);
    items.forEach(function (el, i) {
      el.classList.add('sn-reveal');
      el.style.setProperty('--sn-i', String(Math.min(i, 12)));
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        items.forEach(function (el) { el.classList.add('sn-in'); });
      });
    });

    var rows = Array.prototype.slice.call(page.querySelectorAll('.data-table tbody tr'), 0, 60);
    rows.forEach(function (tr, i) {
      if (tr.querySelector('.skeleton')) return;
      tr.classList.add('sn-row');
      tr.style.setProperty('--sn-i', String(Math.min(i, 16)));
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { tr.classList.add('sn-in'); });
      });
    });

    page.querySelectorAll('.stat-value').forEach(function (el) { countUp(el); });
    staggerNav();
  }

  function staggerNav() {
    if (off()) return;
    var nav = document.getElementById('navList');
    if (!nav) return;
    Array.prototype.slice.call(nav.querySelectorAll('.nav-item')).forEach(function (el, i) {
      if (el.classList.contains('sn-nav')) return;
      el.classList.add('sn-nav');
      el.style.setProperty('--sn-i', String(Math.min(i, 14)));
    });
  }

  /* ------------------------------------------------------------ transition */
  function wipe() {
    var el = document.getElementById('snWipe');
    if (!el || off()) return;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  /* --------------------------------------------------------------- ripple */
  function ripple(e) {
    if (off()) return;
    var b = e.target.closest && e.target.closest('.btn, .icon-btn, .nav-item');
    if (!b) return;
    var r = b.getBoundingClientRect();
    var span = document.createElement('span');
    span.className = 'sn-ripple';
    span.style.left = (e.clientX - r.left) + 'px';
    span.style.top = (e.clientY - r.top) + 'px';
    b.appendChild(span);
    setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 620);
  }

  /* ------------------------------------------------------------ spotlight */
  var raf = 0, lx = 0, ly = 0, lt = null;
  function pointerMove(e) {
    if (off() || e.pointerType === 'touch') return;
    lx = e.clientX; ly = e.clientY; lt = e.target;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var el = lt && lt.closest && lt.closest(SPOT);
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (lx - r.left) + 'px');
      el.style.setProperty('--my', (ly - r.top) + 'px');
    });
  }

  /* --------------------------------------------------------- scroll reveal */
  function watchScroll(main) {
    if (!('IntersectionObserver' in window) || off()) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('sn-in');
        io.unobserve(en.target);
      });
    }, { root: main, rootMargin: '0px 0px -30px 0px' });
    main.querySelectorAll('.sn-reveal:not(.sn-in)').forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------- modals */
  function modalSpring() {
    if (off() || !window.Motion || !window.Motion.animate) return;
    var box = document.querySelector('.modal-root .modal');
    if (!box || box.getAttribute('data-sn-spring')) return;
    box.setAttribute('data-sn-spring', '1');
    window.Motion.animate(box,
      { opacity: [0, 1], transform: ['translateY(20px) scale(.96)', 'translateY(0px) scale(1)'] },
      { type: 'spring', stiffness: 320, damping: 26 });
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    var main = document.getElementById('appMain');
    var header = document.querySelector('.app-header');
    if (main) {
      new MutationObserver(function () {
        requestAnimationFrame(function () { pageIn(main); watchScroll(main); });
      }).observe(main, { childList: true });
      main.addEventListener('scroll', function () {
        if (header) header.classList.toggle('sn-scrolled', main.scrollTop > 8);
      }, { passive: true });
    }
    if (document.getElementById('modalRoot')) {
      new MutationObserver(function () { requestAnimationFrame(modalSpring); })
        .observe(document.getElementById('modalRoot'), { childList: true, subtree: true });
    }
    document.addEventListener('pointerdown', ripple, { passive: true });
    document.addEventListener('pointermove', pointerMove, { passive: true });
    staggerNav();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
