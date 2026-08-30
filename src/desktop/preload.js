const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blcDeviceLab', Object.freeze({
  snapshot: () => ipcRenderer.invoke('device:snapshot'),
  details: (serial) => ipcRenderer.invoke('device:details', { serial }),
  apps: (serial) => ipcRenderer.invoke('device:apps', { serial }),
  launchApp: (serial, packageName) => ipcRenderer.invoke('device:launch-app', { serial, packageName }),
  launchVirtualApp: (serial, packageName, preset) => ipcRenderer.invoke('device:launch-virtual-app', { serial, packageName, preset }),
  pair: (address, code) => ipcRenderer.invoke('device:pair', { address, code }),
  connect: (address) => ipcRenderer.invoke('device:connect', { address }),
  mirror: (serial, profile) => ipcRenderer.invoke('device:mirror', { serial, profile }),
  installApk: (serial) => ipcRenderer.invoke('device:install-apk', { serial }),
  workspaceSession: () => ipcRenderer.invoke('workspace:session'),
  saveWorkspaceSession: (patch) => ipcRenderer.invoke('workspace:update', patch),
  onDeviceUpdate: (callback) => ipcRenderer.on('device:update', (_event, payload) => callback(payload)),
  onMonitorError: (callback) => ipcRenderer.on('device:monitor-error', (_event, payload) => callback(payload)),
  onSelfHeal: (callback) => ipcRenderer.on('device:self-heal', (_event, payload) => callback(payload)),
  screenshot: (serial) => ipcRenderer.invoke('capture:screenshot', { serial }),
  startRecording: (serial, profile) => ipcRenderer.invoke('capture:start-recording', { serial, profile }),
  stopRecording: (id) => ipcRenderer.invoke('capture:stop-recording', { id }),
  captureState: () => ipcRenderer.invoke('capture:state'),
}));
