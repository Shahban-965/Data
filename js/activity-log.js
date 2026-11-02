/* ==========================================================================
   activity-log.js — audit trail for every meaningful operation
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  var MAX_ENTRIES = 3000;

  var A = ITL.activity = {

    /**
     * Record an activity entry.
     * module: 'PC Inventory' | 'Maintenance' | ...
     * action: 'Created' | 'Updated' | 'Deleted' | 'Stock Out' | ...
     */
    log: function (module, action, recordId, description) {
      try {
        var now = new Date();
        var entry = {
          id: U.uid('LOG'),
          timestamp: now.toISOString(),
          date: U.toDateInput(now),
          time: U.fmtTime(now),
          module: module || 'System',
          action: action || 'Action',
          recordId: recordId || '',
          description: description || ''
        };
        var rows = S.list(K.logs);
        rows.unshift(entry);
        if (rows.length > MAX_ENTRIES) rows = rows.slice(0, MAX_ENTRIES);
        S.set(K.logs, rows);
        return entry;
      } catch (e) {
        console.warn('[activity] failed to log', e);
        return null;
      }
    },

    list: function (limit) {
      var rows = S.list(K.logs);
      return limit ? rows.slice(0, limit) : rows;
    },

    /** Filter by module / action / date range / text. */
    query: function (opts) {
      opts = opts || {};
      var rows = S.list(K.logs);
      return rows.filter(function (r) {
        if (opts.module && r.module !== opts.module) return false;
        if (opts.action && r.action !== opts.action) return false;
        if (opts.from && U.parseDate(r.date) < U.parseDate(opts.from)) return false;
        if (opts.to && U.parseDate(r.date) > U.parseDate(opts.to)) return false;
        if (opts.search && !U.matches(r, opts.search, ['module', 'action', 'recordId', 'description'])) return false;
        return true;
      });
    },

    modules: function () { return U.uniqueValues(S.list(K.logs), 'module'); },
    actions: function () { return U.uniqueValues(S.list(K.logs), 'action'); },

    clear: function () {
      S.clear(K.logs);
      A.log('System', 'Cleared', '', 'Activity log cleared by user');
    },

    /** Icon + tone used by the timeline. */
    style: function (action) {
      var a = String(action || '').toLowerCase();
      if (a.indexOf('delete') >= 0 || a.indexOf('removed') >= 0) return { icon: 'trash', tone: 'danger' };
      if (a.indexOf('creat') >= 0 || a.indexOf('add') >= 0) return { icon: 'plusCircle', tone: 'success' };
      if (a.indexOf('updat') >= 0 || a.indexOf('edit') >= 0) return { icon: 'edit', tone: 'info' };
      if (a.indexOf('resolv') >= 0) return { icon: 'checkCircle', tone: 'success' };
      if (a.indexOf('stock out') >= 0 || a.indexOf('used') >= 0) return { icon: 'minusCircle', tone: 'warn' };
      if (a.indexOf('stock in') >= 0) return { icon: 'plusCircle', tone: 'success' };
      if (a.indexOf('import') >= 0) return { icon: 'upload', tone: 'purple' };
      if (a.indexOf('export') >= 0 || a.indexOf('download') >= 0) return { icon: 'download', tone: 'info' };
      if (a.indexOf('backup') >= 0) return { icon: 'save', tone: 'purple' };
      if (a.indexOf('restor') >= 0) return { icon: 'rotate', tone: 'warn' };
      return { icon: 'activity', tone: 'neutral' };
    }
  };

})(window);
