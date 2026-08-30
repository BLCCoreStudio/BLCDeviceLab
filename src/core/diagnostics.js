import { adbVersion, listDevices } from './adb.js';
import { scrcpyVersion } from './scrcpy.js';

async function probe(label, fn) {
  try {
    const result = await fn();
    if (Array.isArray(result)) return { label, ok: true, details: result };
    return {
      label,
      ok: result.code === 0,
      details: (result.stdout || result.stderr || '').trim(),
    };
  } catch (error) {
    return { label, ok: false, details: error.message };
  }
}

export async function doctor() {
  const [adb, scrcpy, devices] = await Promise.all([
    probe('adb', adbVersion),
    probe('scrcpy', scrcpyVersion),
    probe('devices', listDevices),
  ]);

  const hints = [];
  if (!adb.ok) hints.push('ADB was not found. Install Android Platform Tools and ensure adb is on PATH.');
  if (!scrcpy.ok) hints.push('scrcpy was not found. Install an official scrcpy build and ensure it is on PATH.');
  if (devices.ok && devices.details.length === 0) hints.push('No Android device detected. Enable USB or Wireless debugging and authorize this computer.');
  if (devices.ok) {
    for (const device of devices.details) {
      if (device.state === 'unauthorized') hints.push(`Device ${device.serial} is unauthorized. Accept the debugging prompt on the device.`);
      if (device.state === 'offline') hints.push(`Device ${device.serial} is offline. Reconnect it or restart adb.`);
    }
  }

  return { probes: { adb, scrcpy, devices }, hints };
}
