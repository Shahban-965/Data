/* ==========================================================================
   excel.js — v2 · CLEAN BLACK & WHITE EXCEL ENGINE

   Contract (v2):
     * Row 1 is the header. Row 2+ is data. NO banner, NO blank spacer row,
       NO merged title cells, NO "no records" note, NO trailing empty row.
     * A column is emitted only if at least one data cell in it has a value.
     * A row is emitted only if at least one of its cells has a value.
     * No empty cells are written at all — only real values exist in the sheet.
     * Strictly monochrome: white paper, black ink, black header with white
       type. No blue fills, no zebra banding, no coloured accents.
     * If the prepared data has zero rows or zero columns, NOTHING is
       downloaded. One row / one column is enough to produce a valid file.
     * Multi-sheet workbooks drop empty sheets. If every sheet is empty,
       the download is cancelled and the user is told why.
     * Created/Updated (entry/update) dates are never exported.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils || {};
  var X = ITL.excel = {};

  /* Strictly black & white. No third colour is used anywhere. */
  var INK = '000000';
  var PAPER = 'FFFFFF';
  var DATE_FMT = 'dd-mmm-yyyy';
  var NUM_FMT = '#,##0';
  var MONEY_FMT = '#,##0.00';

  /* Audit / system fields are never written to a workbook. */
  var HIDDEN_KEYS = /^(createdAt|updatedAt|created_at|updated_at|entryDate|updateDate|entry_date|update_date)$/i;

  function lib() {
    if (typeof w.XLSX === 'undefined') throw new Error('SheetJS (XLSX) library is not loaded.');
    return w.XLSX;
  }
  X.isReady = function () { return typeof w.XLSX !== 'undefined'; };
  X.colors = Object.freeze({ ink: INK, paper: PAPER });

  function colLetter(n) {
    var s = '';
    n = n + 1;
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  X.colLetter = colLetter;

  function addr(c, r) { return colLetter(c) + (r + 1); } // 0-based both

  function border(style) {
    var b = { style: style || 'thin', color: { rgb: INK } };
    return { top: b, bottom: b, left: b, right: b };
  }

  function headStyle() {
    return {
      font: { name: 'Calibri', bold: true, sz: 10.5, color: { rgb: PAPER } },
      fill: { patternType: 'solid', fgColor: { rgb: INK } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: border('thin')
    };
  }
  function bodyStyle(col) {
    return {
      font: { name: 'Calibri', sz: 10, color: { rgb: INK } },
      fill: { patternType: 'solid', fgColor: { rgb: PAPER } },
      alignment: {
        vertical: 'center',
        horizontal: (col.type === 'number' || col.type === 'money') ? 'right'
          : (col.type === 'date' ? 'center' : 'left'),
        wrapText: col.type === 'multiline'
      },
      border: border('hair')
    };
  }
  function totalStyle(col) {
    return {
      font: { name: 'Calibri', bold: true, sz: 10, color: { rgb: INK } },
      fill: { patternType: 'solid', fgColor: { rgb: PAPER } },
      alignment: { vertical: 'center', horizontal: (col.type === 'number' || col.type === 'money') ? 'right' : 'left' },
      border: border('thin')
    };
  }

  /** Coerce any value into something Excel-safe (never [object Object]). */
  function safeValue(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
      if (Array.isArray(v)) return v.filter(function (x) { return x !== null && x !== undefined && x !== ''; }).join(', ');
      try { return JSON.stringify(v); } catch (e) { return ''; }
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return v;
  }

  function hasValue(v) {
    if (v === null || v === undefined || v === '') return false;
    if (typeof v === 'number') return isFinite(v);
    if (v instanceof Date) return !isNaN(v.getTime());
    return String(v).trim() !== '';
  }

  function parseNum(v, fallback) {
    if (U.num) return U.num(v, fallback);
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }
  function parseDate(v) {
    if (!U.parseDate) {
      if (v instanceof Date) return v;
      var d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return U.parseDate(v);
  }

  /** One value for one column of one record. */
  function cellValue(col, row) {
    if (HIDDEN_KEYS.test(String(col.key || ''))) return '';
    var raw = typeof col.value === 'function' ? col.value(row) : row[col.key];
    if (col.type === 'date') {
      var d = parseDate(raw);
      return d || '';
    }
    if (col.type === 'number' || col.type === 'money') {
      if (raw === '' || raw === null || raw === undefined) return '';
      var n = parseNum(raw, null);
      return n === null || !isFinite(n) ? '' : n;
    }
    return safeValue(raw);
  }

  function makeCell(v, col, style) {
    if (v instanceof Date) return { t: 'd', v: v, z: DATE_FMT, s: style };
    if (typeof v === 'number') return { t: 'n', v: v, z: col.type === 'money' ? MONEY_FMT : NUM_FMT, s: style };
    return { t: 's', v: String(v), s: style };
  }

  function emptySheet() {
    return { '!ref': 'A1:A1', '!itlRows': 0, '!itlCols': 0, '!freezeRow': 0 };
  }

  /**
   * Build one clean worksheet.
   * spec = { sheetName, orgTitle, reportTitle, metaLine,
   *          columns: [{key,label,type,width,value}], rows:[obj],
   *          totals: bool | [keys] }
   * The returned sheet carries !itlRows / !itlCols so download() can reject
   * empty sheets without guessing from a formatted range.
   */
  X.buildSheet = function (spec) {
    lib();
    spec = spec || {};
    var cols = (spec.columns || []).filter(function (c) {
      return c && String(c.label === undefined ? c.key : c.label).trim() !== '' && !HIDDEN_KEYS.test(String(c.key || ''));
    });
    var rows = (spec.rows || []).filter(function (r) { return r && typeof r === 'object'; });
    if (!cols.length || !rows.length) return emptySheet();

    /* 1 — compute the full matrix, then throw away empty rows. */
    var kept = [];
    rows.forEach(function (r) {
      var cells = cols.map(function (c) { return cellValue(c, r); });
      if (cells.some(hasValue)) kept.push({ cells: cells, record: r });
    });
    if (!kept.length) return emptySheet();

    /* 2 — throw away columns that are empty in EVERY surviving row. */
    var keepIdx = [];
    cols.forEach(function (c, i) {
      if (kept.some(function (k) { return hasValue(k.cells[i]); })) keepIdx.push(i);
    });
    if (!keepIdx.length) return emptySheet();
    var outCols = keepIdx.map(function (i) { return cols[i]; });
    var outRows = kept.map(function (k) { return keepIdx.map(function (i) { return k.cells[i]; }); });

    /* 3 — totals only for surviving numeric columns. */
    var totalRow = null;
    if (spec.totals && outRows.length) {
      var wanted = Array.isArray(spec.totals) ? spec.totals
        : outCols.filter(function (c) { return c.type === 'number' || c.type === 'money'; })
          .map(function (c) { return c.key; });
      var numericIdx = [];
      outCols.forEach(function (c, i) {
        if ((c.type === 'number' || c.type === 'money') && wanted.indexOf(c.key) !== -1) numericIdx.push(i);
      });
      if (numericIdx.length) {
        totalRow = outCols.map(function () { return ''; });
        totalRow[0] = 'TOTAL';
        numericIdx.forEach(function (i) {
          totalRow[i] = outRows.reduce(function (a, cells) {
            return a + (typeof cells[i] === 'number' ? cells[i] : parseNum(cells[i], 0));
          }, 0);
        });
      }
    }

    /* 4 — write cells manually so not a single blank cell exists. */
    var ws = {};
    var nCols = outCols.length;
    var lastRow = 1 + outRows.length + (totalRow ? 1 : 0); // 1-based
    ws['!ref'] = 'A1:' + colLetter(nCols - 1) + lastRow;

    outCols.forEach(function (c, i) {
      ws[addr(i, 0)] = { t: 's', v: String(c.label), s: headStyle() };
    });

    outRows.forEach(function (cells, r) {
      cells.forEach(function (v, c) {
        if (!hasValue(v)) return;                 // no empty cells
        ws[addr(c, r + 1)] = makeCell(v, outCols[c], bodyStyle(outCols[c]));
      });
    });

    if (totalRow) {
      var tr = 1 + outRows.length;
      totalRow.forEach(function (v, c) {
        if (!hasValue(v)) return;
        ws[addr(c, tr)] = makeCell(v, outCols[c], totalStyle(outCols[c]));
      });
    }

    /* 5 — widths, heights, filter, freeze. Nothing beyond the used range. */
    ws['!cols'] = outCols.map(function (c, i) {
      var wch = c.width;
      if (!wch) {
        var maxLen = String(c.label).length;
        for (var r = 0; r < Math.min(outRows.length, 250); r++) {
          var v = outRows[r][i];
          var len = hasValue(v) ? String(v).length : 0;
          if (len > maxLen) maxLen = len;
        }
        wch = Math.min(46, Math.max(10, maxLen + 3));
      }
      return { wch: wch };
    });
    ws['!rows'] = [{ hpt: 24 }];
    ws['!autofilter'] = { ref: 'A1:' + colLetter(nCols - 1) + (1 + outRows.length) };
    ws['!freezeRow'] = 1;
    ws['!itlRows'] = outRows.length;
    ws['!itlCols'] = nCols;
    ws['!itlTitle'] = spec.reportTitle || '';
    ws['!itlOrg'] = spec.orgTitle || '';
    ws['!itlMeta'] = spec.metaLine || '';
    return ws;
  };

  /** Summary sheet: Section | Metric | Value. Empty sections are dropped. */
  X.buildSummarySheet = function (spec) {
    spec = spec || {};
    var flat = [];
    (spec.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (r) {
        if (!r || (r[1] === '' || r[1] === null || r[1] === undefined)) return;
        flat.push({ section: sec.title || '', metric: r[0], value: r[1] });
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
        { key: 'value', label: 'Value', type: 'text', width: 16 }
      ],
      rows: flat
    });
  };

  /* ------------------------------------------------- freeze-pane patching */
  /** SheetJS community does not emit <pane>. Inject it into the xlsx ZIP. */
  function patchFreezePanes(u8, freezeRows) {
    var XLSX = lib();
    if (!XLSX.CFB || !freezeRows || !freezeRows.length) return u8;
    if (!freezeRows.some(function (r) { return r > 0; })) return u8;
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
      freezeRows.forEach(function (rowN, i) {
        if (!rowN) return;
        var entry = XLSX.CFB.find(cfb, '/xl/worksheets/sheet' + (i + 1) + '.xml');
        if (!entry) return;
        var xml = readText(entry);
        var topLeft = 'A' + (rowN + 1);
        var pane = '<pane ySplit="' + rowN + '" topLeftCell="' + topLeft +
          '" activePane="bottomLeft" state="frozen"/>' +
          '<selection pane="bottomLeft" activeCell="' + topLeft + '" sqref="' + topLeft + '"/>';
        if (/<sheetView([^>]*)\/>/.test(xml)) xml = xml.replace(/<sheetView([^>]*)\/>/, '<sheetView$1>' + pane + '</sheetView>');
        else if (/<sheetView([^>]*)>/.test(xml)) xml = xml.replace(/<sheetView([^>]*)>/, '<sheetView$1>' + pane);
        else return;
        writeText(entry, xml);
      });
      var out = XLSX.CFB.write(cfb, { fileType: 'zip', type: 'array', compression: true });
      return out instanceof Uint8Array ? out : new Uint8Array(out);
    } catch (e) {
      console.warn('[excel] freeze pane patch skipped:', e);
      return u8;
    }
  }

  function sheetHasData(ws) {
    if (!ws) return false;
    var n = ws['!itlRows'];
    if (typeof n === 'number') return n > 0 && (ws['!itlCols'] || 0) > 0;
    // Fallback for any worksheet built outside buildSheet().
    return Object.keys(ws).some(function (k) {
      return /^[A-Z]+\d+$/.test(k) && parseInt(k.replace(/^[A-Z]+/, ''), 10) > 1;
    });
  }
  X.sheetHasData = sheetHasData;

  function notifyEmpty() {
    if (ITL.toast && ITL.toast.warn) {
      ITL.toast.warn('Nothing to download', 'There is no data to export, so no empty Excel file was created.');
    }
    return null;
  }

  function sanitizeSheetName(name, used) {
    var n = String(name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31).trim() || 'Sheet';
    var base = n, i = 2;
    while (used[n.toLowerCase()]) { n = (base.slice(0, 28) + ' ' + i).slice(0, 31); i++; }
    used[n.toLowerCase()] = true;
    return n;
  }

  /* ------------------------------------------------------------ DOWNLOAD */
  /** Create and download a workbook. Empty sheets are removed; if none are
   *  left the download is cancelled (returns null, no file is produced). */
  X.download = function (spec) {
    var XLSX = lib();
    spec = spec || {};
    var sheets = (spec.sheets || []).filter(function (s) { return sheetHasData(s && s.ws); });
    if (!sheets.length) return notifyEmpty();

    var wb = XLSX.utils.book_new();
    var freezeRows = [];
    var used = {};
    var settings = (ITL.settings && ITL.settings.get) ? ITL.settings.get() : {};

    sheets.forEach(function (s) {
      var ws = s.ws;
      var name = sanitizeSheetName(s.name || ws['!itlTitle'], used);
      var meta = ws['!itlMeta'] || '';
      var title = ws['!itlTitle'] || '';
      var org = ws['!itlOrg'] || '';
      freezeRows.push(ws['!freezeRow'] || 0);
      delete ws['!freezeRow'];
      delete ws['!itlRows'];
      delete ws['!itlCols'];
      delete ws['!itlTitle'];
      delete ws['!itlOrg'];
      delete ws['!itlMeta'];
      XLSX.utils.book_append_sheet(wb, ws, name);
    });

    wb.Props = {
      Title: spec.title || 'IT Lab Report',
      Subject: 'Black & white data export',
      Author: settings.adminName || 'Administrator',
      Company: settings.orgName || '',
      Description: [spec.description, 'Header in row 1, data from row 2. No empty rows or columns.'].filter(Boolean).join(' · '),
      CreatedDate: new Date()
    };

    var raw = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true, cellDates: true, compression: true });
    var u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    u8 = patchFreezePanes(u8, freezeRows);

    var blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var fname = spec.filename || 'IT_Lab_Export.xlsx';
    if (!/\.xlsx$/i.test(fname)) fname += '.xlsx';
    if (U.downloadBlob) U.downloadBlob(blob, fname);
    return fname;
  };

  /** Kept for callers that build a descriptive line; metadata now lives in
   *  the workbook properties, never in an extra (possibly empty) sheet row. */
  X.metaLine = function (opts) {
    opts = opts || {};
    var parts = [];
    if (opts.records !== undefined) parts.push('Records: ' + opts.records);
    if (opts.scope) parts.push('Scope: ' + opts.scope);
    if (opts.filters) parts.push('Filters: ' + opts.filters);
    return parts.join('  |  ');
  };

  /** Export one collection. Returns the filename, or null when cancelled. */
  X.exportCollection = function (opts) {
    opts = opts || {};
    var sc = (ITL.schemas && ITL.schemas[opts.schemaId]) || {};
    var cols = opts.columns || (ITL.schemas && ITL.schemas.exportFields
      ? ITL.schemas.exportFields(opts.schemaId) : []);
    var rows = opts.rows || [];
    if (!cols.length || !rows.length) return notifyEmpty();

    var settings = (ITL.settings && ITL.settings.get) ? ITL.settings.get() : {};
    var ws = X.buildSheet({
      sheetName: opts.sheetName || sc.sheetName,
      orgTitle: (settings.orgName ? String(settings.orgName).toUpperCase() + ' — ' : '') + 'IT LAB MANAGEMENT SYSTEM',
      reportTitle: opts.reportTitle || sc.reportTitle,
      metaLine: X.metaLine({ records: rows.length, scope: opts.scope, filters: opts.filters }),
      columns: cols,
      rows: rows,
      totals: opts.totals
    });
    if (!sheetHasData(ws)) return notifyEmpty();

    var base = opts.filenameBase || ('IT_Lab_' + ((U.slug && sc.label) ? U.slug(sc.label) : 'Report'));
    var fname = base + '_' + (U.stampDate ? U.stampDate() : 'export') + '.xlsx';
    return X.download({
      filename: fname,
      title: opts.reportTitle || sc.reportTitle,
      sheets: [{ name: opts.sheetName || sc.sheetName, ws: ws }]
    });
  };

  /* ============================================================== IMPORT */
  X.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      var XLSX;
      try { XLSX = lib(); } catch (e) { reject(e); return; }
      var fr = new FileReader();
      fr.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result),
            { type: 'array', cellDates: true, cellText: false, cellNF: false });
          resolve(wb);
        } catch (err) { reject(new Error('Unable to read this workbook. ' + (err.message || ''))); }
      };
      fr.onerror = function () { reject(new Error('Could not read the selected file.')); };
      fr.readAsArrayBuffer(file);
    });
  };

  /** Blank rows are KEPT on import so grid indices match real row numbers. */
  X.sheetGrid = function (ws) {
    return lib().utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
  };

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
        var n = U.normKey ? U.normKey(cell) : String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!n) continue;
        if (seen[n]) dupes++; else seen[n] = 1;
        if (aliases[n]) hits++;
      }
      if (nonEmpty < 2) continue;
      var score = hits * 10 + textCells - dupes * 3;
      if (score > best.score) {
        best = { index: i, score: score, headers: row.map(function (c) { return U.str ? U.str(c) : String(c); }), hits: hits };
      }
    }
    if (best.index === -1 && grid.length) {
      best = { index: 0, score: 0, headers: (grid[0] || []).map(function (c) { return U.str ? U.str(c) : String(c); }), hits: 0 };
    }
    return best;
  };

  X.mapColumns = function (headers, schemaId) {
    var aliases = ITL.schemas.aliasMap(schemaId);
    var mapping = {}, unmapped = [], usedFields = {};
    function candidates(h) {
      var n = U.normKey ? U.normKey(h) : String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!n) return [];
      if (aliases[n]) return aliases[n].slice();
      var out = [];
      Object.keys(aliases).forEach(function (a) {
        if (a.length < 4) return;
        if (n.indexOf(a) === 0 || (n.length > 4 && a.indexOf(n) === 0)) {
          aliases[a].forEach(function (k) { if (out.indexOf(k) === -1) out.push(k); });
        }
      });
      return out;
    }
    var pending = [];
    headers.forEach(function (h, i) {
      var cands = candidates(h);
      if (!cands.length) { if (U.str && U.str(h)) unmapped.push(h); return; }
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

  X.extractRecords = function (grid, headerIndex, mapping, schemaId) {
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
          val = (raw === '' || raw === null) ? '' : (U.num ? U.num(raw, '') : Number(raw));
        } else if (fd && fd.type === 'date') {
          var d = parseDate(raw);
          val = d ? (U.toDateInput ? U.toDateInput(d) : d.toISOString().slice(0, 10)) : (raw === '' ? '' : (U.str ? U.str(raw) : String(raw)));
        } else {
          if (raw instanceof Date) val = U.fmtDate ? U.fmtDate(raw, 'yyyy-MM-dd') : raw.toISOString().slice(0, 10);
          else val = U.str ? U.str(raw) : String(raw);
        }
        if (val !== '' && val !== null && val !== undefined) any = true;
        obj[key] = val;
      });
      if (!any) { skipped++; continue; }
      out.push({ data: obj, rowNumber: i + 1, errors: [] });
    }
    return { records: out, skipped: skipped };
  };

  function fileSignatures(schemaId, d) {
    var n = U.normKey || function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
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

  X.validateBatch = function (entries, schemaId, dupCheck) {
    var sc = ITL.schemas[schemaId];
    var required = sc.required || [];
    var valid = [], duplicates = [], errors = [];
    var seenInFile = Object.create(null);
    entries.forEach(function (e) {
      var errs = [];
      required.forEach(function (rk) {
        var s = U.str ? U.str(e.data[rk]) : String(e.data[rk] || '');
        if (!s) {
          var fd = ITL.schemas.field(schemaId, rk);
          errs.push((fd ? fd.label : rk) + ' is missing');
        }
      });
      sc.fields.forEach(function (fd) {
        if (fd.type !== 'number') return;
        var v = e.data[fd.key];
        if (v === '' || v === undefined || v === null) return;
        var num = U.num ? U.num(v, NaN) : Number(v);
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
