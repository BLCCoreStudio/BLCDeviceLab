import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('blcDeviceLab', Object.freeze({
  snapshot: () => ipcRenderer.invoke('device:snapshot'),
  details: (serial) => ipcRenderer.invoke('device:details', { serial }),
  apps: (serial) => ipcRenderer.invoke('device:apps', { serial }),
  launchApp: (serial, packageName) => ipcRenderer.invoke('device:launch-app', { serial, packageName }),
  pair: (address, code) => ipcRenderer.invoke('device:pair', { address, code }),
  connect: (address) => ipcRenderer.invoke('device:connect', { address }),
  mirror: (serial, profile) => ipcRenderer.invoke('device:mirror', { serial, profile }),
  installApk: (serial) => ipcRenderer.invoke('device:install-apk', { serial }),
}));
