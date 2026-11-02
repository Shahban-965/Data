'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
function makeApp(files) {
  const window = {
    shakeelDesktop: {
      read: (name) => files[name] === undefined ? null : files[name],
      write: (name, content) => { files[name] = content; return { ok: true }; },
      dataRoot: () => 'USB:/Shakeel-Networking/DATA',
      openDataFolder: () => {}, backupNow: () => ({ ok: true }), list: () => []
    },
    addEventListener: () => {},
    localStorage: { setItem() {}, removeItem() {}, getItem() { return null; } }
  };
  const context = { window, console, JSON, Object, Array, Date, String, Math };
  vm.runInNewContext(source, context);
  window.ITL.utils = { deepClone: (v) => JSON.parse(JSON.stringify(v)) };
  return window.ITL.storage;
}

test('portable storage writes JSON files and reloads them in a new app instance', () => {
  const files = {};
  const first = makeApp(files);
  first.set(first.KEYS.pcs, [{ id: 'PC-9001', pcName: 'TEST-PC' }]);
  assert.equal(typeof files['pcs.json'], 'string');
  assert.deepEqual(JSON.parse(files['pcs.json']), [{ id: 'PC-9001', pcName: 'TEST-PC' }]);
  const second = makeApp(files);
  assert.equal(second.list(second.KEYS.pcs)[0].pcName, 'TEST-PC');
});

test('portable storage exposes folder and backup operations', () => {
  const storage = makeApp({});
  assert.equal(storage.isPortable(), true);
  assert.match(storage.dataFolder(), /DATA$/);
  assert.equal(storage.backupNow().ok, true);
});
