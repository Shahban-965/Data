/* Arrow effects. The mouse pointer is now a REAL system cursor (CSS `cursor:url(...)`), drawn by the
   browser itself, so it never lags, never follows or rotates and its tip is the exact click point.
   Also: click burst of mini arrows, sliding arrows in buttons/menu and a back-to-top arrow.
   Controlled by Settings > Appearance Studio > "Arrow effects" (html[data-arrows]). */
(function () {
  'use strict';
  var root = document.documentElement;
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1) real arrow cursor (accent-coloured, always follows the theme) ---------- */
  var lastKey = '';
  function arrowSvg(c1, c2, hot) {
    var halo = hot ? '<path d="M5 3.5v21.5l5.6-5.2 3.5 8 4-1.8-3.5-7.8 7.6-.4z" fill="none" stroke="' + c1 + '" stroke-opacity=".38" stroke-width="5" stroke-linejoin="round"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' + halo +
      '<path d="M5 3.5v21.5l5.6-5.2 3.5 8 4-1.8-3.5-7.8 7.6-.4z" fill="url(#g)" stroke="#0b1020" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/>' +
      '<path d="M5 3.5v21.5l5.6-5.2 3.5 8 4-1.8-3.5-7.8 7.6-.4z" fill="url(#g)" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  }
  function toUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  function buildCursor() {
    var cs = getComputedStyle(root);
    var c1 = (cs.getPropertyValue('--ac1') || '#7c5cff').trim() || '#7c5cff';
    var c2 = (cs.getPropertyValue('--ac2') || '#19e3b1').trim() || '#19e3b1';
    var key = c1 + '|' + c2; if (key === lastKey) return; lastKey = key;
    root.style.setProperty('--arrow-cur', toUrl(arrowSvg(c1, c2, false)));
    root.style.setProperty('--arrow-cur-hot', toUrl(arrowSvg(c1, c2, true)));
  }
  function sync() {
    var active = fine && root.getAttribute('data-arrows') !== 'off';
    if (active) buildCursor();
    if (root.classList.contains('arrow-real') !== active) root.classList.toggle('arrow-real', active);
  }

  /* ---------- 2) click burst ---------- */
  function on() { return root.getAttribute('data-arrows') !== 'off' && root.getAttribute('data-motion') !== 'off' && !reduce; }
  function burst(x, y) {
    var n = 7;
    for (var i = 0; i < n; i++) {
      var a = (360 / n) * i + Math.random() * 20, dist = 34 + Math.random() * 26;
      var el = document.createElement('i'); el.className = 'arrow-burst'; el.setAttribute('aria-hidden', 'true');
      el.style.left = x + 'px'; el.style.top = y + 'px';
      document.body.appendChild(el);
      var rx = Math.cos((a - 90) * Math.PI / 180) * dist, ry = Math.sin((a - 90) * Math.PI / 180) * dist;
      if (el.animate) {
        var an = el.animate([
          { transform: 'translate(-50%,-50%) rotate(' + a + 'deg) scale(.4)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + rx + 'px),calc(-50% + ' + ry + 'px)) rotate(' + a + 'deg) scale(1)', opacity: 0 }
        ], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' });
        an.onfinish = (function (e) { return function () { e.remove(); }; })(el);
      } else { setTimeout((function (e) { return function () { e.remove(); }; })(el), 600); }
    }
  }

  /* ---------- 3) back-to-top arrow ---------- */
  var top;
  function scroller() { var m = document.getElementById('appMain'); return (m && m.scrollHeight > m.clientHeight + 4 && getComputedStyle(m).overflowY !== 'visible') ? m : null; }
  function pos() { var s = scroller(); return s ? s.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0); }
  function updTop() { if (top) top.classList.toggle('show', pos() > 320 && root.getAttribute('data-arrows') !== 'off'); }
  function buildTop() {
    top = document.createElement('button'); top.type = 'button'; top.id = 'arrowTop'; top.setAttribute('aria-label', 'Back to top'); top.title = 'Back to top';
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () {
      var s = scroller(), smooth = root.getAttribute('data-motion') !== 'off' && !reduce;
      if (s) s.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }); window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    });
    document.body.appendChild(top);
    window.addEventListener('scroll', updTop, { passive: true });
    var m = document.getElementById('appMain'); if (m) m.addEventListener('scroll', updTop, { passive: true });
    if (m) new MutationObserver(function () { setTimeout(updTop, 120); }).observe(m, { childList: true });
  }

  /* ---------- 4) sliding arrows inside buttons ---------- */
  function tagArrows(scope) {
    (scope || document).querySelectorAll('.btn:not(.has-arrow),.dd-item:not(.has-arrow)').forEach(function (b) {
      if (b.querySelector('svg path[d^="M5 12h14M12 5l7 7-7 7"]')) b.classList.add('has-arrow');
    });
  }

  function boot() {
    sync();
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-arrows', 'data-accent', 'data-mode'] });
    tagArrows(); var mm = document.getElementById('appMain');
    if (mm) new MutationObserver(function () { tagArrows(mm); }).observe(mm, { childList: true, subtree: true });
    buildTop(); updTop();
    document.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch' && on()) burst(e.clientX, e.clientY); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
