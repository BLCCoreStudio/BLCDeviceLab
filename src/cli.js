#!/usr/bin/env node
import { doctor } from './core/diagnostics.js';
import { listDevices } from './core/adb.js';
import { launchScrcpy } from './core/scrcpy.js';

const [command, ...args] = process.argv.slice(2);

function printDevices(devices) {
  if (!devices.length) {
    console.log('No devices detected.');
    return;
  }
  for (const device of devices) {
    const model = device.metadata.model ? ` (${device.metadata.model})` : '';
    console.log(`${device.serial}\t${device.state}${model}`);
  }
}

switch (command) {
  case 'doctor': {
    const report = await doctor();
    for (const probe of Object.values(report.probes)) {
      console.log(`${probe.ok ? 'OK' : 'FAIL'}  ${probe.label}`);
    }
    for (const hint of report.hints) console.log(`HINT  ${hint}`);
    process.exitCode = Object.values(report.probes).every((probe) => probe.ok || probe.label === 'devices') ? 0 : 1;
    break;
  }
  case 'devices':
    printDevices(await listDevices());
    break;
  case 'mirror': {
    const serial = args[0];
    const pid = launchScrcpy({ serial, stayAwake: true });
    console.log(`scrcpy started${serial ? ` for ${serial}` : ''} (pid ${pid})`);
    break;
  }
  default:
    console.log('BLC Device Lab alpha core');
    console.log('Usage: node src/cli.js <doctor|devices|mirror [serial]>');
}
