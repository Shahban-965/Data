/* ==========================================================================
   schemas.js — single source of truth for record fields.
   Drives: Excel export columns, Excel import column mapping, report layouts.
   type: text | number | date | password | multiline
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};

  function f(key, label, type, width, aliases) {
    return { key: key, label: label, type: type || 'text', width: width || 16, aliases: aliases || [] };
  }

  var schemas = ITL.schemas = {

    pcs: {
      id: 'pcs',
      label: 'PC Inventory',
      sheetName: 'PC Inventory',
      reportTitle: 'PC INVENTORY REPORT',
      idPrefix: 'PC',
      storageKey: 'itlab_pcs',
      fields: [
        f('id', 'ID', 'text', 12, ['pc id', 'pcid', 'record id', 'sr', 'sr no', 'sr#', 's no', 'serial', 'code']),
        f('serialNumber', 'Serial Number', 'text', 18, ['serial no', 'serial number', 'sn', 's/n', 'serialno', 'system serial', 'service tag', 'asset tag', 'asset no', 'sr no', 'sr. no', 'sr#', 'serial']),
        f('pcName', 'PC Name', 'text', 20, ['pc name', 'pcname', 'computer name', 'system name', 'machine name', 'hostname', 'host name', 'name', 'pc', 'computer']),
        f('password', 'Password', 'password', 14, ['password', 'pass', 'pwd', 'pc password', 'login password', 'system password']),
        f('lab', 'Lab', 'text', 12, ['lab', 'lab name', 'labno', 'lab no', 'lab #', 'location', 'room', 'lab number']),
        f('processor', 'Processor', 'text', 20, ['processor', 'cpu', 'proc', 'processor type', 'chip']),
        f('ram', 'RAM', 'text', 12, ['ram', 'memory', 'ram size', 'memory size', 'ram gb']),
        f('storage', 'Storage', 'text', 20, ['storage', 'hdd', 'ssd', 'disk', 'hard disk', 'hard drive', 'drive', 'storage capacity']),
        f('os', 'Operating System', 'text', 20, ['os', 'operating system', 'windows', 'window', 'os version', 'system os']),
        f('software', 'Software Installed', 'text', 30, ['software', 'software installed', 'installed software', 'applications', 'apps', 'programs']),
        f('status', 'Status', 'text', 13, ['status', 'condition', 'pc status', 'current status', 'state', 'working status']),
        f('remarks', 'Remarks', 'multiline', 28, ['remarks', 'remark', 'note', 'notes', 'comment', 'comments', 'description']),
        f('createdAt', 'Created At', 'date', 15, ['created at', 'created', 'created date', 'entry date', 'date added']),
        f('updatedAt', 'Updated At', 'date', 15, ['updated at', 'updated', 'modified', 'last updated', 'modified date'])
      ],
      required: ['pcName'],
      duplicateKeys: ['serialNumber', 'pcName+lab']
    },

    staff: {
      id: 'staff',
      label: 'Staff Systems',
      sheetName: 'Staff Systems',
      reportTitle: 'STAFF SYSTEMS REPORT',
      idPrefix: 'STF',
      storageKey: 'itlab_staff',
      fields: [
        f('id', 'ID', 'text', 12, ['staff id', 'id', 'record id', 'sr', 'sr no', 'code']),
        f('pcName', 'PC Name', 'text', 20, ['pc name', 'pcname', 'computer name', 'system name', 'machine name', 'hostname', 'name', 'pc']),
        f('staffName', 'Staff / User Name', 'text', 22, ['staff name', 'staff', 'user name', 'username', 'user', 'employee', 'employee name', 'assigned to', 'staff user name', 'staff/user name', 'person']),
        f('department', 'Department', 'text', 18, ['department', 'dept', 'section', 'division', 'designation', 'office']),
        f('password', 'Password', 'password', 14, ['password', 'pass', 'pwd', 'login password', 'system password']),
        f('serialNumber', 'Serial Number', 'text', 18, ['serial no', 'serial number', 'sn', 's/n', 'asset tag', 'service tag', 'sr no', 'sr. no', 'serial']),
        f('processor', 'Processor', 'text', 20, ['processor', 'cpu', 'proc']),
        f('ram', 'RAM', 'text', 12, ['ram', 'memory', 'ram size']),
        f('storage', 'Storage', 'text', 20, ['storage', 'hdd', 'ssd', 'disk', 'hard disk', 'drive']),
        f('os', 'Operating System', 'text', 20, ['os', 'operating system', 'windows', 'window']),
        f('software', 'Software Installed', 'text', 30, ['software', 'software installed', 'installed software', 'applications', 'apps']),
        f('status', 'Status', 'text', 13, ['status', 'condition', 'state', 'working status']),
        f('remarks', 'Remarks', 'multiline', 28, ['remarks', 'remark', 'note', 'notes', 'comment', 'comments']),
        f('createdAt', 'Created At', 'date', 15, ['created at', 'created', 'created date', 'entry date']),
        f('updatedAt', 'Updated At', 'date', 15, ['updated at', 'updated', 'modified', 'last updated'])
      ],
      required: ['pcName'],
      duplicateKeys: ['serialNumber', 'pcName']
    },

    maintenance: {
      id: 'maintenance',
      label: 'Maintenance',
      sheetName: 'Maintenance',
      reportTitle: 'MAINTENANCE REPORT',
      idPrefix: 'MNT',
      storageKey: 'itlab_maintenance',
      fields: [
        f('id', 'Maintenance ID', 'text', 15, ['maintenance id', 'id', 'complaint id', 'fault id', 'ticket', 'ticket no', 'sr', 'sr no']),
        f('complaintDate', 'Complaint Date', 'date', 15, ['complaint date', 'date', 'fault date', 'reported date', 'report date', 'issue date', 'complain date']),
        f('pcId', 'PC ID', 'text', 12, ['pc id', 'pcid', 'system id', 'machine id']),
        f('pcName', 'PC Name', 'text', 20, ['pc name', 'pcname', 'computer name', 'system name', 'machine', 'pc']),
        f('lab', 'Lab', 'text', 12, ['lab', 'lab name', 'location', 'room']),
        f('problem', 'Problem Description', 'multiline', 34, ['problem', 'problem description', 'fault', 'fault description', 'issue', 'complaint', 'description', 'detail', 'details']),
        f('category', 'Problem Category', 'text', 16, ['category', 'problem category', 'fault type', 'type', 'issue type', 'fault category']),
        f('oldPart', 'Old Part', 'text', 18, ['old part', 'removed part', 'faulty part', 'old item', 'replaced part']),
        f('newPart', 'New Part', 'text', 18, ['new part', 'replacement', 'replacement part', 'new item', 'part used', 'part issued']),
        f('quantity', 'Quantity', 'number', 10, ['quantity', 'qty', 'no of parts', 'count', 'nos']),
        f('repairDate', 'Repair Date', 'date', 14, ['repair date', 'resolved date', 'fixed date', 'completion date', 'closed date', 'done date']),
        f('status', 'Status', 'text', 14, ['status', 'state', 'progress', 'current status']),
        f('technician', 'Technician', 'text', 18, ['technician', 'engineer', 'assigned to', 'handled by', 'attended by', 'repaired by']),
        f('remarks', 'Remarks', 'multiline', 28, ['remarks', 'remark', 'note', 'notes', 'comment', 'comments']),
        f('createdAt', 'Created At', 'date', 15, ['created at', 'created', 'entry date']),
        f('updatedAt', 'Updated At', 'date', 15, ['updated at', 'updated', 'modified'])
      ],
      required: ['problem'],
      duplicateKeys: ['id']
    },

    store: {
      id: 'store',
      label: 'Store Inventory',
      sheetName: 'Store Inventory',
      reportTitle: 'STORE INVENTORY REPORT',
      idPrefix: 'ITM',
      storageKey: 'itlab_store',
      fields: [
        f('id', 'Item ID', 'text', 12, ['item id', 'id', 'code', 'item code', 'sr', 'sr no', 'stock id']),
        f('itemName', 'Item Name', 'text', 24, ['item name', 'item', 'name', 'product', 'product name', 'description', 'material', 'particulars', 'article']),
        f('category', 'Category', 'text', 17, ['category', 'type', 'item type', 'item category', 'group']),
        f('brand', 'Brand', 'text', 15, ['brand', 'make', 'manufacturer', 'company']),
        f('model', 'Model', 'text', 16, ['model', 'model no', 'model number', 'part no', 'part number']),
        f('quantity', 'Quantity', 'number', 11, ['quantity', 'qty', 'stock', 'available', 'available qty', 'balance', 'in stock', 'nos', 'count']),
        f('unit', 'Unit', 'text', 10, ['unit', 'uom', 'unit of measure', 'measure']),
        f('minStock', 'Min Stock Level', 'number', 14, ['min stock', 'minimum stock', 'min stock level', 'minimum stock level', 'reorder level', 'min qty', 'minimum quantity', 'threshold']),
        f('condition', 'Condition', 'text', 13, ['condition', 'item condition', 'quality', 'state']),
        f('location', 'Location', 'text', 16, ['location', 'shelf', 'rack', 'store location', 'place', 'bin']),
        f('status', 'Status', 'text', 14, ['status', 'stock status', 'availability']),
        f('purchaseDate', 'Purchase Date', 'date', 14, ['purchase date', 'date', 'received date', 'buy date', 'procurement date']),
        f('remarks', 'Remarks', 'multiline', 26, ['remarks', 'remark', 'note', 'notes', 'comment', 'comments']),
        f('createdAt', 'Created At', 'date', 15, ['created at', 'created', 'entry date']),
        f('updatedAt', 'Updated At', 'date', 15, ['updated at', 'updated', 'modified'])
      ],
      required: ['itemName'],
      duplicateKeys: ['itemName+category']
    },

    stockTx: {
      id: 'stockTx',
      label: 'Stock Transactions',
      sheetName: 'Stock Transactions',
      reportTitle: 'STOCK TRANSACTION REPORT',
      idPrefix: 'TX',
      storageKey: 'itlab_stock_transactions',
      fields: [
        f('id', 'Transaction ID', 'text', 15, ['transaction id', 'id', 'tx id', 'txn id']),
        f('date', 'Date', 'date', 14, ['date', 'transaction date', 'entry date']),
        f('itemId', 'Item ID', 'text', 12, ['item id', 'code']),
        f('itemName', 'Item Name', 'text', 24, ['item name', 'item', 'product', 'name']),
        f('type', 'Type', 'text', 14, ['type', 'transaction type', 'movement', 'action']),
        f('quantity', 'Quantity', 'number', 11, ['quantity', 'qty', 'nos']),
        f('prevQty', 'Previous Qty', 'number', 13, ['previous qty', 'previous quantity', 'old qty', 'opening']),
        f('newQty', 'New Qty', 'number', 11, ['new qty', 'new quantity', 'closing', 'balance']),
        f('reason', 'Reason', 'text', 24, ['reason', 'purpose', 'cause']),
        f('maintenanceId', 'Maintenance Ref', 'text', 16, ['maintenance id', 'maintenance ref', 'ticket']),
        f('purchaseId', 'Purchase Ref', 'text', 15, ['purchase id', 'purchase ref']),
        f('remarks', 'Remarks', 'multiline', 24, ['remarks', 'remark', 'note', 'notes'])
      ],
      required: ['itemName'],
      duplicateKeys: ['id']
    },

    purchases: {
      id: 'purchases',
      label: 'Purchases',
      sheetName: 'Purchases',
      reportTitle: 'PURCHASE REPORT',
      idPrefix: 'PUR',
      storageKey: 'itlab_purchases',
      fields: [
        f('id', 'Purchase ID', 'text', 14, ['purchase id', 'id', 'po', 'po no', 'po number', 'order id', 'sr', 'sr no', 'bill no', 'invoice no']),
        f('purchaseDate', 'Purchase Date', 'date', 15, ['purchase date', 'date', 'order date', 'bill date', 'invoice date', 'received date']),
        f('supplier', 'Supplier', 'text', 22, ['supplier', 'vendor', 'seller', 'party', 'shop', 'company', 'supplier name']),
        f('item', 'Item / Device', 'text', 24, ['item', 'device', 'item device', 'item/device', 'product', 'description', 'particulars', 'material', 'name']),
        f('processor', 'Processor', 'text', 18, ['processor', 'cpu']),
        f('ram', 'RAM', 'text', 11, ['ram', 'memory']),
        f('storage', 'Storage', 'text', 18, ['storage', 'hdd', 'ssd', 'disk']),
        f('quantity', 'Quantity', 'number', 10, ['quantity', 'qty', 'nos', 'count', 'total qty']),
        f('keyboard', 'Keyboard', 'number', 11, ['keyboard', 'keyboards', 'kb']),
        f('mouse', 'Mouse', 'number', 10, ['mouse', 'mice']),
        f('lcd', 'LCD', 'number', 9, ['lcd', 'monitor', 'monitors', 'screen', 'display']),
        f('ethernetConnector', 'Ethernet Connector', 'number', 17, ['ethernet connector', 'ethernet connectors', 'rj45', 'connector', 'connectors', 'rj 45']),
        f('powerCable', 'Power Cable', 'number', 13, ['power cable', 'power cables', 'power cord']),
        f('vgaCable', 'VGA Cable', 'number', 12, ['vga cable', 'vga cables', 'vga']),
        f('unitPrice', 'Unit Price', 'number', 12, ['unit price', 'price', 'rate', 'cost', 'amount per unit']),
        f('status', 'Status', 'text', 15, ['status', 'order status', 'delivery status']),
        f('remarks', 'Remarks', 'multiline', 26, ['remarks', 'remark', 'note', 'notes', 'comment', 'comments']),
        f('createdAt', 'Created At', 'date', 15, ['created at', 'created', 'entry date']),
        f('updatedAt', 'Updated At', 'date', 15, ['updated at', 'updated', 'modified'])
      ],
      required: ['item'],
      duplicateKeys: ['id']
    },

    logs: {
      id: 'logs',
      label: 'Activity Log',
      sheetName: 'Activity Log',
      reportTitle: 'ACTIVITY LOG REPORT',
      idPrefix: 'LOG',
      storageKey: 'itlab_activity_logs',
      fields: [
        f('date', 'Date', 'date', 14, ['date']),
        f('time', 'Time', 'text', 11, ['time']),
        f('module', 'Module', 'text', 16, ['module', 'section']),
        f('action', 'Action', 'text', 18, ['action', 'operation']),
        f('recordId', 'Record', 'text', 16, ['record', 'record id', 'reference']),
        f('description', 'Description', 'multiline', 46, ['description', 'detail', 'details', 'remarks'])
      ],
      required: [],
      duplicateKeys: []
    }
  };

  /** Fields shown in Excel exports (respecting settings). */
  schemas.exportFields = function (schemaId, opts) {
    opts = opts || {};
    var sc = schemas[schemaId];
    if (!sc) return [];
    var s = (ITL.settings && ITL.settings.get) ? ITL.settings.get() : {};
    return sc.fields.filter(function (fd) {
      if (fd.type === 'password' && !(opts.includePasswords || s.exportIncludePasswords)) return false;
      if ((fd.key === 'createdAt' || fd.key === 'updatedAt') &&
        !(opts.includeTimestamps !== undefined ? opts.includeTimestamps : s.exportIncludeTimestamps !== false)) return false;
      return true;
    });
  };

  /**
   * Build the normalized alias lookup used by the importer.
   * Each normalized header maps to an ORDERED list of candidate fields, so a
   * second column with an ambiguous name (e.g. "S.No" then "Sr. No.") can fall
   * back to the next best field instead of being dropped.
   */
  schemas.aliasMap = function (schemaId) {
    var sc = schemas[schemaId];
    var map = Object.create(null);
    if (!sc) return map;
    var norm = ITL.utils.normKey;
    function push(n, key, front) {
      if (!n) return;
      if (!map[n]) map[n] = [];
      if (map[n].indexOf(key) !== -1) return;
      if (front) map[n].unshift(key); else map[n].push(key);
    }
    sc.fields.forEach(function (fd) {
      push(norm(fd.key), fd.key, true);
      push(norm(fd.label), fd.key, true);
    });
    sc.fields.forEach(function (fd) {
      (fd.aliases || []).forEach(function (a) { push(norm(a), fd.key, false); });
    });
    return map;
  };

  /** True when a value looks like an ID this application generated. */
  schemas.isNativeId = function (schemaId, value) {
    var sc = schemas[schemaId];
    if (!sc || !sc.idPrefix) return false;
    return new RegExp('^' + sc.idPrefix + '-\\d{3,}$', 'i').test(String(value || '').trim());
  };

  schemas.field = function (schemaId, key) {
    var sc = schemas[schemaId];
    if (!sc) return null;
    for (var i = 0; i < sc.fields.length; i++) if (sc.fields[i].key === key) return sc.fields[i];
    return null;
  };

})(window);
