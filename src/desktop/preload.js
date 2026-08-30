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
  screenshot: (serial) => ipcRenderer.invoke('capture:screenshot', { serial }),
  startRecording: (serial, profile) => ipcRenderer.invoke('capture:start-recording', { serial, profile }),
  stopRecording: (id) => ipcRenderer.invoke('capture:stop-recording', { id }),
  captureState: () => ipcRenderer.invoke('capture:state'),
}));
