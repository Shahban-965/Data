/* ==========================================================================
   excel.js — real .xlsx generation & import using SheetJS
   Produces professional business reports:
     row1 org title | row2 report title | row3 generated info | blank | headers
     + frozen header row, AutoFilter on the used table range, styled cells,
       readable column widths, real dates and numeric quantities.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;

  var X = ITL.excel = {};

  /* --------------------------------------------------------------- THEME */
  var T = {
    titleFill: '1F4E79',
    titleFont: 'FFFFFF',
    subFill: '2E75B6',
    subFont: 'FFFFFF',
    metaFont: '595959',
    headFill: 'D9E2F3',
    headFont: '1F3864',
    band: 'F4F7FC',
    grid: 'BFBFBF',
    soft: 'D9D9D9',
    sectionFill: 'EDF2FA'
  };

  var DATE_FMT = 'dd-mmm-yyyy';
  var NUM_FMT = '#,##0';
  var MONEY_FMT = '#,##0.00';

  function lib() {
    if (typeof w.XLSX === 'undefined') throw new Error('SheetJS (XLSX) library is not loaded.');
    return w.XLSX;
  }
  X.isReady = function () { return typeof w.XLSX !== 'undefined'; };

  function colLetter(n) { // 0-based -> A, B, ... AA
    var s = '';
    n = n + 1;
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  X.colLetter = colLetter;

  function border(color, style) {
    var b = { style: style || 'thin', color: { rgb: color || T.soft } };
    return { top: b, bottom: b, left: b, right: b };
  }

  /** Coerce any value into something Excel-safe (never [object Object]). */
  function safeValue(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
      if (Array.isArray(v)) return v.join(', ');
      try { return JSON.stringify(v); } catch (e) { return ''; }
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return v;
  }

  /**
   * Build one worksheet.
   * spec = {
   *   sheetName, orgTitle, reportTitle, metaLine,
   *   columns: [{key,label,type,width}],
   *   rows: [obj],
   *   totals: bool | [keys],
   *   preRows: [[...]]  extra rows between meta and header (rare)
   * }
   */
  X.buildSheet = function (spec) {
    var XLSX = lib();
    var cols = spec.columns || [];
    var rows = spec.rows || [];
    var nCols = Math.max(1, cols.length);
    var lastColL = colLetter(nCols - 1);

    var aoa = [];
    aoa.push([spec.orgTitle || 'IT LAB MANAGEMENT SYSTEM']);
    aoa.push([spec.reportTitle || 'REPORT']);
    aoa.push([spec.metaLine || ('Generated: ' + U.fmtDate(new Date(), 'dd-MMM-yyyy'))]);
    aoa.push([]);                                   // blank spacer row (row 4)
    var HEADER_ROW = 5;                             // 1-based
    aoa.push(cols.map(function (c) { return c.label; }));

    rows.forEach(function (r) {
      aoa.push(cols.map(function (c) {
        var raw = typeof c.value === 'function' ? c.value(r) : r[c.key];
        if (c.type === 'date') {
          var d = U.parseDate(raw);
          return d || '';
        }
        if (c.type === 'number' || c.type === 'money') {
          if (raw === '' || raw === null || raw === undefined) return '';
          var n = U.num(raw, null);
          return n === null || !isFinite(n) ? '' : n;
        }
        return safeValue(raw);
      }));
    });

    // Totals row
    var totalRowIdx = -1;
    if (spec.totals && rows.length) {
      var tKeys = Array.isArray(spec.totals) ? spec.totals
        : cols.filter(function (c) { return c.type === 'number'; }).map(function (c) { return c.key; });
      if (tKeys.length) {
        var tRow = cols.map(function (c, i) {
          if (i === 0) return 'TOTAL';
          if (tKeys.indexOf(c.key) !== -1) {
            return rows.reduce(function (a, r) { return a + U.num(r[c.key], 0); }, 0);
          }
          return '';
        });
        aoa.push(tRow);
        totalRowIdx = aoa.length; // 1-based
      }
    }

    var ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
    var dataStart = HEADER_ROW + 1;
    var dataEnd = HEADER_ROW + rows.length;
    var lastRow = Math.max(HEADER_ROW, totalRowIdx > 0 ? totalRowIdx : dataEnd);

    ws['!ref'] = 'A1:' + lastColL + Math.max(lastRow, HEADER_ROW + 1);

    /* ---- merges for the banner rows ---- */
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: nCols - 1 } }
    ];

    /* ---- column widths ---- */
    ws['!cols'] = cols.map(function (c) {
      var wch = c.width || 16;
      if (!c.width) {
        var maxLen = String(c.label).length;
        for (var i = 0; i < Math.min(rows.length, 250); i++) {
          var v = rows[i][c.key];
          var l = v === null || v === undefined ? 0 : String(v).length;
          if (l > maxLen) maxLen = l;
        }
        wch = Math.min(46, Math.max(10, maxLen + 3));
      }
      return { wch: wch };
    });

    /* ---- row heights ---- */
    var rowsMeta = [{ hpt: 26 }, { hpt: 20 }, { hpt: 15 }, { hpt: 7 }, { hpt: 24 }];
    ws['!rows'] = rowsMeta;

    /* ---- styling ---- */
    function cell(addr) { return ws[addr]; }
    function styleCell(addr, s) {
      var c = ws[addr];
      if (!c) { ws[addr] = { t: 's', v: '' }; c = ws[addr]; }
      c.s = s;
    }

    // banner
    styleCell('A1', {
      font: { bold: true, sz: 14, color: { rgb: T.titleFont } },
      fill: { patternType: 'solid', fgColor: { rgb: T.titleFill } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    styleCell('A2', {
      font: { bold: true, sz: 11.5, color: { rgb: T.subFont } },
      fill: { patternType: 'solid', fgColor: { rgb: T.subFill } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    styleCell('A3', {
      font: { italic: true, sz: 9.5, color: { rgb: T.metaFont } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    // merged trailing cells need a style too so fills span the whole width
    for (var mc = 1; mc < nCols; mc++) {
      styleCell(colLetter(mc) + '1', { fill: { patternType: 'solid', fgColor: { rgb: T.titleFill } } });
      styleCell(colLetter(mc) + '2', { fill: { patternType: 'solid', fgColor: { rgb: T.subFill } } });
    }

    // header row
    var headStyle = {
      font: { bold: true, sz: 10.5, color: { rgb: T.headFont } },
      fill: { patternType: 'solid', fgColor: { rgb: T.headFill } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: border(T.grid)
    };
    for (var h = 0; h < nCols; h++) styleCell(colLetter(h) + HEADER_ROW, headStyle);

    // data rows
    for (var r = 0; r < rows.length; r++) {
      var excelRow = dataStart + r;
      var banded = r % 2 === 1;
      for (var c2 = 0; c2 < nCols; c2++) {
        var col = cols[c2];
        var addr = colLetter(c2) + excelRow;
        var cl = cell(addr);
        var st = {
          font: { sz: 10 },
          alignment: {
            vertical: 'center',
            horizontal: col.type === 'number' || col.type === 'money' ? 'right'
              : (col.type === 'date' ? 'center' : 'left'),
            wrapText: col.type === 'multiline'
          },
          border: {
            top: { style: 'hair', color: { rgb: T.soft } },
            bottom: { style: 'hair', color: { rgb: T.soft } },
            left: { style: 'hair', color: { rgb: T.soft } },
            right: { style: 'hair', color: { rgb: T.soft } }
          }
        };
        if (banded) st.fill = { patternType: 'solid', fgColor: { rgb: T.band } };
        if (cl) {
          if (col.type === 'date' && cl.v instanceof Date) { cl.t = 'd'; cl.z = DATE_FMT; }
          else if (col.type === 'number' && typeof cl.v === 'number') { cl.t = 'n'; cl.z = NUM_FMT; }
          else if (col.type === 'money' && typeof cl.v === 'number') { cl.t = 'n'; cl.z = MONEY_FMT; }
          cl.s = st;
        } else {
          ws[addr] = { t: 's', v: '', s: st };
        }
      }
    }

    // totals row
    if (totalRowIdx > 0) {
      for (var tc = 0; tc < nCols; tc++) {
        var taddr = colLetter(tc) + totalRowIdx;
        var tcl = ws[taddr];
        var tst = {
          font: { bold: true, sz: 10, color: { rgb: T.headFont } },
          fill: { patternType: 'solid', fgColor: { rgb: T.headFill } },
          alignment: { vertical: 'center', horizontal: cols[tc].type === 'number' ? 'right' : 'left' },
          border: border(T.grid)
        };
        if (tcl && typeof tcl.v === 'number') { tcl.t = 'n'; tcl.z = NUM_FMT; }
        if (tcl) tcl.s = tst; else ws[taddr] = { t: 's', v: '', s: tst };
      }
    }

    // empty-data note
    if (!rows.length) {
      ws[colLetter(0) + dataStart] = {
        t: 's', v: 'No records available for this report.',
        s: { font: { italic: true, sz: 10, color: { rgb: T.metaFont } }, alignment: { horizontal: 'left', vertical: 'center' } }
      };
    }

    /* ---- AutoFilter on the real table range ---- */
    ws['!autofilter'] = { ref: 'A' + HEADER_ROW + ':' + lastColL + Math.max(dataEnd, HEADER_ROW) };

    /* ---- freeze header row (applied on post-process) ---- */
    ws['!freezeRow'] = HEADER_ROW;

    return ws;
  };

  /**
   * Build a "summary" style sheet: Section | Metric | Value
   * spec = { sheetName, orgTitle, reportTitle, metaLine, sections:[{title, rows:[[metric, value]]}] }
   */
  X.buildSummarySheet = function (spec) {
    var flat = [];
    (spec.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (r) {
        flat.push({ section: sec.title, metric: r[0], value: r[1] });
      });
    });
    return X.buildSheet({
      sheetName: spec.sheetName,
      orgTitle: spec.orgTitle,
      reportTitle: spec.reportTitle,
      metaLine: spec.metaLine,
      columns: [
        { key: 'section', label: 'Section', type: 'text', width: 26 },
        { key: 'metric', label: 'Metric', type: 'text', width: 34 },
        { key: 'value', label: 'Value', type: 'number', width: 16 }
      ],
      rows: flat
    });
  };

  /* ------------------------------------------------- freeze-pane patching */
  /**
   * SheetJS community build does not emit <pane>. We post-process the
   * generated .xlsx (a ZIP) and inject the freeze pane element per sheet.
   */
  function patchFreezePanes(u8, freezeRows) {
    var XLSX = lib();
    if (!XLSX.CFB || !freezeRows || !freezeRows.length) return u8;
    var needs = freezeRows.some(function (r) { return r > 0; });
    if (!needs) return u8;
    try {
      var cfb = XLSX.CFB.read(u8, { type: 'array' });

      function readText(entry) {
        var c = entry.content, s = '';
        for (var i = 0; i < c.length; i++) s += String.fromCharCode(c[i]);
        try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
      }
      function writeText(entry, str) {
        var enc;
        try { enc = unescape(encodeURIComponent(str)); } catch (e) { enc = str; }
        var arr = new Uint8Array(enc.length);
        for (var i = 0; i < enc.length; i++) arr[i] = enc.charCodeAt(i) & 0xFF;
        entry.content = arr;
        entry.size = arr.length;
      }

      for (var i = 0; i < freezeRows.length; i++) {
        var rowN = freezeRows[i];
        if (!rowN) continue;
        var path = '/xl/worksheets/sheet' + (i + 1) + '.xml';
        var entry = XLSX.CFB.find(cfb, path);
        if (!entry) continue;
        var xml = readText(entry);
        var topLeft = 'A' + (rowN + 1);
        var pane = '<pane ySplit="' + rowN + '" topLeftCell="' + topLeft +
          '" activePane="bottomLeft" state="frozen"/>' +
          '<selection pane="bottomLeft" activeCell="' + topLeft + '" sqref="' + topLeft + '"/>';
        if (/<sheetView([^>]*)\/>/.test(xml)) {
          xml = xml.replace(/<sheetView([^>]*)\/>/, '<sheetView$1>' + pane + '</sheetView>');
        } else if (/<sheetView([^>]*)>/.test(xml)) {
          xml = xml.replace(/<sheetView([^>]*)>/, '<sheetView$1>' + pane);
        } else {
          continue;
        }
        writeText(entry, xml);
      }
      var out = XLSX.CFB.write(cfb, { fileType: 'zip', type: 'array', compression: true });
      return out instanceof Uint8Array ? out : new Uint8Array(out);
    } catch (e) {
      console.warn('[excel] freeze pane patch skipped:', e);
      return u8;
    }
  }

  /* ------------------------------------------------------------ DOWNLOAD */
  /**
   * Create and download a workbook.
   * spec = { filename, sheets:[{ name, ws }] }
   */
  X.download = function (spec) {
    var XLSX = lib();
    var wb = XLSX.utils.book_new();
    var freezeRows = [];
    var used = {};

    (spec.sheets || []).forEach(function (s) {
      var name = sanitizeSheetName(s.name, used);
      XLSX.utils.book_append_sheet(wb, s.ws, name);
      freezeRows.push(s.ws['!freezeRow'] || 0);
      delete s.ws['!freezeRow'];
    });

    wb.Props = {
      Title: spec.title || 'IT Lab Report',
      Subject: 'IT Lab Management System',
      Author: (ITL.settings ? ITL.settings.get().adminName : 'Administrator') || 'Administrator',
      Company: (ITL.settings ? ITL.settings.get().orgName : '') || '',
      CreatedDate: new Date()
    };

    var raw = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true, cellDates: true, compression: true });
    var u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    u8 = patchFreezePanes(u8, freezeRows);

    var blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var fname = spec.filename;
    if (!/\.xlsx$/i.test(fname)) fname += '.xlsx';
    U.downloadBlob(blob, fname);
    return fname;
  };

  function sanitizeSheetName(name, used) {
    var n = String(name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31).trim() || 'Sheet';
    var base = n, i = 2;
    while (used[n.toLowerCase()]) { n = (base.slice(0, 28) + ' ' + i).slice(0, 31); i++; }
    used[n.toLowerCase()] = true;
    return n;
  }

  /** Standard meta line for report headers. */
  X.metaLine = function (opts) {
    opts = opts || {};
    var parts = ['Generated: ' + U.fmtDate(new Date(), 'dd-MMM-yyyy') + ' ' + U.fmtTime(new Date())];
    if (opts.records !== undefined) parts.push('Records: ' + U.fmtNum(opts.records));
    if (opts.scope) parts.push('Scope: ' + opts.scope);
    if (opts.filters) parts.push('Filters: ' + opts.filters);
    return parts.join('     |     ');
  };

  /**
   * High-level convenience: export one collection to a one-sheet workbook.
   * opts = { schemaId, rows, filenameBase, scope, filters, sheetName,
   *          reportTitle, columns (override), totals }
   */
  X.exportCollection = function (opts) {
    var sc = ITL.schemas[opts.schemaId] || {};
    var cols = opts.columns || ITL.schemas.exportFields(opts.schemaId);
    var s = ITL.settings ? ITL.settings.get() : {};
    var ws = X.buildSheet({
      sheetName: opts.sheetName || sc.sheetName,
      orgTitle: (s.orgName ? s.orgName.toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM',
      reportTitle: opts.reportTitle || sc.reportTitle,
      metaLine: X.metaLine({ records: (opts.rows || []).length, scope: opts.scope, filters: opts.filters }),
      columns: cols,
      rows: opts.rows || [],
      totals: opts.totals
    });
    var base = opts.filenameBase || ('IT_Lab_' + U.slug(sc.label || 'Report'));
    var fname = base + '_' + U.stampDate() + '.xlsx';
    X.download({
      filename: fname,
      title: opts.reportTitle || sc.reportTitle,
      sheets: [{ name: opts.sheetName || sc.sheetName, ws: ws }]
    });
    return fname;
  };

  /* ============================================================== IMPORT */

  /** Read a File object into a SheetJS workbook. */
  X.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      var XLSX;
      try { XLSX = lib(); } catch (e) { reject(e); return; }
      var fr = new FileReader();
      fr.onload = function (e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb = XLSX.read(data, { type: 'array', cellDates: true, cellText: false, cellNF: false });
          resolve(wb);
        } catch (err) { reject(new Error('Unable to read this workbook. ' + (err.message || ''))); }
      };
      fr.onerror = function () { reject(new Error('Could not read the selected file.')); };
      fr.readAsArrayBuffer(file);
    });
  };

  /** Sheet -> array of arrays (raw grid). Blank rows are KEPT so that
   *  grid indices always match real spreadsheet row numbers. */
  X.sheetGrid = function (ws) {
    var XLSX = lib();
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
  };

  /**
   * Locate the header row inside a raw grid by scoring rows against
   * a schema's alias map. Handles report banners (title rows) above the table.
   * Returns { index, score, headers }
   */
  X.detectHeaderRow = function (grid, schemaId) {
    var aliases = ITL.schemas.aliasMap(schemaId);
    var best = { index: -1, score: -1, headers: [], hits: 0 };
    var limit = Math.min(grid.length, 25);
    for (var i = 0; i < limit; i++) {
      var row = grid[i] || [];
      var nonEmpty = 0, hits = 0, textCells = 0;
      var seen = Object.create(null), dupes = 0;
      for (var j = 0; j < row.length; j++) {
        var cell = row[j];
        if (cell === '' || cell === null || cell === undefined) continue;
        nonEmpty++;
        if (typeof cell === 'string') textCells++;
        var n = U.normKey(cell);
        if (!n) continue;
        if (seen[n]) dupes++; else seen[n] = 1;
        if (aliases[n]) hits++;
      }
      if (nonEmpty < 2) continue;
      var score = hits * 10 + textCells - dupes * 3;
      if (score > best.score) {
        best = { index: i, score: score, headers: row.map(function (c) { return U.str(c); }), hits: hits };
      }
    }
    if (best.index === -1 && grid.length) {
      best = { index: 0, score: 0, headers: (grid[0] || []).map(function (c) { return U.str(c); }), hits: 0 };
    }
    return best;
  };

  /**
   * Map source headers to schema fields.
   * Each header may have several candidate fields; the first free candidate
   * wins so ambiguous labels ("S.No" then "Sr. No.") both find a home.
   * Returns { mapping: {colIndex: fieldKey}, unmapped: [labels], mapped: n }
   */
  X.mapColumns = function (headers, schemaId) {
    var aliases = ITL.schemas.aliasMap(schemaId);
    var mapping = {}, unmapped = [], usedFields = {};

    function candidates(h) {
      var n = U.normKey(h);
      if (!n) return [];
      if (aliases[n]) return aliases[n].slice();
      // loose containment for compound labels e.g. "PC Name (Lab 1)"
      var out = [];
      Object.keys(aliases).forEach(function (a) {
        if (a.length < 4) return;
        if (n.indexOf(a) === 0 || (n.length > 4 && a.indexOf(n) === 0)) {
          aliases[a].forEach(function (k) { if (out.indexOf(k) === -1) out.push(k); });
        }
      });
      return out;
    }

    // pass 1: headers whose best candidate is unambiguous get priority
    var pending = [];
    headers.forEach(function (h, i) {
      var cands = candidates(h);
      if (!cands.length) { if (U.str(h)) unmapped.push(h); return; }
      pending.push({ i: i, h: h, cands: cands });
    });
    pending.sort(function (a, b) { return a.cands.length - b.cands.length; });

    pending.forEach(function (p) {
      for (var c = 0; c < p.cands.length; c++) {
        if (!usedFields[p.cands[c]]) {
          mapping[p.i] = p.cands[c];
          usedFields[p.cands[c]] = true;
          return;
        }
      }
      unmapped.push(p.h);
    });

    return { mapping: mapping, unmapped: unmapped, mapped: Object.keys(mapping).length };
  };

  /**
   * Convert grid rows into normalized record objects using a mapping.
   * Returns { records:[{data, rowNumber, errors:[]}], skipped }
   */
  X.extractRecords = function (grid, headerIndex, mapping, schemaId) {
    var sc = ITL.schemas[schemaId];
    var out = [], skipped = 0;
    for (var i = headerIndex + 1; i < grid.length; i++) {
      var row = grid[i] || [];
      var obj = {}, any = false;
      Object.keys(mapping).forEach(function (ci) {
        var key = mapping[ci];
        var raw = row[ci];
        if (raw === undefined) raw = '';
        var fd = ITL.schemas.field(schemaId, key);
        var val;
        if (fd && fd.type === 'number') {
          val = (raw === '' || raw === null) ? '' : U.num(raw, '');
        } else if (fd && fd.type === 'date') {
          var d = U.parseDate(raw);
          val = d ? U.toDateInput(d) : (raw === '' ? '' : U.str(raw));
        } else {
          if (raw instanceof Date) val = U.fmtDate(raw, 'yyyy-MM-dd');
          else val = U.str(raw);
        }
        if (val !== '' && val !== null && val !== undefined) any = true;
        obj[key] = val;
      });
      if (!any) { skipped++; continue; }
      out.push({ data: obj, rowNumber: i + 1, errors: [] });
    }
    return { records: out, skipped: skipped };
  };

  /**
   * Business-key signatures used to spot two rows in the SAME file that
   * describe the same record. Row numbers / foreign codes are ignored.
   */
  function fileSignatures(schemaId, d) {
    var n = U.normKey;
    var sigs = [];
    if (d.id && ITL.schemas.isNativeId(schemaId, d.id)) sigs.push('id:' + n(d.id));
    switch (schemaId) {
      case 'pcs':
        if (d.serialNumber) sigs.push('sn:' + n(d.serialNumber));
        if (d.pcName) sigs.push('pcl:' + n(d.pcName) + '|' + n(d.lab));
        break;
      case 'staff':
        if (d.serialNumber) sigs.push('sn:' + n(d.serialNumber));
        if (d.pcName) sigs.push('pc:' + n(d.pcName));
        break;
      case 'store':
        if (d.itemName) sigs.push('it:' + n(d.itemName) + '|' + n(d.category));
        break;
      case 'purchases':
        if (d.purchaseDate && d.item) sigs.push('pu:' + n(d.purchaseDate) + '|' + n(d.item) + '|' + n(d.supplier));
        break;
      case 'maintenance':
        if (d.complaintDate && d.pcName && d.problem) {
          sigs.push('mt:' + n(d.complaintDate) + '|' + n(d.pcName) + '|' + n(d.problem));
        }
        break;
    }
    return sigs;
  }

  /**
   * Validate + flag duplicates for a batch of extracted records.
   * dupCheck(record) should return existing record or null.
   * Returns { valid:[], duplicates:[], errors:[] } (entries keep .rowNumber)
   */
  X.validateBatch = function (entries, schemaId, dupCheck) {
    var sc = ITL.schemas[schemaId];
    var required = sc.required || [];
    var valid = [], duplicates = [], errors = [];
    var seenInFile = Object.create(null);

    entries.forEach(function (e) {
      var errs = [];
      required.forEach(function (rk) {
        if (!U.str(e.data[rk])) {
          var fd = ITL.schemas.field(schemaId, rk);
          errs.push((fd ? fd.label : rk) + ' is missing');
        }
      });
      // numeric sanity
      sc.fields.forEach(function (fd) {
        if (fd.type !== 'number') return;
        var v = e.data[fd.key];
        if (v === '' || v === undefined || v === null) return;
        var num = U.num(v, NaN);
        if (!isFinite(num)) errs.push(fd.label + ' is not a number');
        else if (num < 0 && /quantity|qty|stock|price/i.test(fd.key)) errs.push(fd.label + ' cannot be negative');
      });

      if (errs.length) { e.errors = errs; errors.push(e); return; }

      var existing = dupCheck ? dupCheck(e.data) : null;

      if (!existing) {
        var sigs = fileSignatures(schemaId, e.data);
        var clash = null;
        for (var i = 0; i < sigs.length; i++) {
          if (seenInFile[sigs[i]]) { clash = seenInFile[sigs[i]]; break; }
        }
        if (clash) {
          e.duplicateOf = 'row ' + clash;
          e.inFileDuplicate = true;
          duplicates.push(e);
          return;
        }
        sigs.forEach(function (s) { seenInFile[s] = e.rowNumber; });
        valid.push(e);
        return;
      }

      e.existing = existing;
      e.duplicateOf = existing.id;
      duplicates.push(e);
    });

    return { valid: valid, duplicates: duplicates, errors: errors };
  };

})(window);
