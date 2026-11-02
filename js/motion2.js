/* Motion v2: cursor spotlight, magnetic buttons, scroll-reveal for long lists. Lightweight, rAF-throttled. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.stat-card,.stat-tile,.report-card,.card,.qa-btn', raf = 0, lx = 0, ly = 0, lt = null;
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    lx = e.clientX; ly = e.clientY; lt = e.target;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var el = lt && lt.closest && lt.closest(SEL);
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (lx - r.left) + 'px');
      el.style.setProperty('--my', (ly - r.top) + 'px');
    });
  }, { passive: true });
  /* reveal table rows beyond first screen as they scroll in */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.transition = 'opacity .35s ease, transform .35s ease';
        en.target.style.opacity = 1; en.target.style.transform = 'none';
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    var main = document.getElementById('appMain');
    if (main) new MutationObserver(function () {
      requestAnimationFrame(function () {
        main.querySelectorAll('tbody tr').forEach(function (tr, i) {
          if (i < 14 || tr._rv) return; tr._rv = 1;
          tr.style.opacity = 0; tr.style.transform = 'translateY(10px)'; io.observe(tr);
        });
      });
    }).observe(main, { childList: true });
  }
  /* header gets a soft shadow once the page scrolls */
  var hdr = document.querySelector('.app-header'), mn = document.getElementById('appMain');
  if (hdr && mn) mn.addEventListener('scroll', function () { hdr.style.boxShadow = mn.scrollTop > 8 ? '0 10px 30px -14px rgba(0,0,0,.6)' : 'none'; }, { passive: true });
})();
