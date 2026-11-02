/* Appearance Studio: theme, accent, shape, layout, density, background, zoom, motion. Saved in localStorage, applied instantly. */
(function () {
  'use strict';
  var KEY = 'itl.appearance', root = document.documentElement;
  var DEF = { mode: 'dark', accent: 'violet', shape: 'soft', layout: 'float', density: 'comfortable', bg: 'aurora', zoom: '1', motion: 'on', arrows: 'on' };
  var st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  Object.keys(DEF).forEach(function (k) { if (st[k] == null) st[k] = DEF[k]; });
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function apply() {
    var m = st.mode === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : st.mode;
    root.setAttribute('data-mode', m);
    root.setAttribute('data-accent', st.accent); root.setAttribute('data-shape', st.shape);
    root.setAttribute('data-layout', st.layout); root.setAttribute('data-density', st.density);
    root.setAttribute('data-bg', st.bg); root.setAttribute('data-motion', st.motion); root.setAttribute('data-arrows', st.arrows);
    root.style.setProperty('--zoom', st.zoom);
    var mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = m === 'light' ? '#eef1f8' : '#07090f';
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (st.mode === 'auto') apply(); });

  var G = [
    ['mode', 'Theme', [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']]],
    ['shape', 'Shape', [['soft', 'Soft'], ['sharp', 'Sharp'], ['pill', 'Pill']]],
    ['layout', 'Sidebar style', [['float', 'Floating'], ['classic', 'Classic']]],
    ['density', 'Density', [['comfortable', 'Comfortable'], ['compact', 'Compact']]],
    ['bg', 'Background', [['aurora', 'Aurora'], ['grid', 'Grid'], ['flat', 'Flat']]],
    ['zoom', 'Text size', [['.92', 'Small'], ['1', 'Normal'], ['1.08', 'Large']]],
    ['motion', 'Animations', [['on', 'On'], ['off', 'Off']]],
    ['arrows', 'Arrow effects', [['on', 'On'], ['off', 'Off']]]
  ];
  var ACC = { violet: '#7c5cff,#19e3b1', ocean: '#2f7bff,#22d3ee', sunset: '#ff6b3d,#ff3d8a', forest: '#16a34a,#b6f03c', rose: '#ec4899,#f59e0b', gold: '#f5b301,#ff7a1a', mono: '#8b95ad,#e6eaf5' };
  var PRE = [
    ['Midnight', { mode: 'dark', accent: 'violet', shape: 'soft', layout: 'float', density: 'comfortable', bg: 'aurora' }, '#0e121b', '#7c5cff,#19e3b1'],
    ['Daylight', { mode: 'light', accent: 'ocean', shape: 'soft', layout: 'float', density: 'comfortable', bg: 'flat' }, '#ffffff', '#2f7bff,#22d3ee'],
    ['Sunset Pill', { mode: 'dark', accent: 'sunset', shape: 'pill', layout: 'float', density: 'comfortable', bg: 'aurora' }, '#0e121b', '#ff6b3d,#ff3d8a'],
    ['Forest Pro', { mode: 'dark', accent: 'forest', shape: 'sharp', layout: 'classic', density: 'compact', bg: 'grid' }, '#0e121b', '#16a34a,#b6f03c'],
    ['Paper', { mode: 'light', accent: 'mono', shape: 'sharp', layout: 'classic', density: 'comfortable', bg: 'flat' }, '#ffffff', '#8b95ad,#4b5568']
  ];
  var DESC = { mode: 'Dark, light, or follow your computer', shape: 'Corner style of cards, buttons and fields', layout: 'How the left menu looks', density: 'Space inside tables and buttons', bg: 'Backdrop behind the pages', zoom: 'Size of the content area', motion: 'Hover, page and card animations', arrows: 'Glowing arrow cursor, sliding arrows and back-to-top arrow' };
  function seg(g) {
    return '<div class="ap-seg">' + g[2].map(function (o) { return '<button type="button" class="ap-opt' + (st[g[0]] === o[0] ? ' on' : '') + '" data-ap="' + g[0] + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function studio() {
    var cur = JSON.stringify([st.mode, st.accent, st.shape, st.layout, st.density, st.bg]);
    var h = '<div class="card" id="apStudio"><div class="card-head"><div><div class="card-title">Appearance Studio</div><div class="card-sub">Pick a ready-made look, or fine-tune every part below. Saved automatically.</div></div></div>';
    h += '<div class="ap-presets">' + PRE.map(function (p, i) {
      var v = p[1], on = cur === JSON.stringify([v.mode, v.accent, v.shape, v.layout, v.density, v.bg]);
      return '<button type="button" class="ap-pre' + (on ? ' on' : '') + '" data-ap="preset" data-v="' + i + '"><div class="ap-pv" style="background:' + (v.mode === 'light' ? '#eef1f8' : '#07090f') + '"><i class="sb" style="background:' + p[2] + ';border:1px solid rgba(128,128,160,.4);border-radius:' + (v.shape === 'sharp' ? '2px' : v.shape === 'pill' ? '12px' : '6px') + '"></i><div class="mn"><b style="background:' + p[2] + '"></b><em style="background:linear-gradient(135deg,' + p[3] + ');border-radius:' + (v.shape === 'sharp' ? '2px' : v.shape === 'pill' ? '12px' : '6px') + '"></em></div></div><span>' + p[0] + '</span></button>';
    }).join('') + '</div><div class="ap-rows">';
    h += '<div class="ap-row"><div><h5>Accent colour</h5><p>Main colour used for buttons, menu and numbers</p></div><div class="ap-opts">' + Object.keys(ACC).map(function (k) {
      return '<button type="button" class="ap-sw' + (st.accent === k ? ' on' : '') + '" data-ap="accent" data-v="' + k + '" title="' + k + '" aria-label="' + k + '" style="background:linear-gradient(135deg,' + ACC[k] + ')"></button>';
    }).join('') + '</div></div>';
    G.forEach(function (g) { h += '<div class="ap-row"><div><h5>' + g[1] + '</h5><p>' + (DESC[g[0]] || '') + '</p></div>' + seg(g) + '</div>'; });
    return h + '</div><div class="ap-foot"><span>Changes are stored on this computer only.</span><button type="button" class="ap-opt" data-ap="reset">Reset appearance</button></div></div>';
  }
  window.SN_appearance = { reset: function () { st = JSON.parse(JSON.stringify(DEF)); apply(); var s = document.getElementById('apStudio'); if (s) s.outerHTML = studio(); } };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ap]'); if (b) {
      if (b.dataset.ap === 'reset') st = JSON.parse(JSON.stringify(DEF)); else if (b.dataset.ap === 'preset') { var pv = PRE[+b.dataset.v][1]; Object.keys(pv).forEach(function (k) { st[k] = pv[k]; }); } else st[b.dataset.ap] = b.dataset.v;
      apply(); var s = document.getElementById('apStudio'); if (s) s.outerHTML = studio(); return;
    }
    if (e.target.closest && e.target.closest('#themeQuick')) { st.mode = root.getAttribute('data-mode') === 'light' ? 'dark' : 'light'; apply(); var s2 = document.getElementById('apStudio'); if (s2) s2.outerHTML = studio(); }
  });
  function boot() {
    var q = document.getElementById('quickAddBtn');
    if (q && !document.getElementById('themeQuick')) q.insertAdjacentHTML('beforebegin', '<button type="button" class="icon-btn" id="themeQuick" aria-label="Switch light/dark theme" title="Light / Dark"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>');
    var m = document.getElementById('appMain'); if (!m) return;
    new MutationObserver(function () {
      if (!/settings/.test(location.hash) || document.getElementById('apStudio')) return;
      var ph = m.querySelector('.page-head'); if (ph) ph.insertAdjacentHTML('afterend', '<div class="mb-4">' + studio() + '</div>');
    }).observe(m, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
