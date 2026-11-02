'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shakeelDesktop', Object.freeze({
  mode: 'portable-json-files',
  dataRoot: () => ipcRenderer.sendSync('shakeel:data-root'),
  appInfo: () => ipcRenderer.sendSync('shakeel:app-info'),
  read: (name) => ipcRenderer.sendSync('shakeel:data-read', name),
  write: (name, content) => ipcRenderer.sendSync('shakeel:data-write', name, content),
  list: () => ipcRenderer.sendSync('shakeel:data-list'),
  openDataFolder: () => ipcRenderer.send('shakeel:open-data-folder'),
  backupNow: () => ipcRenderer.sendSync('shakeel:backup-now')
}));
