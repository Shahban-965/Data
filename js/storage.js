/* ==========================================================================
   storage.js — PERMANENT portable data layer (v2)

   There is NO in-memory database. Every read goes to the real DATA file and
   every write is confirmed on disk before the caller is told it succeeded.
   If the disk write fails, the previous on-disk value stays authoritative —
   the app never "pretends" a record was saved in RAM.

   Desktop (portable) : DATA/<name>.json  +  DATA/<name>.txt (text mirror)
   Browser preview    : localStorage (clearly labelled as preview only)
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};

  var PREFIX = 'itlab_';
  var SCHEMA_VERSION = 2;
  var DATA_ENGINE = 2;

  var desktop = w.shakeelDesktop || null;
  var FILES = {
    itlab_pcs: 'pcs.json', itlab_staff: 'staff.json',
    itlab_maintenance: 'maintenance.json', itlab_store: 'store.json',
    itlab_stock_transactions: 'stock-transactions.json',
    itlab_purchases: 'purchases.json', itlab_activity_logs: 'activity-logs.json',
    itlab_settings: 'settings.json', itlab_import_history: 'import-history.json',
    itlab_ui_state: 'ui-state.json', itlab_meta: 'meta.json'
  };

  var KEYS = {
    pcs: 'itlab_pcs', staff: 'itlab_staff', maintenance: 'itlab_maintenance',
    store: 'itlab_store', stockTx: 'itlab_stock_transactions',
    purchases: 'itlab_purchases', logs: 'itlab_activity_logs',
    settings: 'itlab_settings', importHistory: 'itlab_import_history',
    ui: 'itlab_ui_state', meta: 'itlab_meta'
  };

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
  DEFAULTS[KEYS.ui] = { sidebarCollapsed: false, lastPage: 'dashboard', view: null };
  DEFAULTS[KEYS.meta] = { schemaVersion: SCHEMA_VERSION, dataEngine: DATA_ENGINE, createdAt: null, lastWrite: null, writeCount: 0 };
  DEFAULTS[KEYS.settings] = {
    labName: 'IT Lab Management System',
    brandName: 'Shakeel Networking',
    orgName: 'VIP IT Labs',
    defaultLab: 'Lab 1',
    labs: ['Lab 1', 'Lab 2', 'Lab 3'],
    lowStockThreshold: 5,
    dateFormat: 'dd-MMM-yyyy',
    tablePageSize: 25,
    theme: 'light',
    adminName: 'Shakeel Ahmed',
    adminRole: 'Admin',
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

  /** Only ever used when localStorage itself is blocked in a browser preview.
   *  It is never the source of truth for the portable desktop build. */
  var emergencyMemory = Object.create(null);

  function clone(v) {
    if (v === null || v === undefined) return v;
    if (ITL.utils && ITL.utils.deepClone) return ITL.utils.deepClone(v);
    return JSON.parse(JSON.stringify(v));
  }

  function defaultFor(key, fallback) {
    return fallback !== undefined ? fallback
      : (DEFAULTS[key] !== undefined ? clone(DEFAULTS[key]) : null);
  }

  function warn(title, msg) {
    if (ITL.toast && ITL.toast.error) ITL.toast.error(title, msg, 12000);
    else if (console && console.error) console.error('[storage] ' + title + ': ' + msg);
  }

  /* ------------------------------------------------------------- raw I/O */
  function readRaw(key) {
    if (desktop && FILES[key]) {
      var value = desktop.read(FILES[key]);
      if (value && typeof value === 'object' && value.error) throw new Error(value.error);
      return typeof value === 'string' ? value : null;
    }
    if (available) {
      try { return w.localStorage.getItem(key); }
      catch (e) { return emergencyMemory[key] === undefined ? null : emergencyMemory[key]; }
    }
    return emergencyMemory[key] === undefined ? null : emergencyMemory[key];
  }

  function writeRaw(key, str) {
    if (desktop && FILES[key]) {
      var result;
      try { result = desktop.write(FILES[key], str); }
      catch (e) {
        console.error('[storage] portable file write failed', e);
        storage.lastSaveFailedAt = Date.now();
        warn('Data was not saved', e.message || 'The DATA folder is unavailable. Check the USB drive and write permissions.');
        return false;
      }
      if (result && result.ok) { storage.lastSaveFailedAt = 0; return true; }
      var reason = (result && result.error) || 'The DATA folder is unavailable. Nothing was written.';
      console.error('[storage] portable file write failed', reason);
      storage.lastSaveFailedAt = Date.now();
      warn('Data was not saved', reason);
      return false;
    }
    if (available) {
      try { w.localStorage.setItem(key, str); return true; }
      catch (e) {
        emergencyMemory[key] = str;
        if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
          warn('Browser preview storage full', 'Export a backup and clear old activity logs.');
        }
        return false;
      }
    }
    emergencyMemory[key] = str;
    warn('Preview only', 'This browser has no writable storage. Use the Windows portable build for permanent data.');
    return true;
  }

  /** Persist meta.json directly (never via set(), to avoid recursion). */
  function touchMeta(key) {
    var meta;
    try { meta = storage.get(KEYS.meta) || {}; }
    catch (e) { meta = {}; }
    var now = new Date().toISOString();
    if (!meta.createdAt) meta.createdAt = now;
    meta.schemaVersion = SCHEMA_VERSION;
    meta.dataEngine = DATA_ENGINE;
    meta.lastWrite = now;
    meta.writeCount = (Number(meta.writeCount) || 0) + 1;
    meta.lastKey = key;
    if (!writeRaw(KEYS.meta, JSON.stringify(meta))) {
      console.warn('[storage] meta.json could not be updated; the data file itself was saved.');
    }
  }

  function saveIfChanged(key, next) {
    var before;
    try { before = JSON.stringify(storage.get(key)); }
    catch (e) { before = null; }
    if (before === JSON.stringify(next)) return false;
    return storage.set(key, next);
  }

  /* ------------------------------------------------------------------- API */
  var storage = ITL.storage = {

    KEYS: KEYS,
    COLLECTION_KEYS: COLLECTION_KEYS,
    SCHEMA_VERSION: SCHEMA_VERSION,
    DATA_ENGINE: DATA_ENGINE,
    PREFIX: PREFIX,
    /** Timestamp of the most recent failed disk write (0 when all is well). */
    lastSaveFailedAt: 0,

    isAvailable: function () {
      if (!desktop) return available;
      var st = storage.status();
      return !!(st && st.ok && st.writable);
    },
    isPortable: function () { return !!desktop; },
    dataFolder: function () {
      try { return desktop ? desktop.dataRoot() : ''; }
      catch (e) { return ''; }
    },
    openDataFolder: function () { if (desktop) desktop.openDataFolder(); },
    backupNow: function () { return desktop ? desktop.backupNow() : null; },
    listDataFiles: function () { return desktop && desktop.list ? desktop.list() : []; },
    appInfo: function () { return desktop && desktop.appInfo ? desktop.appInfo() : null; },

    /** Boot: make sure every JSON file AND its .txt twin exist and are valid. */
    ensureFiles: function () {
      if (!desktop || !desktop.ensureDefaults) return null;
      var defaults = {};
      Object.keys(FILES).forEach(function (key) {
        defaults[FILES[key]] = JSON.stringify(DEFAULTS[key]);
      });
      try { return desktop.ensureDefaults(defaults); }
      catch (e) { console.error('[storage] ensureFiles failed', e); return { ok: false, error: e.message }; }
    },

    /** Disk health — the displayed "last saved" date comes from meta.json,
     *  which lives in DATA, not from the PC clock or a RAM variable. */
    status: function () {
      if (desktop && desktop.status) {
        try { return desktop.status(); }
        catch (e) { return { ok: false, writable: false, error: e.message, files: [] }; }
      }
      return { ok: available, writable: available, mode: 'browser-preview', files: [], lastWrite: null, writeCount: 0 };
    },

    /** Compare each .json with its .txt mirror. */
    verify: function () {
      if (desktop && desktop.verify) {
        try { return desktop.verify(); } catch (e) { return { ok: false, error: e.message, missing: [], mismatch: [] }; }
      }
      return { ok: true, missing: [], mismatch: [], checked: [], mode: 'browser-preview' };
    },

    /** Rewrite only damaged/missing JSON+TXT pairs. Safe to call on boot. */
    flush: function () {
      if (!desktop) return { ok: true, files: [], mode: 'browser-preview' };
      var v = storage.verify();
      var bad = (v.missing || []).concat(v.mismatch || []);
      var out = { ok: true, files: [], errors: [] };
      Object.keys(FILES).forEach(function (key) {
        var name = FILES[key], mirror = name.replace(/\.json$/i, '.txt');
        if (bad.indexOf(name) === -1 && bad.indexOf(mirror) === -1) return;
        var raw = readRaw(key);
        if (raw === null || raw === undefined) raw = JSON.stringify(DEFAULTS[key]);
        if (writeRaw(key, raw)) out.files.push(name);
        else { out.ok = false; out.errors.push(name); }
      });
      return out;
    },
    persistAll: function () { return storage.flush(); },

    /** Read a key. In portable mode this is ALWAYS a real disk read. */
    get: function (key, fallback) {
      var dflt = defaultFor(key, fallback);
      var raw;
      try { raw = readRaw(key); }
      catch (e) {
        console.error('[storage] read failed for ' + key, e);
        return dflt;
      }
      if (raw === null || raw === undefined || raw === '') {
        // A missing file is created immediately so DATA is always complete.
        if (desktop && FILES[key]) writeRaw(key, JSON.stringify(dflt));
        return dflt;
      }
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        console.warn('[storage] unreadable ' + key + '; the original was quarantined in DATA/backup/corrupt.', e);
        if (desktop && FILES[key]) writeRaw(key, JSON.stringify(dflt));
        return dflt;
      }
      if (Array.isArray(dflt) && !Array.isArray(parsed)) return dflt;
      if (dflt && !Array.isArray(dflt) && typeof dflt === 'object' &&
        (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) return dflt;
      return parsed;
    },

    /** Write a key (full replace). Returns false when the disk write failed —
     *  callers can then stop instead of believing the record was saved. */
    set: function (key, data) {
      var str = JSON.stringify(data === undefined ? null : data);
      if (!writeRaw(key, str)) return false;
      if (key !== KEYS.meta) touchMeta(key);
      storage._emit(key, data);
      return true;
    },

    /** Shallow-merge into an object key. */
    update: function (key, patch) {
      var cur = storage.get(key);
      if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) cur = {};
      var next = Object.assign({}, cur, patch || {});
      return storage.set(key, next) ? next : cur;
    },

    /** Keep a valid empty/default file rather than unlinking user data. */
    remove: function (key) {
      if (desktop && FILES[key]) {
        storage.clear(key);
        return;
      }
      if (available) { try { w.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
      delete emergencyMemory[key];
      storage._emit(key, null);
    },

    clear: function (key) {
      var dflt = defaultFor(key);
      storage.set(key, dflt);
      return dflt;
    },

    clearAll: function (keepSettings) {
      var settings = keepSettings ? storage.get(KEYS.settings) : null;
      Object.keys(KEYS).forEach(function (k) {
        var key = KEYS[k];
        if (keepSettings && key === KEYS.settings) return;
        if (key === KEYS.ui) return;
        storage.clear(key);
      });
      if (settings) storage.set(KEYS.settings, settings);
      storage._emit('*', null);
    },

    /* ---------------------------------------------------- collection helpers */
    list: function (key) {
      var v = storage.get(key);
      return Array.isArray(v) ? v : [];
    },

    find: function (key, id, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) return rows[i];
      }
      return null;
    },

    insert: function (key, record) {
      var rows = storage.list(key);
      rows.unshift(record);
      return storage.set(key, rows) ? record : null;
    },

    insertMany: function (key, records) {
      if (!records || !records.length) return 0;
      var rows = records.concat(storage.list(key));
      return storage.set(key, rows) ? records.length : 0;
    },

    replace: function (key, id, record, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) {
          rows[i] = record;
          return storage.set(key, rows) ? record : null;
        }
      }
      return null;
    },

    patch: function (key, id, changes, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][idField]) === String(id)) {
          var next = Object.assign({}, rows[i], changes);
          rows[i] = next;
          return storage.set(key, rows) ? next : null;
        }
      }
      return null;
    },

    delete: function (key, id, idField) {
      idField = idField || 'id';
      var rows = storage.list(key);
      var next = rows.filter(function (r) { return String(r[idField]) !== String(id); });
      if (next.length === rows.length) return false;
      return storage.set(key, next);
    },

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

    isEmpty: function () {
      var c = storage.counts();
      return !(c.pcs || c.staff || c.maintenance || c.store || c.purchases || c.stockTx);
    },

    /** Real bytes on disk (portable) or localStorage approximation (preview). */
    usage: function () {
      var total = 0, per = {};
      if (desktop && desktop.list) {
        var files = storage.listDataFiles() || [];
        files.forEach(function (f) { if (/\.json$/i.test(f.name)) total += f.bytes || 0; });
        Object.keys(FILES).forEach(function (key) {
          var hit = files.filter(function (f) { return f.name === FILES[key]; })[0];
          per[key] = hit ? hit.bytes : 0;
        });
        return { bytes: total, per: per, quota: 0, percent: 0, mode: 'disk' };
      }
      Object.keys(KEYS).forEach(function (k) {
        var key = KEYS[k];
        var v = readRaw(key);
        var size = v ? v.length * 2 : 0;
        per[key] = size;
        total += size;
      });
      var quota = 5 * 1024 * 1024;
      return { bytes: total, per: per, quota: quota, percent: Math.min(100, (total / quota) * 100), mode: 'browser-preview' };
    },

    exportAll: function () {
      var out = {};
      Object.keys(KEYS).forEach(function (k) { out[KEYS[k]] = storage.get(KEYS[k]); });
      return out;
    },

    /** Restore a full backup. Each key is written and verified individually. */
    importAll: function (data, keys) {
      var ok = true;
      (keys || Object.keys(KEYS)).forEach(function (k) {
        var key = KEYS[k];
        if (!data || data[key] === undefined) return;
        if (!storage.set(key, data[key])) ok = false;
      });
      return ok;
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

    /** Backwards-compatible no-op: there is no parse cache to clear any more. */
    invalidate: function () { return null; },

    /** Validate structures on boot. Corrupt data is quarantined by the main
     *  process and recovered from the .txt mirror — never silently deleted. */
    validateAll: function () {
      var notes = [];
      COLLECTION_KEYS.forEach(function (key) {
        var val = storage.get(key, []);
        if (!Array.isArray(val)) {
          storage.set(key, []);
          notes.push('Reset malformed collection ' + key + ' (original kept in DATA/backup/corrupt)');
          return;
        }
        var cleaned = val.filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r); });
        if (cleaned.length !== val.length) {
          notes.push('Removed ' + (val.length - cleaned.length) + ' invalid row(s) from ' + key);
          saveIfChanged(key, cleaned);
        }
      });

      var s = storage.get(KEYS.settings);
      if (!s || typeof s !== 'object' || Array.isArray(s)) {
        s = clone(DEFAULTS[KEYS.settings]);
        notes.push('Restored default settings');
      }
      var merged = Object.assign({}, DEFAULTS[KEYS.settings], s);
      delete merged.exportIncludeTimestamps;           // retired in v2
      if (!Array.isArray(merged.labs) || !merged.labs.length) merged.labs = ['Lab 1', 'Lab 2', 'Lab 3'];
      if (saveIfChanged(KEYS.settings, merged)) notes.push('Normalised settings on disk');

      var meta = storage.get(KEYS.meta) || {};
      if (!meta.createdAt) meta.createdAt = new Date().toISOString();
      meta.schemaVersion = SCHEMA_VERSION;
      meta.dataEngine = DATA_ENGINE;
      if (meta.writeCount === undefined) meta.writeCount = 0;
      saveIfChanged(KEYS.meta, meta);

      return notes;
    },

    defaults: function (key) { return defaultFor(key); }
  };

  /* Keep browser-preview tabs in sync. Portable mode is single-instance. */
  w.addEventListener('storage', function (e) {
    if (desktop) return;
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    storage._emit(e.key, null);
  });

})(window);
