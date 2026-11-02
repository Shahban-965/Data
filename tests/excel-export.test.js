'use strict';
/* ==========================================================================
   Excel v2 contract tests — run with: npm run check
   Verifies: black & white only, no empty rows/columns/cells, no empty
   downloads, header in row 1, single row/column still exports, no audit dates.
   ========================================================================== */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const excelSrc = fs.readFileSync(path.join(root, 'js', 'excel.js'), 'utf8');
const schemasSrc = fs.readFileSync(path.join(root, 'js', 'schemas.js'), 'utf8');

function makeApp() {
  const downloads = [];
  const warnings = [];
  const utils = {
    num: (v, d) => { const n = Number(v); return isFinite(n) ? n : d; },
    parseDate: (v) => {
      if (v instanceof Date) return v;
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    },
    normKey: (v) => String(v === null || v === undefined ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, ''),
    str: (v) => v === null || v === undefined ? '' : String(v),
    slug: (v) => String(v || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    stampDate: () => '2026-11-02',
    fmtDate: () => '',
    toDateInput: (d) => d.toISOString().slice(0, 10),
    downloadBlob: (blob, name) => downloads.push({ blob, name })
  };
  const XLSX = {
    utils: {
      book_new: () => ({ Sheets: {}, SheetNames: [], Props: null }),
      book_append_sheet: (wb, ws, name) => { wb.Sheets[name] = ws; wb.SheetNames.push(name); },
      sheet_to_json: () => []
    },
    write: () => new Uint8Array([80, 75, 3, 4]),
    read: () => ({ SheetNames: [], Sheets: {} })
  };
  const window = {
    XLSX,
    Blob: class Blob { constructor(parts) { this.parts = parts; } },
    ITL: {
      utils,
      toast: {
        warn: (t, m) => warnings.push(t + ': ' + m),
        success: () => {}, error: () => {}, info: () => {}
      },
      settings: { get: () => ({ orgName: 'TEST LABS', adminName: 'Tester' }) }
    },
    addEventListener: () => {},
    console
  };
  const context = {
    window, console, Blob: window.Blob,
    Uint8Array, Promise, Date, Math, JSON, Object, Array, String, Number, RegExp, isFinite, parseInt
  };
  vm.runInNewContext(excelSrc, context);
  vm.runInNewContext(schemasSrc, context);
  window.ITL.utils = utils;
  return { window, ITL: window.ITL, X: window.ITL.excel, XLSX, downloads, warnings };
}

function cellKeys(ws) { return Object.keys(ws).filter((k) => /^[A-Z]+\d+$/.test(k)); }
function colorsOf(style) {
  const out = [];
  function walk(v) {
    if (!v || typeof v !== 'object') return;
    Object.keys(v).forEach((k) => {
      if (k === 'rgb' && typeof v[k] === 'string') out.push(v[k].toUpperCase());
      else walk(v[k]);
    });
  }
  walk(style);
  return out;
}

test('header is row 1, data starts at row 2, used range has no empty rows', () => {
  const { X } = makeApp();
  const ws = X.buildSheet({
    reportTitle: 'TEST',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'note', label: 'Note' }
    ],
    rows: [
      { name: 'PC-01', qty: 2, note: '' },
      { name: 'PC-02', qty: 3, note: 'ok' }
    ]
  });
  assert.equal(ws['!ref'], 'A1:C3');
  assert.equal(ws['A1'].v, 'Name');
  assert.equal(ws['A2'].v, 'PC-01');
  assert.equal(ws['B3'].v, 3);
  assert.equal(ws['!itlRows'], 2);
  assert.equal(ws['!itlCols'], 3);
  assert.equal(ws['!freezeRow'], 1);
  assert.equal(ws['!autofilter'].ref, 'A1:C3');
  // No cell exists outside the used range (in particular no trailing blank row)
  cellKeys(ws).forEach((k) => {
    const row = parseInt(k.replace(/^[A-Z]+/, ''), 10);
    assert.ok(row >= 1 && row <= 3, 'unexpected cell outside range: ' + k);
  });
});

test('empty columns, empty rows and empty cells are removed', () => {
  const { X } = makeApp();
  const ws = X.buildSheet({
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'blank', label: 'Always Blank' },
      { key: 'qty', label: 'Qty', type: 'number' }
    ],
    rows: [
      { name: 'A', blank: '', qty: 1 },
      { name: '', blank: '', qty: '' },      // entirely empty row
      { name: 'B', blank: '   ', qty: 2 }
    ]
  });
  assert.equal(ws['!itlCols'], 2, 'the always-blank column must be dropped');
  assert.equal(ws['!itlRows'], 2, 'the empty row must be dropped');
  assert.equal(ws['!ref'], 'A1:B3');
  assert.equal(ws['B1'].v, 'Qty');
  assert.equal(ws['A3'].v, 'B');
  cellKeys(ws).forEach((k) => {
    assert.notEqual(ws[k].v, '', 'no blank cell should be written: ' + k);
    assert.ok(ws[k].v !== null && ws[k].v !== undefined);
  });
});

test('only black and white colours are used in the workbook', () => {
  const { X } = makeApp();
  const ws = X.buildSheet({
    columns: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B', type: 'money' }],
    rows: [{ a: 'x', b: 12.5 }],
    totals: true
  });
  const all = cellKeys(ws).flatMap((k) => colorsOf(ws[k].s));
  assert.ok(all.length > 0);
  all.forEach((c) => assert.ok(['000000', 'FFFFFF'].includes(c), 'unexpected colour ' + c));
  assert.equal(ws['A1'].s.fill.fgColor.rgb, '000000');   // black header
  assert.equal(ws['A1'].s.font.color.rgb, 'FFFFFF');    // white header text
  assert.equal(ws['A2'].s.fill.fgColor.rgb, 'FFFFFF');  // white paper
  assert.equal(ws['A2'].s.font.color.rgb, '000000');    // black ink
  assert.equal(ws['A3'].v, 'TOTAL');                    // totals row is real data
});

test('no download at all when there is no data (and a warning is shown)', () => {
  const { X, downloads, warnings } = makeApp();
  assert.equal(X.exportCollection({ schemaId: 'pcs', rows: [], columns: [{ key: 'id', label: 'ID' }] }), null);
  assert.equal(X.download({
    filename: 'empty.xlsx',
    sheets: [
      { name: 'Empty', ws: X.buildSheet({ columns: [{ key: 'a', label: 'A' }], rows: [] }) },
      { name: 'Also Empty', ws: X.buildSheet({ columns: [], rows: [{ a: 1 }] }) }
    ]
  }), null);
  assert.equal(downloads.length, 0, 'no file may be produced');
  assert.ok(warnings.length >= 2);
});

test('one row OR one column of data is enough to download', () => {
  const { X, downloads } = makeApp();
  const ws = X.buildSheet({ columns: [{ key: 'only', label: 'Only' }], rows: [{ only: 'value' }] });
  assert.equal(ws['!ref'], 'A1:A2');
  const name = X.download({ filename: 'single.xlsx', sheets: [{ name: 'Data', ws }] });
  assert.match(name, /^single\.xlsx$/);
  assert.equal(downloads.length, 1);
});

test('multi-sheet workbook drops empty sheets but downloads if one has data', () => {
  const { X, XLSX, downloads } = makeApp();
  const empty = X.buildSheet({ columns: [{ key: 'a', label: 'A' }], rows: [] });
  const full = X.buildSheet({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] });
  let captured = null;
  const original = XLSX.write;
  XLSX.write = (wb) => { captured = wb; return new Uint8Array([1]); };
  X.download({ filename: 'mixed.xlsx', sheets: [
    { name: 'Empty Sheet', ws: empty },
    { name: 'Real Data', ws: full }
  ] });
  XLSX.write = original;
  assert.deepEqual(captured.SheetNames, ['Real Data']);
  assert.equal(downloads.length, 1);
});

test('Created / Updated (entry / update) dates never appear in exports', () => {
  const { ITL } = makeApp();
  ['pcs', 'staff', 'maintenance', 'store', 'purchases', 'stockTx', 'logs'].forEach((id) => {
    const keys = ITL.schemas.exportFields(id).map((f) => f.key);
    assert.ok(!keys.includes('createdAt'), id + ' still exports createdAt');
    assert.ok(!keys.includes('updatedAt'), id + ' still exports updatedAt');
  });
  // Even if a caller explicitly supplies an audit column, buildSheet refuses it.
  const ws = ITL.excel.buildSheet({
    columns: [
      { key: 'createdAt', label: 'Entry Date' },
      { key: 'updatedAt', label: 'Update Date' },
      { key: 'name', label: 'Name' }
    ],
    rows: [{ createdAt: '2026-01-01', updatedAt: '2026-02-02', name: 'PC-1' }]
  });
  assert.equal(ws['!itlCols'], 1);
  assert.equal(ws['A1'].v, 'Name');
  assert.equal(ws['A2'].v, 'PC-1');
  assert.equal(ws['!ref'], 'A1:A2');
});
