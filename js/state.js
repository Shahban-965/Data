/* ==========================================================================
   state.js — domain constants, record factories, derived data selectors
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  /* --------------------------------------------------------- CONSTANT SETS */
  var C = ITL.constants = {

    PC_STATUS: ['Working', 'Pending', 'Faulty', 'Hold', 'Retired'],

    PC_STATUS_TONE: {
      'Working': 'success',
      'Pending': 'warn',
      'Faulty': 'danger',
      'Hold': 'info',
      'Retired': 'neutral'
    },

    MAINT_STATUS: ['Pending', 'In Progress', 'Resolved', 'Cancelled'],

    MAINT_STATUS_TONE: {
      'Pending': 'warn',
      'In Progress': 'info',
      'Resolved': 'success',
      'Cancelled': 'neutral'
    },

    PROBLEM_CATEGORIES: [
      'Hardware', 'Software', 'Windows', 'Network', 'Keyboard', 'Mouse',
      'Monitor/LCD', 'RAM', 'HDD', 'SSD', 'Power', 'Cable', 'Ethernet',
      'Motherboard', 'Other'
    ],

    STORE_CATEGORIES: [
      'LCD', 'Keyboard', 'Mouse', 'Ethernet Cable', 'Ethernet Connector',
      'Power Cable', 'VGA Cable', 'RAM', 'HDD', 'SSD', 'Motherboard',
      'Power Supply', 'Desktop', 'Other'
    ],

    STORE_STATUS: ['Available', 'Low Stock', 'Out of Stock', 'Faulty', 'Hold'],

    STORE_STATUS_TONE: {
      'Available': 'success',
      'Low Stock': 'warn',
      'Out of Stock': 'danger',
      'Faulty': 'danger',
      'Hold': 'info'
    },

    CONDITIONS: ['New', 'Used', 'Refurbished', 'Faulty', 'Damaged'],

    UNITS: ['Piece', 'Box', 'Meter', 'Roll', 'Pack', 'Set', 'Unit'],

    TX_TYPES: ['Stock In', 'Stock Out', 'Adjustment', 'Return'],

    TX_TONE: {
      'Stock In': 'success',
      'Stock Out': 'danger',
      'Adjustment': 'info',
      'Return': 'purple'
    },

    PURCHASE_STATUS: ['Ordered', 'Received', 'Partially Received', 'Pending', 'Cancelled'],

    PURCHASE_STATUS_TONE: {
      'Ordered': 'info',
      'Received': 'success',
      'Partially Received': 'warn',
      'Pending': 'warn',
      'Cancelled': 'neutral'
    },

    STAFF_STATUS: ['Working', 'Pending', 'Faulty', 'Hold', 'Retired'],

    OS_OPTIONS: [
      'Windows 11 Pro', 'Windows 11 Home', 'Windows 10 Pro', 'Windows 10 Home',
      'Windows 8.1', 'Windows 7', 'Windows Server 2019', 'Windows Server 2022',
      'Ubuntu', 'Linux Mint', 'macOS', 'Other'
    ],

    RAM_OPTIONS: ['2 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB', '24 GB', '32 GB', '64 GB'],

    STORAGE_OPTIONS: [
      '128 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD',
      '250 GB HDD', '320 GB HDD', '500 GB HDD', '1 TB HDD', '2 TB HDD',
      '128 GB SSD + 500 GB HDD', '256 GB SSD + 1 TB HDD'
    ],

    PROCESSOR_OPTIONS: [
      'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
      'Intel Pentium', 'Intel Celeron', 'Intel Xeon',
      'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'AMD Athlon'
    ],

    PAGE_SIZES: [10, 25, 50, 100, 'All']
  };

  /** Labs come from settings so they stay configurable. */
  C.labs = function () {
    var s = S.get(K.settings) || {};
    var labs = Array.isArray(s.labs) && s.labs.length ? s.labs : ['Lab 1', 'Lab 2', 'Lab 3'];
    return labs.slice();
  };

  /* --------------------------------------------------------------- FACTORIES */
  /**
   * Accept a supplied ID only when it matches the pattern this application
   * generates (PC-0001). Anything else — a row number from an imported
   * spreadsheet, a foreign code — is discarded and a fresh ID is issued.
   */
  function safeId(prefix, supplied, collection) {
    var v = U.str(supplied).trim();
    if (v && new RegExp('^' + prefix + '-\\d{3,}$', 'i').test(v)) return v.toUpperCase();
    return U.nextId(prefix, collection);
  }

  var F = ITL.factory = {

    pc: function (d) {
      d = d || {};
      var now = U.nowISO();
      return {
        id: safeId('PC', d.id, S.list(K.pcs)),
        serialNumber: U.str(d.serialNumber),
        pcName: U.str(d.pcName),
        password: d.password === undefined ? '' : String(d.password),
        lab: U.str(d.lab) || (S.get(K.settings).defaultLab || 'Lab 1'),
        processor: U.str(d.processor),
        ram: U.str(d.ram),
        storage: U.str(d.storage),
        os: U.str(d.os),
        software: U.str(d.software),
        status: U.str(d.status) || 'Working',
        remarks: U.str(d.remarks),
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now
      };
    },

    staff: function (d) {
      d = d || {};
      var now = U.nowISO();
      return {
        id: safeId('STF', d.id, S.list(K.staff)),
        pcName: U.str(d.pcName),
        staffName: U.str(d.staffName),
        department: U.str(d.department),
        password: d.password === undefined ? '' : String(d.password),
        serialNumber: U.str(d.serialNumber),
        processor: U.str(d.processor),
        ram: U.str(d.ram),
        storage: U.str(d.storage),
        os: U.str(d.os),
        software: U.str(d.software),
        status: U.str(d.status) || 'Working',
        remarks: U.str(d.remarks),
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now
      };
    },

    maintenance: function (d) {
      d = d || {};
      var now = U.nowISO();
      return {
        id: safeId('MNT', d.id, S.list(K.maintenance)),
        complaintDate: d.complaintDate || U.today(),
        pcId: U.str(d.pcId),
        pcName: U.str(d.pcName),
        lab: U.str(d.lab),
        problem: U.str(d.problem),
        category: U.str(d.category) || 'Other',
        oldPart: U.str(d.oldPart),
        newPart: U.str(d.newPart),
        newPartItemId: U.str(d.newPartItemId),
        quantity: U.int(d.quantity, 0),
        repairDate: d.repairDate || '',
        status: U.str(d.status) || 'Pending',
        technician: U.str(d.technician),
        remarks: U.str(d.remarks),
        stockTxId: U.str(d.stockTxId),
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now
      };
    },

    storeItem: function (d) {
      d = d || {};
      var now = U.nowISO();
      var s = S.get(K.settings) || {};
      return {
        id: safeId('ITM', d.id, S.list(K.store)),
        itemName: U.str(d.itemName),
        category: U.str(d.category) || 'Other',
        brand: U.str(d.brand),
        model: U.str(d.model),
        quantity: Math.max(0, U.int(d.quantity, 0)),
        unit: U.str(d.unit) || 'Piece',
        minStock: Math.max(0, U.int(d.minStock, U.int(s.lowStockThreshold, 5))),
        condition: U.str(d.condition) || 'New',
        location: U.str(d.location),
        status: U.str(d.status) || '',
        purchaseDate: d.purchaseDate || '',
        remarks: U.str(d.remarks),
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now
      };
    },

    stockTx: function (d) {
      d = d || {};
      return {
        id: safeId('TX', d.id, S.list(K.stockTx)),
        itemId: U.str(d.itemId),
        itemName: U.str(d.itemName),
        type: U.str(d.type) || 'Adjustment',
        quantity: U.int(d.quantity, 0),
        prevQty: U.int(d.prevQty, 0),
        newQty: U.int(d.newQty, 0),
        reason: U.str(d.reason),
        maintenanceId: U.str(d.maintenanceId),
        purchaseId: U.str(d.purchaseId),
        date: d.date || U.today(),
        remarks: U.str(d.remarks),
        createdAt: d.createdAt || U.nowISO()
      };
    },

    purchase: function (d) {
      d = d || {};
      var now = U.nowISO();
      return {
        id: safeId('PUR', d.id, S.list(K.purchases)),
        purchaseDate: d.purchaseDate || U.today(),
        supplier: U.str(d.supplier),
        item: U.str(d.item),
        processor: U.str(d.processor),
        ram: U.str(d.ram),
        storage: U.str(d.storage),
        quantity: Math.max(0, U.int(d.quantity, 1)),
        keyboard: U.int(d.keyboard, 0),
        mouse: U.int(d.mouse, 0),
        lcd: U.int(d.lcd, 0),
        ethernetConnector: U.int(d.ethernetConnector, 0),
        powerCable: U.int(d.powerCable, 0),
        vgaCable: U.int(d.vgaCable, 0),
        unitPrice: U.num(d.unitPrice, 0),
        status: U.str(d.status) || 'Received',
        remarks: U.str(d.remarks),
        addedToStore: !!d.addedToStore,
        storeItemId: U.str(d.storeItemId),
        stockTxIds: Array.isArray(d.stockTxIds) ? d.stockTxIds : [],
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now
      };
    }
  };

  /* ---------------------------------------------------------- SELECTORS/API */
  var D = ITL.data = {

    pcs: function () { return S.list(K.pcs); },
    staff: function () { return S.list(K.staff); },
    maintenance: function () { return S.list(K.maintenance); },
    store: function () { return S.list(K.store); },
    stockTx: function () { return S.list(K.stockTx); },
    purchases: function () { return S.list(K.purchases); },
    logs: function () { return S.list(K.logs); },

    pc: function (id) { return S.find(K.pcs, id); },
    staffMember: function (id) { return S.find(K.staff, id); },
    maint: function (id) { return S.find(K.maintenance, id); },
    item: function (id) { return S.find(K.store, id); },
    purchase: function (id) { return S.find(K.purchases, id); },

    /** Find a PC by name (optionally scoped to a lab). */
    pcByName: function (name, lab) {
      var n = U.normKey(name);
      if (!n) return null;
      var rows = D.pcs();
      for (var i = 0; i < rows.length; i++) {
        if (U.normKey(rows[i].pcName) === n && (!lab || U.normKey(rows[i].lab) === U.normKey(lab))) return rows[i];
      }
      return null;
    },

    /** Find a store item by name (case/space insensitive). */
    itemByName: function (name) {
      var n = U.normKey(name);
      if (!n) return null;
      var rows = D.store();
      for (var i = 0; i < rows.length; i++) {
        if (U.normKey(rows[i].itemName) === n) return rows[i];
      }
      return null;
    },

    /** Derived status of a store item based on quantity vs. minimum. */
    itemStatus: function (item) {
      if (!item) return 'Out of Stock';
      // Manual override statuses win
      if (item.status === 'Faulty' || item.status === 'Hold') return item.status;
      var q = U.int(item.quantity, 0);
      var min = U.int(item.minStock, U.int((S.get(K.settings) || {}).lowStockThreshold, 5));
      if (q <= 0) return 'Out of Stock';
      if (q <= min) return 'Low Stock';
      return 'Available';
    },

    /** Maintenance records attached to a PC (by id or name). */
    maintenanceForPc: function (pc) {
      if (!pc) return [];
      var pid = String(pc.id);
      var pname = U.normKey(pc.pcName);
      return D.maintenance().filter(function (m) {
        return String(m.pcId) === pid || (pname && U.normKey(m.pcName) === pname);
      });
    },

    /** Stock transactions for one item. */
    txForItem: function (itemId) {
      return D.stockTx().filter(function (t) { return String(t.itemId) === String(itemId); });
    },

    /* --------------------------------------------------------- STATISTICS */
    stats: function () {
      var pcs = D.pcs(), staff = D.staff(), maint = D.maintenance(),
        store = D.store(), purch = D.purchases(), tx = D.stockTx();

      var pcStatus = {};
      C.PC_STATUS.forEach(function (s) { pcStatus[s] = 0; });
      pcs.forEach(function (p) {
        var s = p.status && pcStatus[p.status] !== undefined ? p.status : 'Working';
        pcStatus[s]++;
      });

      var labCounts = {};
      C.labs().forEach(function (l) { labCounts[l] = 0; });
      pcs.forEach(function (p) {
        var l = U.str(p.lab) || 'Unassigned';
        labCounts[l] = (labCounts[l] || 0) + 1;
      });

      var mStatus = {};
      C.MAINT_STATUS.forEach(function (s) { mStatus[s] = 0; });
      maint.forEach(function (m) {
        var s = m.status && mStatus[m.status] !== undefined ? m.status : 'Pending';
        mStatus[s]++;
      });

      var monthMaint = maint.filter(function (m) { return U.isSameMonth(m.complaintDate); }).length;

      var sStatus = { 'Available': 0, 'Low Stock': 0, 'Out of Stock': 0, 'Faulty': 0, 'Hold': 0 };
      var totalUnits = 0;
      store.forEach(function (it) {
        var st = D.itemStatus(it);
        if (sStatus[st] === undefined) sStatus[st] = 0;
        sStatus[st]++;
        totalUnits += U.int(it.quantity, 0);
      });

      var monthPurch = purch.filter(function (p) { return U.isSameMonth(p.purchaseDate); }).length;
      var purchUnits = purch.reduce(function (a, p) { return a + U.int(p.quantity, 0); }, 0);

      var staffStatus = {};
      C.STAFF_STATUS.forEach(function (s) { staffStatus[s] = 0; });
      staff.forEach(function (p) {
        var s = p.status && staffStatus[p.status] !== undefined ? p.status : 'Working';
        staffStatus[s]++;
      });

      return {
        pc: {
          total: pcs.length,
          working: pcStatus['Working'] || 0,
          pending: pcStatus['Pending'] || 0,
          faulty: pcStatus['Faulty'] || 0,
          hold: pcStatus['Hold'] || 0,
          retired: pcStatus['Retired'] || 0,
          byStatus: pcStatus,
          byLab: labCounts
        },
        staff: { total: staff.length, byStatus: staffStatus },
        maintenance: {
          total: maint.length,
          pending: mStatus['Pending'] || 0,
          inProgress: mStatus['In Progress'] || 0,
          resolved: mStatus['Resolved'] || 0,
          cancelled: mStatus['Cancelled'] || 0,
          thisMonth: monthMaint,
          byStatus: mStatus
        },
        store: {
          total: store.length,
          available: sStatus['Available'] || 0,
          lowStock: sStatus['Low Stock'] || 0,
          outOfStock: sStatus['Out of Stock'] || 0,
          faulty: sStatus['Faulty'] || 0,
          hold: sStatus['Hold'] || 0,
          totalUnits: totalUnits,
          byStatus: sStatus
        },
        purchases: {
          total: purch.length,
          thisMonth: monthPurch,
          units: purchUnits
        },
        transactions: { total: tx.length }
      };
    },

    /** Real alerts derived from stored data. */
    alerts: function (limit) {
      var out = [];
      var store = D.store();
      store.forEach(function (it) {
        var st = D.itemStatus(it);
        if (st === 'Out of Stock') {
          out.push({
            tone: 'danger', kind: 'store', icon: 'package',
            title: 'OUT OF STOCK',
            name: it.itemName || it.id,
            desc: (it.itemName || it.id) + ' — 0 ' + (it.unit || 'Piece') + ' remaining',
            recordId: it.id, page: 'store', priority: 1
          });
        } else if (st === 'Low Stock') {
          out.push({
            tone: 'warn', kind: 'store', icon: 'package',
            title: 'LOW STOCK',
            name: it.itemName || it.id,
            desc: (it.itemName || it.id) + ' — ' + U.int(it.quantity) + ' remaining (min ' + U.int(it.minStock) + ')',
            recordId: it.id, page: 'store', priority: 2
          });
        }
      });

      D.pcs().forEach(function (p) {
        if (p.status === 'Faulty') {
          out.push({
            tone: 'danger', kind: 'pc', icon: 'desktop',
            title: 'FAULTY PC',
            name: p.pcName || p.id,
            desc: (p.pcName || p.id) + ' — ' + (p.lab || 'Unassigned'),
            recordId: p.id, page: 'inventory', priority: 1
          });
        }
      });

      D.maintenance().forEach(function (m) {
        if (m.status === 'Pending') {
          out.push({
            tone: 'warn', kind: 'maintenance', icon: 'wrench',
            title: 'PENDING MAINTENANCE',
            name: m.pcName || m.id,
            desc: (m.pcName || m.id) + ' — ' + (m.problem || m.category || 'Fault reported'),
            recordId: m.id, page: 'maintenance', priority: 2,
            date: m.complaintDate
          });
        } else if (m.status === 'In Progress') {
          out.push({
            tone: 'info', kind: 'maintenance', icon: 'tool',
            title: 'IN PROGRESS',
            name: m.pcName || m.id,
            desc: (m.pcName || m.id) + ' — ' + (m.problem || m.category || 'Repair underway'),
            recordId: m.id, page: 'maintenance', priority: 3,
            date: m.complaintDate
          });
        }
      });

      out.sort(function (a, b) { return a.priority - b.priority; });
      return limit ? out.slice(0, limit) : out;
    },

    /** Monthly maintenance counts for the trailing N months. */
    monthlyMaintenance: function (months) {
      months = months || 6;
      var res = [], now = new Date();
      var rows = D.maintenance();
      for (var i = months - 1; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        var c = rows.filter(function (m) { return U.monthKey(m.complaintDate) === key; }).length;
        res.push({ key: key, label: U.MONTHS[d.getMonth()], value: c, full: U.monthLabel(key) });
      }
      return res;
    },

    /** Monthly purchase counts for the trailing N months. */
    monthlyPurchases: function (months) {
      months = months || 6;
      var res = [], now = new Date();
      var rows = D.purchases();
      for (var i = months - 1; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        var list = rows.filter(function (p) { return U.monthKey(p.purchaseDate) === key; });
        var units = list.reduce(function (a, p) { return a + U.int(p.quantity, 0); }, 0);
        res.push({ key: key, label: U.MONTHS[d.getMonth()], value: list.length, units: units, full: U.monthLabel(key) });
      }
      return res;
    }
  };

  /* ------------------------------------------------------- runtime app state */
  ITL.state = {
    currentPage: 'dashboard',
    pageParams: {},
    booted: false,
    busy: false,
    /** Per-page view state (filters/sort/paging) kept in memory. */
    views: {}
  };

  ITL.state.view = function (name, init) {
    if (!ITL.state.views[name]) ITL.state.views[name] = Object.assign({
      search: '', page: 1, sortKey: '', sortDir: 'asc', filters: {}
    }, init || {});
    return ITL.state.views[name];
  };

})(window);
