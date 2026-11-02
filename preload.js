'use strict';
/* ==========================================================================
   preload.js — the ONLY bridge to the permanent DATA folder.
   Everything is synchronous: a save is confirmed before the UI moves on.
   ========================================================================== */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shakeelDesktop', Object.freeze({
  mode: 'permanent-json-txt-files',
  dataRoot: () => ipcRenderer.sendSync('shakeel:data-root'),
  appInfo: () => ipcRenderer.sendSync('shakeel:app-info'),
  read: (name) => ipcRenderer.sendSync('shakeel:data-read', name),
  write: (name, content) => ipcRenderer.sendSync('shakeel:data-write', name, content),
  ensureDefaults: (defaults) => ipcRenderer.sendSync('shakeel:data-ensure', defaults),
  status: () => ipcRenderer.sendSync('shakeel:data-status'),
  verify: () => ipcRenderer.sendSync('shakeel:data-verify'),
  list: () => ipcRenderer.sendSync('shakeel:data-list'),
  openDataFolder: () => ipcRenderer.send('shakeel:open-data-folder'),
  backupNow: () => ipcRenderer.sendSync('shakeel:backup-now')
}));
