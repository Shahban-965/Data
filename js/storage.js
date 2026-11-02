/* ==========================================================================
   storage.js — centralized portable JSON / browser-preview data layer
   All modules MUST go through ITL.storage.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};

  var PREFIX = 'itlab_';
  var SCHEMA_VERSION = 2;

  // Desktop build writes plain JSON files beside the portable application.
  // The browser fallback remains available for preview/testing only.
  var desktop = w.shakeelDesktop || null;
  var FILES = {
    itlab_pcs: 'pcs.json', itlab_staff: 'staff.json',
    itlab_maintenance: 'maintenance.json', itlab_store: 'store.json',
    itlab_stock_transactions: 'stock-transactions.json',
    itlab_purchases: 'purchases.json', itlab_activity_logs: 'activity-logs.json',
    itlab_settings: 'settings.json', itlab_import_history: 'import-history.json',
    itlab_ui_state: 'ui-state.json', itlab_meta: 'meta.json'
  };

  /** Canonical storage keys. */
  var KEYS = {
    pcs: 'itlab_pcs',
    staff: 'itlab_staff',
    maintenance: 'itlab_maintenance',
    store: 'itlab_store',
    stockTx: 'itlab_stock_transactions',
    purchases: 'itlab_purchases',
    logs: 'itlab_activity_logs',
    settings: 'itlab_settings',
    importHistory: 'itlab_import_history',
    ui: 'itlab_ui_state',
    meta: 'itlab_meta'
  };

  /** Keys holding arrays of records (used for backup / counts / clear). */
  var COLLECTION_KEYS = [
    KEYS.pcs, KEYS.staff, KEYS.maintenance, KEYS.store,
    KEYS.stockTx, KEYS.purchases, KEYS.logs, KEYS.importHistory
  ];

  var DEFAULTS = {};
  DEFAULTS[KEYS.pcs] = [];
  DEFAULTS[KEYS.staff] = [];
  DEFAULTS[KEYS.maintenance] = [];
  DEFAULTS[KEYS.store] = [];
  DEFAULTS[KEYS.stockTx] = [];
  DEFAULTS[KEYS.purchases] = [];
  DEFAULTS[KEYS.logs] = [];
  DEFAULTS[KEYS.importHistory] = [];
  DEFAULTS[KEYS.ui] = { sidebarCollapsed: false, lastPage: 'dashboard' };
  DEFAULTS[KEYS.meta] = { schemaVersion: SCHEMA_VERSION, createdAt: null };
  DEFAULTS[KEYS.settings] = {
    labName: 'IT Lab Management System',
    brandName: 'Shakeel Networking',
    orgName: 'VIP IT Labs',
    defaultLab: 'Lab 1',
    labs: ['Lab 1', 'Lab 2', 'Lab 3'],
    lowStockThreshold: 5,
    dateFormat: 'dd-MMM-yyyy',
    tablePageSize: 25,
    theme: 'dark',
    adminName: 'Shakeel Ahmed',
    adminRole: 'Admin',
    exportIncludeTimestamps: true,
    exportIncludePasswords: false,
    exportDefaultScope: 'filtered',
    confirmDeletes: true
  };

  /* ------------------------------------------------------------ availability */
  var available = (function () {
    if (desktop) return true;
    try {
      var k = '__itlab_probe__';
      w.localStorage.setItem(k, '1');
      w.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  /** In-memory fallback so the app still runs if storage is blocked. */
  var memory = Object.create(null);

  /** Parsed-value cache to avoid repeated JSON.parse on hot paths. */
  var cache = Object.create(null);

  function rawGet(key) {
    if (desktop && FILES[key]) {
      try { var diskValue = desktop.read(FILES[key]); return typeof diskValue === 'string' ? diskValue : null; }
      catch (e) { console.error('[storage] portable file read failed', e); return null; }
    }
    if (available) { try { return w.localStorage.getItem(key); } catch (e) { return memory[key] || null; } }
    return memory[key] === undefined ? null : memory[key];
  }

  function rawSet(key, str) {
    if (desktop && FILES[key]) {
      try {
        var result = desktop.write(FILES[key], str);
        if (result && result.ok) return true;
        console.error('[storage] portable file write failed', result && result.error);
        if (ITL.toast) ITL.toast.error('Data was not saved', (result && result.error) || 'The DATA folder is unavailable. Check the USB drive and write permissions.', 12000);
        return false;
      } catch (e) {
        console.error('[storage] portable file write failed', e);
        if (ITL.toast) ITL.toast.error('Data was not saved', e.message || 'The DATA folder is unavailable.', 12000);
        return false;
      }
    }
    if (available) {
      try { w.localStorage.setItem(key, str); return true; }
      catch (e) {
        memory[key] = str;
        if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
          if (ITL.toast) ITL.toast.error('Storage full', 'Browser storage limit reached. Export a backup and clear old activity logs.');
        }
        return false;
      }
    }
    memory[key] = str;
    return true;
  }

  function rawRemove(key) {
    if (desktop && FILES[key]) {
      // Keep a valid empty/default file rather than unlinking user data.
      rawSet(key, JSON.stringify(DEFAULTS[key] !== undefined ? DEFAULTS[key] : null));
      return;
    }
    if (available) { try { w.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
    delete memory[key];
  }

  /* ------------------------------------------------------------------- API */
  var storage = ITL.storage = {

    KEYS: KEYS,
    COLLECTION_KEYS: COLLECTION_KEYS,
    SCHEMA_VERSION: SCHEMA_VERSION,
    PREFIX: PREFIX,

    isAvailable: function () { return available; },
    isPortable: function () { return !!desktop; },
    dataFolder: function () { try { return desktop ? desktop.dataRoot() : ''; } catch (e) { return ''; } },
    openDataFolder: function () { if (desktop) desktop.openDataFolder(); },
    backupNow: function () { return desktop ? desktop.backupNow() : null; },
    listDataFiles: function () { return desktop ? desktop.list() : []; },

    /** Read a key. Returns the default (deep-cloned) when missing/corrupt. */
    get: function (key, fallback) {
      if (cache[key] !== undefined) return cache[key];
      var raw = rawGet(key);
      var dflt = fallback !== undefined ? fallback
        : (DEFAULTS[key] !== undefined ? ITL.utils.deepClone(DEFAULTS[key]) : null);
      if (raw === null || raw === undefined || raw === '') {
        cache[key] = dflt;
        return dflt;
      }
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(dflt) && !Array.isArray(parsed)) { cache[key] = dflt; return dflt; }
        if (dflt && !Array.isArray(dflt) && typeof dflt === 'object' &&
          (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
          cache[key] = dflt; return dflt;
        }
        cache[key] = parsed;
        return parsed;
      } catch (e) {
        console.warn('[storage] corrupt value for ' + key + ', using default.', e);
        cache[key] = dflt;
        return dflt;
      }
    },

    /** Write a key (full replace). */
    set: function (key, data) {
      cache[key] = data;
      var ok = rawSet(key, JSON.stringify(data === undefined ? null : data));
      storage._touch();
      storage._emit(key, data);
      return ok;
    },

    /** Shallow-merge into an object key. */
    update: function (key, patch) {
      var cur = storage.get(key);
      if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) cur = {};
      var next = Object.assign({}, cur, patch || {});
      storage.set(key, next);
      return next;
    },

    /** Remove a key entirely. */
    remove: function (key) {
      delete cache[key];
      rawRemove(key);
      storage._emit(key, null);
    },

    /** Reset a key back to its empty default (array -> [], object -> defaults). */
    clear: function (key) {
      var dflt = DEFAULTS[key] !== undefined ? ITL.utils.deepClone(DEFAULTS[key]) : null;
      storage.set(key, dflt);
      return dflt;
    },

    /** Wipe every application key. */
    clearAll: function (keepSettings) {
      var settings = keepSettings ? storage.get(KEYS.settings) : null;
      Object.keys(KEYS).forEach(function (k) {
        var key = KEYS[k];
        if (keepSettings && key === KEYS.settings) return;
        if (key === KEYS.ui) return; // preserve sidebar/theme UI prefs
        storage.clear(key);
      });
      if (settings) storage.set(KEYS.settings, settings);
      cache = Object.create(null);
      storage._emit('*', null);
    },

    /* ---------------------------------------------------- collection helpers */

    /** Get an array collection. */
    list: function (key) {
      var v = storage.get(key);
      return Array.isArray(v) ? v : [];
    },

    /** Find one record by id field. */
    find: function (key, id, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) return rows[i];
      }
      return null;
    },

    /** Insert a record at the front (newest first). */
    insert: function (key, record) {
      var rows = storage.list(key);
      rows.unshift(record);
      storage.set(key, rows);
      return record;
    },

    /** Insert many records. */
    insertMany: function (key, records) {
      if (!records || !records.length) return 0;
      var rows = storage.list(key);
      rows = records.concat(rows);
      storage.set(key, rows);
      return records.length;
    },

    /** Replace a record matched by id. Returns updated record or null. */
    replace: function (key, id, record, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) {
          rows[i] = record;
          storage.set(key, rows);
          return record;
        }
      }
      return null;
    },

    /** Patch a record matched by id. */
    patch: function (key, id, changes, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) {
          rows[i] = Object.assign({}, rows[i], changes);
          storage.set(key, rows);
          return rows[i];
        }
      }
      return null;
    },

    /** Delete a record by id. Returns true when removed. */
    delete: function (key, id, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      var next = rows.filter(function (r) { return String(r[idField]) !== String(id); });
      if (next.length === rows.length) return false;
      storage.set(key, next);
      return true;
    },

    /** Number of records in each collection. */
    counts: function () {
      return {
        pcs: storage.list(KEYS.pcs).length,
        staff: storage.list(KEYS.staff).length,
        maintenance: storage.list(KEYS.maintenance).length,
        store: storage.list(KEYS.store).length,
        stockTx: storage.list(KEYS.stockTx).length,
        purchases: storage.list(KEYS.purchases).length,
        logs: storage.list(KEYS.logs).length,
        imports: storage.list(KEYS.importHistory).length
      };
    },

    /** True when no operational records exist at all. */
    isEmpty: function () {
      var c = storage.counts();
      return !(c.pcs || c.staff || c.maintenance || c.store || c.purchases || c.stockTx);
    },

    /** Approximate bytes used by application keys. */
    usage: function () {
      var total = 0, per = {};
      Object.keys(KEYS).forEach(function (k) {
        var key = KEYS[k];
        var v = rawGet(key);
        var size = v ? v.length * 2 : 0; // UTF-16 approximation
        per[key] = size;
        total += size;
      });
      // JSON-file mode is limited by available disk space, not browser quota.
      var quota = desktop ? 0 : 5 * 1024 * 1024;
      return { bytes: total, per: per, quota: quota, percent: quota ? Math.min(100, (total / quota) * 100) : 0 };
    },

    /** Export everything as a plain object (for JSON backup). */
    exportAll: function () {
      var out = {};
      Object.keys(KEYS).forEach(function (k) { out[KEYS[k]] = storage.get(KEYS[k]); });
      return out;
    },

    /* ---------------------------------------------------------------- events */
    _subs: [],
    subscribe: function (fn) {
      storage._subs.push(fn);
      return function () {
        var i = storage._subs.indexOf(fn);
        if (i >= 0) storage._subs.splice(i, 1);
      };
    },
    _emit: function (key, data) {
      storage._subs.slice().forEach(function (fn) {
        try { fn(key, data); } catch (e) { console.error('[storage] subscriber error', e); }
      });
    },

    _touch: function () {
      // Track last-write timestamp without recursing through set()
      try {
        var meta = storage.get(KEYS.meta) || {};
        meta.lastWrite = new Date().toISOString();
        if (!meta.createdAt) meta.createdAt = meta.lastWrite;
        meta.schemaVersion = SCHEMA_VERSION;
        cache[KEYS.meta] = meta;
        rawSet(KEYS.meta, JSON.stringify(meta));
      } catch (e) { /* non-fatal */ }
    },

    /** Drop the in-memory parse cache (after a restore, for example). */
    invalidate: function () { cache = Object.create(null); },

    /**
     * Validate and repair stored structures on boot.
     * Returns a list of human readable repair notes.
     */
    validateAll: function () {
      var notes = [];
      COLLECTION_KEYS.forEach(function (key) {
        var raw = rawGet(key);
        if (raw === null) return;
        var val;
        try { val = JSON.parse(raw); }
        catch (e) { storage.clear(key); notes.push('Reset unreadable data in ' + key); return; }
        if (!Array.isArray(val)) { storage.clear(key); notes.push('Reset malformed collection ' + key); return; }
        var cleaned = val.filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r); });
        if (cleaned.length !== val.length) {
          notes.push('Removed ' + (val.length - cleaned.length) + ' invalid row(s) from ' + key);
          storage.set(key, cleaned);
        } else {
          cache[key] = cleaned;
        }
      });

      // settings must be a plain object with all default fields present
      var s = storage.get(KEYS.settings);
      if (!s || typeof s !== 'object' || Array.isArray(s)) {
        s = ITL.utils.deepClone(DEFAULTS[KEYS.settings]);
        notes.push('Restored default settings');
      }
      var merged = Object.assign({}, DEFAULTS[KEYS.settings], s);
      if (!Array.isArray(merged.labs) || !merged.labs.length) merged.labs = ['Lab 1', 'Lab 2', 'Lab 3'];
      storage.set(KEYS.settings, merged);

      var meta = storage.get(KEYS.meta) || {};
      if (!meta.createdAt) { meta.createdAt = new Date().toISOString(); }
      meta.schemaVersion = SCHEMA_VERSION;
      storage.set(KEYS.meta, meta);

      return notes;
    },

    defaults: function (key) {
      return DEFAULTS[key] !== undefined ? ITL.utils.deepClone(DEFAULTS[key]) : null;
    }
  };

  /* Keep tabs in sync if the same app is open twice in one browser. */
  w.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    delete cache[e.key];
    storage._emit(e.key, null);
  });

})(window);
