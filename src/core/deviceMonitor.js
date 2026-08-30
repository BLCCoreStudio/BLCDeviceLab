function cloneDevice(device) {
  return {
    serial: device.serial,
    identity: device.identity || device.serial,
    state: device.state,
    metadata: { ...(device.metadata || {}) },
    transports: (device.transports || []).map((transport) => ({ ...transport })),
    raw: device.raw,
  };
}

function deviceKey(device) {
  return device.identity || device.serial;
}

export function diffDevices(previous = [], next = []) {
  const before = new Map(previous.map((device) => [deviceKey(device), device]));
  const after = new Map(next.map((device) => [deviceKey(device), device]));
  const changes = [];

  for (const [identity, device] of after) {
    const old = before.get(identity);
    if (!old) {
      changes.push({ type: 'connected', serial: device.serial, state: device.state });
      continue;
    }
    if (old.state !== device.state) {
      changes.push({ type: 'state', serial: device.serial, from: old.state, to: device.state });
    }
  }

  for (const [identity, device] of before) {
    if (!after.has(identity)) changes.push({ type: 'disconnected', serial: device.serial, state: device.state });
  }

  return changes;
}

export function deviceFingerprint(devices = []) {
  return [...devices]
    .map((device) => {
      const transports = (device.transports || [])
        .map((transport) => `${transport.serial}:${transport.state}:${transport.type || ''}`)
        .sort()
        .join(',');
      return `${deviceKey(device)}\u0000${device.serial}\u0000${device.state}\u0000${device.metadata?.model || ''}\u0000${transports}`;
    })
    .sort()
    .join('\u0001');
}

export function planReconnects(endpoints, devices, lastAttempts, now = Date.now(), cooldownMs = 15000) {
  const states = new Map();
  for (const device of devices) {
    states.set(device.serial, device.state);
    for (const transport of device.transports || []) states.set(transport.serial, transport.state);
  }
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
