/* ==========================================================================
   appearance.js — NOVA / ATLAS "View Studio" v2

   Appearance preferences are DATA, not device-local RAM: they are stored in
   DATA/ui-state.json through ITL.storage, so the same look travels with the
   project folder to any PC. The head script paints the defaults instantly;
   the saved look is applied from disk as soon as the data layer is ready.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var DEF = {
    mode: 'light', accent: 'cobalt', shape: 'soft',
    density: 'comfortable', motion: 'on', bg: 'dots'
  };
  var st = {};
  Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });

  function apply() {
    root.setAttribute('data-mode', st.mode);
    root.setAttribute('data-accent', st.accent);
    root.setAttribute('data-shape', st.shape);
    root.setAttribute('data-density', st.density);
    root.setAttribute('data-motion', st.motion);
    root.setAttribute('data-bg', st.bg);
    root.setAttribute('data-theme', st.mode);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = st.mode === 'dark' ? '#0e1219' : '#10131a';
    var moon = document.querySelector('#themeToggle .moon');
    var sun = document.querySelector('#themeToggle .sun');
    if (moon && sun) {
      moon.style.display = st.mode === 'dark' ? 'none' : '';
      sun.style.display = st.mode === 'dark' ? '' : 'none';
    }
  }
  apply();

  function storage() { return window.ITL && window.ITL.storage; }
  function uiKey() { var S = storage(); return S && S.KEYS ? S.KEYS.ui : null; }

  function persist() {
    var S = storage(), key = uiKey();
    if (!S || !key || !S.update) return;
    try { S.update(key, { view: st }); } catch (e) { /* non-fatal */ }
  }

  function hydrate() {
    var S = storage(), key = uiKey();
    if (!S || !key) return;
    try {
      var ui = S.get(key) || {};
      if (ui.view && typeof ui.view === 'object') {
        Object.keys(DEF).forEach(function (k) {
          if (ui.view[k] !== undefined) st[k] = ui.view[k];
        });
      }
    } catch (e) { /* keep defaults */ }
    apply();
  }

  var GROUPS = [
    ['mode', 'Theme', [['light', 'Paper'], ['dark', 'Ink']]],
    ['shape', 'Corners', [['soft', 'Soft'], ['sharp', 'Sharp'], ['pill', 'Pill']]],
    ['density', 'Density', [['comfortable', 'Roomy'], ['compact', 'Compact']]],
    ['motion', 'Motion', [['on', 'On'], ['off', 'Off']]],
    ['bg', 'Canvas', [['dots', 'Dots'], ['flat', 'Flat']]]
  ];
  var ACCENTS = {
    cobalt: '#2f61ff', graphite: '#454f61', teal: '#0b9c8a', mono: '#10131a'
  };
  var PRESETS = [
    ['Paper',      { mode: 'light', accent: 'cobalt',   shape: 'soft',  density: 'comfortable', motion: 'on', bg: 'dots' }],
    ['Ink',        { mode: 'dark',  accent: 'cobalt',   shape: 'soft',  density: 'comfortable', motion: 'on', bg: 'flat' }],
    ['Blueprint',  { mode: 'dark',  accent: 'teal',     shape: 'sharp', density: 'compact',     motion: 'on', bg: 'dots' }],
    ['Monochrome', { mode: 'light', accent: 'mono',     shape: 'sharp', density: 'comfortable', motion: 'off', bg: 'flat' }]
  ];
  var DESC = {
    mode: 'Paper (light) or Ink (dark)', accent: 'Single accent used across the interface',
    shape: 'Corner geometry of cards and buttons', density: 'Spacing inside tables and cards',
    motion: 'Page entrance, reveal and hover animations', bg: 'Texture behind the content'
  };

  function segment(g) {
    return '<div class="ap-seg">' + g[2].map(function (o) {
      return '<button type="button" class="ap-opt' + (st[g[0]] === o[0] ? ' on' : '') +
        '" data-ap="' + g[0] + '" data-v="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function studio() {
    var cur = JSON.stringify([st.mode, st.accent, st.shape, st.density, st.motion, st.bg]);
    var h = '<div class="card" id="apStudio"><div class="card-head">' +
      '<div><div class="card-title">View Studio</div>' +
      '<div class="card-sub">Pick a ready-made look, or fine-tune each part. Saved permanently in DATA/ui-state.json.</div></div>' +
      '</div><div class="ap-presets">';
    h += PRESETS.map(function (p, i) {
      var v = p[1];
      var on = cur === JSON.stringify([v.mode, v.accent, v.shape, v.density, v.motion, v.bg]);
      var bg = v.mode === 'dark' ? '#0e1219' : '#f3f5f8';
      var accent = ACCENTS[v.accent] || '#2f61ff';
      return '<button type="button" class="ap-pre' + (on ? ' on' : '') + '" data-ap="preset" data-v="' + i + '">' +
        '<div class="ap-pv" style="background:' + bg + '">' +
        '<i class="sb" style="background:' + accent + ';border:1px solid rgba(128,128,160,.35);border-radius:' +
        (v.shape === 'sharp' ? '2px' : v.shape === 'pill' ? '12px' : '6px') + '"></i>' +
        '<div class="mn"><b style="background:' + accent + '"></b>' +
        '<em style="background:linear-gradient(135deg,' + accent + ', ' + bg + ');border-radius:' +
        (v.shape === 'sharp' ? '2px' : v.shape === 'pill' ? '12px' : '6px') + '"></em></div></div>' +
        '<span>' + p[0] + '</span></button>';
    }).join('');
    h += '</div><div class="ap-rows">';
    h += '<div class="ap-row"><div><h5>Accent</h5><p>' + DESC.accent + '</p></div><div class="ap-opts">' +
      Object.keys(ACCENTS).map(function (k) {
        return '<button type="button" class="ap-sw' + (st.accent === k ? ' on' : '') +
          '" data-ap="accent" data-v="' + k + '" title="' + k + '" aria-label="' + k +
          '" style="background:' + ACCENTS[k] + '"></button>';
      }).join('') + '</div></div>';
    GROUPS.forEach(function (g) {
      h += '<div class="ap-row"><div><h5>' + g[1] + '</h5><p>' + (DESC[g[0]] || '') + '</p></div>' + segment(g) + '</div>';
    });
    return h + '</div><div class="ap-foot"><span>These preferences travel with the project folder.</span>' +
      '<button type="button" class="ap-opt" data-ap="reset">Reset view</button></div></div>';
  }

  function rerender() {
    var box = document.getElementById('apStudio');
    if (box) box.outerHTML = studio();
  }

  function set(key, value) {
    if (!(key in DEF)) return;
    st[key] = value;
    apply();
    persist();
    rerender();
  }

  window.SN_appearance = {
    apply: apply,
    get: function () { return Object.assign({}, st); },
    set: set,
    toggleMode: function () { set('mode', st.mode === 'dark' ? 'light' : 'dark'); },
    reset: function () {
      Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });
      apply(); persist(); rerender();
    }
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ap]');
    if (!b) return;
    var key = b.getAttribute('data-ap'), v = b.getAttribute('data-v');
    if (key === 'reset') {
      Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });
      apply(); persist(); rerender();
    } else if (key === 'preset') {
      var pv = PRESETS[parseInt(v, 10)][1];
      Object.keys(pv).forEach(function (k) { st[k] = pv[k]; });
      apply(); persist(); rerender();
    } else set(key, v);
  });

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    hydrate();
    apply();
    var main = document.getElementById('appMain');
    if (!main) return;
    new MutationObserver(function () {
      if (!/settings/.test(location.hash) || document.getElementById('apStudio')) return;
      var head = main.querySelector('.page-head');
      if (head) head.insertAdjacentHTML('afterend', '<div class="mb-4">' + studio() + '</div>');
    }).observe(main, { childList: true });
  });
})();
