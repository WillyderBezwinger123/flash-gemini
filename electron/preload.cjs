const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadStorage: () => ipcRenderer.invoke('storage:load'),
  saveStorage: (data) => ipcRenderer.invoke('storage:save', data),
  notify: (payload) => ipcRenderer.invoke('app:notify', payload),
  detectGhToken: () => ipcRenderer.invoke('sync:detect-gh-token'),
});
