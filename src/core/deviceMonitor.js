function cloneDevice(device) {
  return {
    serial: device.serial,
    state: device.state,
    metadata: { ...(device.metadata || {}) },
    raw: device.raw,
  };
}

export function diffDevices(previous = [], next = []) {
  const before = new Map(previous.map((device) => [device.serial, device]));
  const after = new Map(next.map((device) => [device.serial, device]));
  const changes = [];

  for (const [serial, device] of after) {
    const old = before.get(serial);
    if (!old) {
      changes.push({ type: 'connected', serial, state: device.state });
      continue;
    }
    if (old.state !== device.state) {
      changes.push({ type: 'state', serial, from: old.state, to: device.state });
    }
  }

  for (const [serial, device] of before) {
    if (!after.has(serial)) changes.push({ type: 'disconnected', serial, state: device.state });
  }

  return changes;
}

export function deviceFingerprint(devices = []) {
  return [...devices]
    .map((device) => `${device.serial}\u0000${device.state}\u0000${device.metadata?.model || ''}`)
    .sort()
    .join('\u0001');
}

export function planReconnects(endpoints, devices, lastAttempts, now = Date.now(), cooldownMs = 15000) {
  const states = new Map(devices.map((device) => [device.serial, device.state]));
  const unique = [...new Set(endpoints)];
  return unique.filter((address) => {
    const state = states.get(address);
    if (state === 'device' || state === 'unauthorized') return false;
    const last = lastAttempts.get(address) || 0;
    return now - last >= cooldownMs;
  });
}

export class DeviceMonitor {
  constructor({ scan, intervalMs = 2500, onUpdate = () => {}, onError = () => {}, now = () => Date.now() }) {
    if (typeof scan !== 'function') throw new Error('DeviceMonitor requires a scan function.');
    this.scan = scan;
    this.intervalMs = Math.max(1000, Number(intervalMs) || 2500);
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.now = now;
    this.timer = null;
    this.inFlight = null;
    this.previous = null;
    this.fingerprint = null;
  }

  async poll({ force = false } = {}) {
    if (this.inFlight) return this.inFlight;
    this.inFlight = (async () => {
      try {
        const devices = (await this.scan()).map(cloneDevice);
        const fingerprint = deviceFingerprint(devices);
        const initial = this.previous === null;
        const changed = fingerprint !== this.fingerprint;
        const changes = initial ? [] : diffDevices(this.previous, devices);
        this.previous = devices;
        this.fingerprint = fingerprint;
        if (force || changed || initial) {
          await this.onUpdate({ devices, changes, initial, updatedAt: new Date(this.now()).toISOString() });
        }
        return devices;
      } catch (error) {
        await this.onError(error);
        return this.previous || [];
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  start() {
    if (this.timer) return;
    void this.poll({ force: true });
    this.timer = setInterval(() => { void this.poll(); }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
