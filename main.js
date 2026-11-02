'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DIR = app.isPackaged ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath)) : __dirname;
const DATA_DIR = path.join(APP_DIR, 'DATA');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const ALLOWED = new Set([
  'pcs.json', 'staff.json', 'maintenance.json', 'store.json',
  'stock-transactions.json', 'purchases.json', 'activity-logs.json',
  'settings.json', 'import-history.json', 'ui-state.json', 'meta.json'
]);

function ensureFolders() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

ipcMain.on('shakeel:data-root', (event) => {
  ensureFolders();
  event.returnValue = DATA_DIR;
});
ipcMain.on('shakeel:app-info', (event) => {
  event.returnValue = { version: app.getVersion(), dataDir: DATA_DIR, packaged: app.isPackaged };
});

function safeName(name) {
  if (!ALLOWED.has(name)) throw new Error('Invalid data file');
  return name;
}

ipcMain.on('shakeel:data-read', (event, name) => {
  try {
    ensureFolders();
    const file = path.join(DATA_DIR, safeName(name));
    event.returnValue = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  } catch (error) { event.returnValue = { error: error.message }; }
});
ipcMain.on('shakeel:data-write', (event, name, content) => {
  try {
    ensureFolders();
    name = safeName(name);
    if (typeof content !== 'string' || content.length > 50 * 1024 * 1024) throw new Error('Invalid or oversized data');
    const file = path.join(DATA_DIR, name);
    // Preserve the previous version once per day before overwriting it.
    if (fs.existsSync(file)) {
      const day = new Date().toISOString().slice(0, 10);
      const daily = path.join(BACKUP_DIR, day);
      fs.mkdirSync(daily, { recursive: true });
      const snapshot = path.join(daily, name);
      if (!fs.existsSync(snapshot)) fs.copyFileSync(file, snapshot);
    }
    const temp = file + '.writing';
    fs.writeFileSync(temp, content, { encoding: 'utf8', flag: 'w' });
    const fd = fs.openSync(temp, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    // fs.rename replaces the destination atomically on supported Windows filesystems.
    // If replacement fails, keep the previous file intact and report a save error.
    fs.renameSync(temp, file);
    event.returnValue = { ok: true, bytes: Buffer.byteLength(content, 'utf8') };
  } catch (error) { event.returnValue = { ok: false, error: error.message }; }
});
ipcMain.on('shakeel:data-list', (event) => {
  try {
    ensureFolders();
    event.returnValue = fs.readdirSync(DATA_DIR).filter((n) => n.endsWith('.json')).map((name) => {
      const stat = fs.statSync(path.join(DATA_DIR, name));
      return { name, bytes: stat.size, modified: stat.mtime.toISOString() };
    });
  } catch (error) { event.returnValue = []; }
});
ipcMain.on('shakeel:open-data-folder', () => { ensureFolders(); shell.openPath(DATA_DIR); });
ipcMain.on('shakeel:backup-now', (event) => {
  try {
    ensureFolders();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, 'manual-' + stamp);
    fs.mkdirSync(dest, { recursive: true });
    for (const name of ALLOWED) {
      const src = path.join(DATA_DIR, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, name));
    }
    event.returnValue = { ok: true, path: dest };
  } catch (error) { event.returnValue = { ok: false, error: error.message }; }
});

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
    title: 'Shakeel Networking — Ultimate Portable',
    backgroundColor: '#080d18',
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
