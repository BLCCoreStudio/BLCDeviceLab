import { app } from 'electron';

app.setName('BLC Device Lab');
app.setAppUserModelId('com.blccorestudio.blcdevicelab');

if (process.platform === 'linux') {
  if (typeof app.setDesktopName === 'function') app.setDesktopName('blc-device-lab.desktop');
  app.commandLine.appendSwitch('class', 'blc-device-lab');
}

await import('./main.js');
