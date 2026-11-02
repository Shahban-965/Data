/* ==========================================================================
   utils.js — shared helpers, icon set, formatters
   Global namespace: window.ITL
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};

  /* ---------------------------------------------------------------- ICONS */
  var P = {
    dashboard: '<path d="M3 3h7v8H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
    desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronUp: '<path d="M18 15l-6-6-6 6"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    sortAsc: '<path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 20V4"/>',
    sortDesc: '<path d="M11 5h4M11 9h7M11 13h10M3 17l3 3 3-3M6 20V4"/>',
    sortNone: '<path d="M8 9l4-4 4 4M16 15l-4 4-4-4"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    excel: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13l6 6M15 13l-6 6"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    hdd: '<rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6.01 18H6M10.01 18H10M4 14l3-8h10l3 8"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    trendUp: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    package: '<path d="M16.5 9.4L7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
    plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
    minusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
    slash: '<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>',
    rotate: '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    building: '<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/>',
    truck: '<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
    mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
    power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    pieChart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    barChart: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M17 11l2 2 4-4"/>',
    helpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    externalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
    minimize: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'
  };

  /**
   * Return an inline SVG string for a named icon.
   */
  ITL.icon = function (name, cls, size) {
    var body = P[name];
    if (!body) body = P.helpCircle;
    // An explicit width/height is ALWAYS emitted: an inline <svg> with no
    // intrinsic size falls back to 300x150 and blows the layout apart.
    // CSS rules still win over these presentation attributes.
    var s = size || 16;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (cls ? ' class="' + cls + '"' : '') +
      ' width="' + s + '" height="' + s + '">' + body + '</svg>';
  };
  ITL.hasIcon = function (n) { return !!P[n]; };

  /* ------------------------------------------------------------- UTILITIES */
  var U = ITL.utils = {};

  /** HTML-escape any value for safe innerHTML injection. */
  U.esc = function (v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Escape a string for use inside a JS single-quoted attribute. */
  U.escAttr = function (v) {
    return U.esc(v).replace(/\n/g, ' ');
  };

  U.uid = function (prefix) {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return (prefix || 'ID') + '-' + t + r;
  };

  /**
   * Sequential human readable id, e.g. PC-0001. Ensures uniqueness against
   * an existing collection.
   */
  U.nextId = function (prefix, collection, field) {
    field = field || 'id';
    var max = 0, re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
    (collection || []).forEach(function (r) {
      var m = re.exec(String(r[field] || ''));
      if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    return prefix + '-' + String(max + 1).padStart(4, '0');
  };

  U.nowISO = function () { return new Date().toISOString(); };

  /** Today as yyyy-mm-dd in local time. */
  U.today = function () {
    var d = new Date();
    return U.toDateInput(d);
  };

  U.toDateInput = function (d) {
    if (!d) return '';
    if (typeof d === 'string') { d = U.parseDate(d); if (!d) return ''; }
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  U.MONTHS = MONTHS; U.MONTHS_FULL = MONTHS_FULL;

  /**
   * Tolerant date parser: accepts Date, ISO, yyyy-mm-dd, dd/mm/yyyy,
   * mm/dd/yyyy, dd-mmm-yyyy and Excel serial numbers.
   */
  U.parseDate = function (v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

    if (typeof v === 'number' && isFinite(v)) {
      // Excel serial date (days since 1899-12-30)
      if (v > 20000 && v < 80000) {
        var ms = Math.round((v - 25569) * 86400 * 1000);
        var ed = new Date(ms);
        return isNaN(ed.getTime()) ? null : new Date(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate());
      }
      var nd = new Date(v);
      return isNaN(nd.getTime()) ? null : nd;
    }

    var s = String(v).trim();
    if (!s) return null;

    var m;
    // yyyy-mm-dd (optionally with time)
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})([T ].*)?$/.exec(s);
    if (m) {
      var dt = new Date(+m[1], +m[2] - 1, +m[3]);
      if (m[4]) {
        var t = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(m[4]);
        if (t) { dt.setHours(+t[1], +t[2], t[3] ? +t[3] : 0); }
      }
      return isNaN(dt.getTime()) ? null : dt;
    }
    // dd/mm/yyyy or dd-mm-yyyy (day-first, common outside US)
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
    if (m) {
      var a = +m[1], b = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      if (a > 12 && b <= 12) return new Date(y, b - 1, a);       // clearly dd/mm
      if (b > 12 && a <= 12) return new Date(y, a - 1, b);       // clearly mm/dd
      return new Date(y, b - 1, a);                               // ambiguous -> dd/mm
    }
    // dd-MMM-yyyy
    m = /^(\d{1,2})[\-\s]([A-Za-z]{3,})[\-\s](\d{2,4})$/.exec(s);
    if (m) {
      var mi = MONTHS.indexOf(m[2].slice(0, 3).replace(/^./, function (c) { return c.toUpperCase(); }).slice(0, 3));
      var yy = +m[3]; if (yy < 100) yy += 2000;
      if (mi >= 0) return new Date(yy, mi, +m[1]);
    }
    var f = new Date(s);
    return isNaN(f.getTime()) ? null : f;
  };

  /** Format date for display honouring the user's chosen format setting. */
  U.fmtDate = function (v, fmt) {
    var d = U.parseDate(v);
    if (!d) return '';
    fmt = fmt || (ITL.settings && ITL.settings.get ? ITL.settings.get().dateFormat : null) || 'dd-MMM-yyyy';
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    var mmm = MONTHS[d.getMonth()];
    switch (fmt) {
      case 'dd/MM/yyyy': return dd + '/' + mm + '/' + yyyy;
      case 'MM/dd/yyyy': return mm + '/' + dd + '/' + yyyy;
      case 'yyyy-MM-dd': return yyyy + '-' + mm + '-' + dd;
      default: return dd + '-' + mmm + '-' + yyyy;
    }
  };

  U.fmtDateTime = function (v) {
    var d = U.parseDate(v);
    if (!d) return '';
    return U.fmtDate(d) + ' ' + U.fmtTime(d);
  };

  U.fmtTime = function (v) {
    var d = U.parseDate(v);
    if (!d) return '';
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  };

  /** "2 hours ago" style relative time. */
  U.timeAgo = function (v) {
    var d = U.parseDate(v);
    if (!d) return '';
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 45) return 'just now';
    if (s < 90) return '1 minute ago';
    var mn = Math.floor(s / 60);
    if (mn < 60) return mn + ' minutes ago';
    var h = Math.floor(mn / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var dy = Math.floor(h / 24);
    if (dy < 30) return dy + (dy === 1 ? ' day ago' : ' days ago');
    return U.fmtDate(d);
  };

  U.monthKey = function (v) {
    var d = U.parseDate(v);
    if (!d) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  U.monthLabel = function (key) {
    var p = String(key == null ? '' : key).split('-');
    if (p.length < 2) return U.str(key);
    var m = MONTHS[+p[1] - 1];
    if (!m) return U.str(key);
    return m + ' ' + p[0];
  };

  U.isSameMonth = function (v, ref) {
    var d = U.parseDate(v); if (!d) return false;
    var r = ref ? U.parseDate(ref) : new Date();
    return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
  };

  U.num = function (v, dflt) {
    if (v === '' || v === null || v === undefined) return dflt === undefined ? 0 : dflt;
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : (dflt === undefined ? 0 : dflt);
  };

  U.int = function (v, dflt) { return Math.trunc(U.num(v, dflt)); };

  U.fmtNum = function (n) {
    var v = U.num(n);
    return v.toLocaleString('en-US');
  };

  U.bytes = function (b) {
    if (!b) return '0 B';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0, n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + ' ' + u[i];
  };

  U.pct = function (a, b) {
    if (!b) return 0;
    return Math.round((a / b) * 1000) / 10;
  };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var self = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 220);
    };
  };

  U.throttle = function (fn, ms) {
    var last = 0, timer;
    return function () {
      var self = this, args = arguments, now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(self, args); }
      else {
        clearTimeout(timer);
        timer = setTimeout(function () { last = Date.now(); fn.apply(self, args); }, ms - (now - last));
      }
    };
  };

  U.deepClone = function (o) {
    if (o === null || typeof o !== 'object') return o;
    try { return JSON.parse(JSON.stringify(o)); }
    catch (e) { return o; }
  };

  U.sortBy = function (arr, key, dir) {
    var s = arr.slice();
    var mul = dir === 'desc' ? -1 : 1;
    s.sort(function (a, b) {
      var x = a[key], y = b[key];
      if (x === null || x === undefined || x === '') x = null;
      if (y === null || y === undefined || y === '') y = null;
      if (x === null && y === null) return 0;
      if (x === null) return 1;   // blanks always last
      if (y === null) return -1;
      var nx = typeof x === 'number' ? x : (/^-?\d+(\.\d+)?$/.test(String(x).trim()) ? parseFloat(x) : null);
      var ny = typeof y === 'number' ? y : (/^-?\d+(\.\d+)?$/.test(String(y).trim()) ? parseFloat(y) : null);
      if (nx !== null && ny !== null) return (nx - ny) * mul;
      var dx = /date|At$|^date/i.test(key) ? U.parseDate(x) : null;
      var dy = /date|At$|^date/i.test(key) ? U.parseDate(y) : null;
      if (dx && dy) return (dx.getTime() - dy.getTime()) * mul;
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * mul;
    });
    return s;
  };

  U.groupCount = function (arr, keyFn) {
    var out = {};
    (arr || []).forEach(function (r) {
      var k = typeof keyFn === 'function' ? keyFn(r) : r[keyFn];
      k = (k === null || k === undefined || k === '') ? 'Unspecified' : String(k);
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  };

  U.uniqueValues = function (arr, key) {
    var seen = Object.create(null), out = [];
    (arr || []).forEach(function (r) {
      var v = r[key];
      if (v === null || v === undefined || v === '') return;
      v = String(v).trim();
      if (!v || seen[v]) return;
      seen[v] = 1; out.push(v);
    });
    return out.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  };

  /** Case/space-insensitive substring test across selected fields. */
  U.matches = function (record, term, fields) {
    if (!term) return true;
    var t = String(term).toLowerCase().trim();
    if (!t) return true;
    var keys = fields && fields.length ? fields : Object.keys(record);
    for (var i = 0; i < keys.length; i++) {
      var v = record[keys[i]];
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') continue;
      if (String(v).toLowerCase().indexOf(t) !== -1) return true;
    }
    return false;
  };

  U.initials = function (name) {
    var p = String(name || 'A').trim().split(/\s+/);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  /** Normalize any header/label into a comparison key. */
  U.normKey = function (s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  };

  U.titleCase = function (s) {
    return String(s || '').replace(/\w\S*/g, function (t) {
      return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    });
  };

  /** Safe filename fragment. */
  U.slug = function (s) {
    return String(s || '').trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  /** File-name timestamp e.g. 2026-09-06 or 2026-09-06_11-30 */
  U.stampDate = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  U.stampDateTime = function () {
    var d = new Date();
    return U.stampDate() + '_' + String(d.getHours()).padStart(2, '0') + '-' + String(d.getMinutes()).padStart(2, '0');
  };

  U.downloadBlob = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };

  U.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  U.qs = function (sel, root) { return (root || document).querySelector(sel); };
  U.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** Delegate an event from a root element to matching descendants. */
  U.on = function (root, evt, sel, handler) {
    if (!root) return;
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) handler.call(t, e, t);
    });
  };

  U.escapeCsv = function (v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  /** Clamp a page number into range. */
  U.clampPage = function (page, total, size) {
    var pages = Math.max(1, Math.ceil(total / size));
    return Math.min(Math.max(1, page), pages);
  };

  U.arr = function (v) { return Array.isArray(v) ? v : []; };

  U.str = function (v) { return v === null || v === undefined ? '' : String(v).trim(); };

  /** Trigger a keyed CSS-less highlight on a row after navigation. */
  U.flashElement = function (elm) {
    if (!elm) return;
    elm.style.transition = 'background 200ms ease';
    var prev = elm.style.background;
    elm.style.background = 'rgba(59,102,246,0.16)';
    setTimeout(function () { elm.style.background = prev || ''; }, 1400);
  };

})(window);
