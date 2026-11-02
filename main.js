'use strict';
/* ==========================================================================
   main.js — Electron main process · PERMANENT portable data engine (v2)

   Rules this build follows:
     * DATA/ is the ONLY source of truth. Nothing lives only in RAM.
     * Every save is written twice: <name>.json (machine format) and
       <name>.txt (human-readable JSON text). Both travel with the folder.
     * Every save is atomic (temp file -> fsync -> rename) and read back
       from disk to verify that the bytes really landed.
     * A damaged .json is repaired from its .txt twin, never silently wiped.
     * One previous version per file per day is kept in DATA/backup/<date>.
     * Every save is recorded in DATA/save-log.txt (portable audit trail).
   ========================================================================== */
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const APP_DIR = app.isPackaged
  ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath))
  : __dirname;
const DATA_DIR = path.join(APP_DIR, 'DATA');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const CORRUPT_DIR = path.join(DATA_DIR, 'backup', 'corrupt');
const SAVE_LOG = path.join(DATA_DIR, 'save-log.txt');
const MAX_LOG_BYTES = 256 * 1024;

const ALLOWED = new Set([
  'pcs.json', 'staff.json', 'maintenance.json', 'store.json',
  'stock-transactions.json', 'purchases.json', 'activity-logs.json',
  'settings.json', 'import-history.json', 'ui-state.json', 'meta.json',
  'auth.json'
]);

function ensureFolders() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function safeName(name) {
  if (typeof name !== 'string' || !ALLOWED.has(name)) throw new Error('Invalid data file: ' + name);
  return name;
}

function mirrorOf(name) { return name.replace(/\.json$/i, '.txt'); }
function sha(text) { return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

/** Write a file atomically, fsync it, then read it back and compare. */
function atomicWrite(file, content, verify) {
  const tmp = file + '.writing';
  fs.writeFileSync(tmp, content, { encoding: 'utf8', flag: 'w' });
  const fd = fs.openSync(tmp, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
  if (verify !== false && fs.readFileSync(file, 'utf8') !== content) {
    throw new Error('Read-back verification failed for ' + path.basename(file));
  }
}

function snapshotOnce(file, name) {
  if (!fs.existsSync(file)) return;
  const day = new Date().toISOString().slice(0, 10);
  const daily = path.join(BACKUP_DIR, day);
  fs.mkdirSync(daily, { recursive: true });
  const target = path.join(daily, name);
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
}

function appendSaveLog(line) {
  try {
    let old = '';
    if (fs.existsSync(SAVE_LOG)) {
      const stat = fs.statSync(SAVE_LOG);
      if (stat.size > MAX_LOG_BYTES) {
        old = fs.readFileSync(SAVE_LOG, 'utf8').slice(-Math.floor(MAX_LOG_BYTES / 2));
        old = old.slice(old.indexOf('\n') + 1);
      } else old = fs.readFileSync(SAVE_LOG, 'utf8');
    }
    atomicWrite(SAVE_LOG, old + line + '\n', false);
  } catch (e) { /* a broken log must never break a data save */ }
}

function parseable(text) {
  try { JSON.parse(text); return true; } catch (e) { return false; }
}

/** Quarantine a broken file instead of deleting the user's only copy. */
function quarantine(file) {
  if (!fs.existsSync(file)) return null;
  try {
    fs.mkdirSync(CORRUPT_DIR, { recursive: true });
    const dest = path.join(CORRUPT_DIR, stamp() + '-' + path.basename(file));
    fs.copyFileSync(file, dest);
    return dest;
  } catch (e) { return null; }
}

/**
 * Read a canonical JSON file. If it is unreadable, rebuild it from the .txt
 * mirror. If both are broken, quarantine the originals and return null so the
 * renderer can create a fresh, valid file WITHOUT losing the damaged copy.
 */
function readValid(name) {
  const file = path.join(DATA_DIR, name);
  const mirror = path.join(DATA_DIR, mirrorOf(name));

  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    if (parseable(text)) {
      if (!fs.existsSync(mirror)) {
        try { atomicWrite(mirror, prettify(text), true); } catch (e) { /* non-fatal */ }
      }
      return text;
    }
  }

  if (fs.existsSync(mirror)) {
    const text = fs.readFileSync(mirror, 'utf8');
    if (parseable(text)) {
      const canonical = JSON.stringify(JSON.parse(text));
      atomicWrite(file, canonical, true);
      appendSaveLog(new Date().toISOString() + '  RECOVER  ' + name + '  from ' + mirrorOf(name) + '  ' + sha(canonical));
      return canonical;
    }
  }

  if (fs.existsSync(file)) {
    const q = quarantine(file);
    fs.unlinkSync(file);
    appendSaveLog(new Date().toISOString() + '  QUARANTINE  ' + name + '  ' + (q || 'copy failed'));
  }
  return null;
}

function prettify(text) {
  return JSON.stringify(JSON.parse(text), null, 2) + '\n';
}

/** The one and only write path: JSON + TXT, verified, logged, backed up. */
function writeBoth(name, content, opts) {
  opts = opts || {};
  if (typeof content !== 'string' || content.length > 50 * 1024 * 1024) {
    throw new Error('Invalid or oversized data');
  }
  if (!parseable(content)) throw new Error('Refusing to write non-JSON data to ' + name);
  const file = path.join(DATA_DIR, name);
  const mirror = path.join(DATA_DIR, mirrorOf(name));
  const pretty = prettify(content);

  snapshotOnce(file, name);
  snapshotOnce(mirror, mirrorOf(name));

  atomicWrite(file, content, true);
  atomicWrite(mirror, pretty, true);

  // Verify the mirror holds exactly the same data, not just valid JSON.
  if (JSON.stringify(JSON.parse(fs.readFileSync(mirror, 'utf8'))) !== JSON.stringify(JSON.parse(content))) {
    throw new Error('Text mirror verification failed for ' + name);
  }
  if (!opts.silent) {
    appendSaveLog(new Date().toISOString() + '  SAVE  ' + name + '  ' + Buffer.byteLength(content, 'utf8') + ' bytes  ' + sha(content));
  }
  return { ok: true, bytes: Buffer.byteLength(content, 'utf8'), hash: sha(content), mirror: mirrorOf(name) };
}

/* ------------------------------------------------------------------ IPC */
ipcMain.on('shakeel:data-root', (event) => {
  try { ensureFolders(); event.returnValue = DATA_DIR; }
  catch (e) { event.returnValue = { error: e.message }; }
});

ipcMain.on('shakeel:app-info', (event) => {
  event.returnValue = {
    version: app.getVersion(), dataDir: DATA_DIR, packaged: app.isPackaged,
    engine: 'permanent-json-txt-v2'
  };
});

ipcMain.on('shakeel:data-read', (event, name) => {
  try {
    ensureFolders();
    const safe = safeName(name);
    event.returnValue = readValid(safe);
  } catch (error) { event.returnValue = { error: error.message }; }
});

ipcMain.on('shakeel:data-write', (event, name, content) => {
  try {
    ensureFolders();
    event.returnValue = writeBoth(safeName(name), content);
  } catch (error) { event.returnValue = { ok: false, error: error.message }; }
});

/** Create any missing files and heal damaged ones. Called once on boot. */
ipcMain.on('shakeel:data-ensure', (event, defaults) => {
  try {
    ensureFolders();
    const created = [], repaired = [];
    Object.keys(defaults || {}).forEach((name) => {
      if (!ALLOWED.has(name)) return;
      const file = path.join(DATA_DIR, name);
      const mirror = path.join(DATA_DIR, mirrorOf(name));
      const content = typeof defaults[name] === 'string' ? defaults[name] : JSON.stringify(defaults[name]);
      if (!parseable(content)) return;
      if (!fs.existsSync(file)) {
        writeBoth(name, content, { silent: true });
        created.push(name);
      } else {
        const before = fs.readFileSync(file, 'utf8');
        const valid = readValid(name);
        if (valid === null) { writeBoth(name, content, { silent: true }); repaired.push(name); }
        else if (valid !== before) repaired.push(name);
        else if (!fs.existsSync(mirror)) {
          atomicWrite(mirror, prettify(valid), true);
          repaired.push(name);
        }
      }
    });
    // The lock file is optional but must still exist as a JSON+TXT pair.
    if (!fs.existsSync(path.join(DATA_DIR, 'auth.json'))) {
      writeBoth('auth.json', '{}', { silent: true });
      created.push('auth.json');
    } else readValid('auth.json');
    event.returnValue = { ok: true, created, repaired, dataDir: DATA_DIR };
  } catch (error) { event.returnValue = { ok: false, error: error.message }; }
});

/** Disk health: used by the UI so the "last saved" date comes from DATA. */
ipcMain.on('shakeel:data-status', (event) => {
  try {
    ensureFolders();
    const files = fs.readdirSync(DATA_DIR)
      .filter((n) => n.endsWith('.json') || n.endsWith('.txt') || n === 'save-log.txt')
      .map((name) => {
        const st = fs.statSync(path.join(DATA_DIR, name));
        return { name, bytes: st.size, modified: st.mtime.toISOString() };
      });
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'meta.json'), 'utf8')) || {}; }
    catch (e) { /* meta is repaired by data-ensure */ }
    let writable = true;
    try { fs.accessSync(DATA_DIR, fs.constants.W_OK); } catch (e) { writable = false; }
    event.returnValue = {
      ok: true, writable, dataDir: DATA_DIR, files,
      lastWrite: meta.lastWrite || null, createdAt: meta.createdAt || null,
      writeCount: meta.writeCount || 0, lastKey: meta.lastKey || '',
      logBytes: fs.existsSync(SAVE_LOG) ? fs.statSync(SAVE_LOG).size : 0
    };
  } catch (error) { event.returnValue = { ok: false, writable: false, error: error.message, files: [] }; }
});

/** Compare every .json with its .txt twin — used by the integrity panel. */
ipcMain.on('shakeel:data-verify', (event) => {
  try {
    ensureFolders();
    const missing = [], mismatch = [], checked = [];
    for (const name of ALLOWED) {
      const file = path.join(DATA_DIR, name);
      const mirror = path.join(DATA_DIR, mirrorOf(name));
      if (name === 'auth.json' && !fs.existsSync(file)) continue; // optional lock file
      if (!fs.existsSync(file)) { missing.push(name); continue; }
      if (!fs.existsSync(mirror)) { missing.push(mirrorOf(name)); continue; }
      const a = fs.readFileSync(file, 'utf8'), b = fs.readFileSync(mirror, 'utf8');
      if (!parseable(a) || !parseable(b)) { mismatch.push(name); continue; }
      if (JSON.stringify(JSON.parse(a)) !== JSON.stringify(JSON.parse(b))) mismatch.push(name);
      else checked.push(name);
    }
    event.returnValue = { ok: !missing.length && !mismatch.length, missing, mismatch, checked };
  } catch (error) { event.returnValue = { ok: false, error: error.message, missing: [], mismatch: [], checked: [] }; }
});

ipcMain.on('shakeel:data-list', (event) => {
  try {
    ensureFolders();
    event.returnValue = fs.readdirSync(DATA_DIR)
      .filter((n) => n.endsWith('.json') || n.endsWith('.txt'))
      .map((name) => {
        const st = fs.statSync(path.join(DATA_DIR, name));
        return { name, bytes: st.size, modified: st.mtime.toISOString() };
      });
  } catch (error) { event.returnValue = []; }
});

ipcMain.on('shakeel:open-data-folder', () => { try { ensureFolders(); shell.openPath(DATA_DIR); } catch (e) { /* ignore */ } });

ipcMain.on('shakeel:backup-now', (event) => {
  try {
    ensureFolders();
    const dest = path.join(BACKUP_DIR, 'manual-' + stamp());
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(DATA_DIR)) {
      if (!(name.endsWith('.json') || name.endsWith('.txt'))) continue;
      fs.copyFileSync(path.join(DATA_DIR, name), path.join(dest, name));
    }
    event.returnValue = { ok: true, path: dest };
  } catch (error) { event.returnValue = { ok: false, error: error.message }; }
});

/* --------------------------------------------------------------- Window */
function createWindow() {
  try { ensureFolders(); }
  catch (error) {
    dialog.showErrorBox('Shakeel Networking — DATA folder unavailable',
      'The portable DATA folder could not be created or accessed. Make sure the USB drive is connected and writable.\n\n' + error.message);
    app.quit();
    return;
  }
  const win = new BrowserWindow({
    width: 1500, height: 960, minWidth: 1050, minHeight: 700,
    title: 'Shakeel Networking — ATLAS Portable',
    backgroundColor: '#f4f5f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins[0]) { if (wins[0].isMinimized()) wins[0].restore(); wins[0].focus(); }
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstance) return;
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
