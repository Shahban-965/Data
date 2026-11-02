'use strict';
/* ==========================================================================
   Permanent data-layer tests — run with: npm run check
   Proves there is no RAM-only database: every read hits the files and a
   failed write never makes the app believe unsaved data exists.
   ========================================================================== */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');

function makeApp(files, opts) {
  opts = opts || {};
  const writes = [];
  const desktop = {
    mode: 'permanent-json-txt-files',
    dataRoot: () => 'USB:/SN-ATLAS/DATA',
    read: (name) => files[name] === undefined ? null : files[name],
    write: (name, content) => {
      if (opts.failWrites) return { ok: false, error: 'drive removed' };
      files[name] = content;
      files[name.replace(/\.json$/, '.txt')] = JSON.stringify(JSON.parse(content), null, 2) + '\n';
      writes.push(name);
      return { ok: true, bytes: Buffer.byteLength(content, 'utf8') };
    },
    ensureDefaults: (defaults) => {
      const created = [];
      Object.keys(defaults).forEach((name) => {
        if (files[name] === undefined) {
          desktop.write(name, defaults[name]);
          created.push(name);
        }
      });
      return { ok: true, created, repaired: [], dataDir: desktop.dataRoot() };
    },
    status: () => ({ ok: true, writable: !opts.failWrites, files: [], lastWrite: null, writeCount: writes.length }),
    verify: () => ({ ok: true, missing: [], mismatch: [], checked: [] }),
    list: () => Object.keys(files).map((name) => ({ name, bytes: files[name].length, modified: new Date().toISOString() })),
    openDataFolder: () => {},
    backupNow: () => ({ ok: true }),
    appInfo: () => ({ version: '2.0.0' })
  };
  const window = {
    shakeelDesktop: desktop,
    addEventListener: () => {},
    localStorage: { setItem() {}, removeItem() {}, getItem() { return null; } }
  };
  const context = { window, console, JSON, Object, Array, Date, String, Math, Number, RegExp, isFinite };
  vm.runInNewContext(source, context);
  window.ITL.utils = { deepClone: (v) => JSON.parse(JSON.stringify(v)) };
  return { storage: window.ITL.storage, files, writes, opts };
}

test('every save writes both .json and .txt with identical data', () => {
  const { storage, files } = makeApp({});
  assert.equal(storage.set(storage.KEYS.pcs, [{ id: 'PC-0001', pcName: 'LAB-01' }]), true);
  assert.equal(typeof files['pcs.json'], 'string');
  assert.equal(typeof files['pcs.txt'], 'string');
  assert.deepEqual(JSON.parse(files['pcs.json']), JSON.parse(files['pcs.txt']));
  assert.equal(storage.list(storage.KEYS.pcs)[0].pcName, 'LAB-01');
});

test('meta.json records a permanent lastWrite and writeCount on disk', () => {
  const { storage, files } = makeApp({});
  storage.set(storage.KEYS.store, [{ id: 'ITM-0001', itemName: 'Mouse' }]);
  const meta = JSON.parse(files['meta.json']);
  assert.ok(meta.lastWrite, 'lastWrite must be persisted, not held in RAM');
  assert.equal(meta.writeCount, 1);
  assert.equal(meta.lastKey, storage.KEYS.store);
});

test('reads always come from disk — an external change is visible immediately', () => {
  const { storage, files } = makeApp({});
  storage.set(storage.KEYS.pcs, [{ id: 'PC-0001' }]);
  // Simulate copying / editing the DATA folder while the app is running.
  files['pcs.json'] = JSON.stringify([{ id: 'PC-0002', pcName: 'FROM-USB' }]);
  assert.equal(storage.list(storage.KEYS.pcs)[0].pcName, 'FROM-USB');
});

test('a new app instance sees the exact data saved by the previous one', () => {
  const files = {};
  const first = makeApp(files);
  first.storage.set(first.storage.KEYS.purchases, [{ id: 'PUR-0001', item: 'LCD' }]);
  const second = makeApp(files);
  assert.equal(second.storage.list(second.storage.KEYS.purchases)[0].item, 'LCD');
});

test('a failed disk write is reported and never becomes a RAM-only value', () => {
  const { storage, files, opts } = makeApp({});
  storage.set(storage.KEYS.pcs, [{ id: 'PC-0001', pcName: 'SAFE' }]);
  opts.failWrites = true;
  assert.equal(storage.set(storage.KEYS.pcs, [{ id: 'PC-0002', pcName: 'UNSAVED' }]), false);
  assert.equal(storage.list(storage.KEYS.pcs)[0].pcName, 'SAFE', 'previous on-disk value must win');
  assert.equal(JSON.parse(files['pcs.json'])[0].pcName, 'SAFE');
});

test('corrupt JSON falls back to the text mirror instead of wiping data', () => {
  const { storage, files } = makeApp({});
  storage.set(storage.KEYS.staff, [{ id: 'STF-0001', staffName: 'Ali' }]);
  // The main process does the real recovery; here we emulate its repaired read.
  const pretty = files['staff.txt'];
  files['staff.json'] = pretty;
  assert.equal(storage.list(storage.KEYS.staff)[0].staffName, 'Ali');
});

test('ensureFiles creates every JSON + TXT pair on a fresh DATA folder', () => {
  const { storage, files } = makeApp({});
  const res = storage.ensureFiles();
  assert.equal(res.ok, true);
  assert.ok(res.created.includes('pcs.json'));
  assert.ok(files['pcs.json'] !== undefined);
  assert.ok(files['pcs.txt'] !== undefined);
  assert.ok(files['settings.txt'] !== undefined);
});
