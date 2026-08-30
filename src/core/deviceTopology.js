import { listDevices } from './adb.js';

const MDNS_MARKER = '._adb-tls-connect._tcp';

function metadataSignature(device) {
  const metadata = device?.metadata || {};
  const values = [metadata.product, metadata.model, metadata.device].filter(Boolean);
  return values.length ? values.join('\u0000') : null;
}

export function transportType(serial, metadata = {}) {
  const value = String(serial || '');
  if (value.toLowerCase().includes(MDNS_MARKER)) return 'wifi-mdns';
  if (/^(?:\d{1,3}\.){3}\d{1,3}:\d+$/.test(value) || /^\[[0-9a-f:]+\]:\d+$/i.test(value)) return 'wifi';
  if (metadata.usb || metadata.transport_id) return 'usb';
  return 'other';
}

export function hardwareSerialFromMdns(serial) {
  const value = String(serial || '');
  const lower = value.toLowerCase();
  const markerIndex = lower.indexOf(MDNS_MARKER);
  if (markerIndex < 0) return null;
  let service = value.slice(0, markerIndex);
  service = service.replace(/\s+\(\d+\)$/u, '');
  if (!service.startsWith('adb-')) return null;
  const body = service.slice(4);
  const separator = body.lastIndexOf('-');
  if (separator <= 0) return null;
  return body.slice(0, separator) || null;
}

function stateRank(state) {
  if (state === 'device') return 40;
  if (state === 'unauthorized') return 30;
  if (state === 'offline') return 20;
  return 10;
}

function transportRank(device) {
  const type = transportType(device.serial, device.metadata);
  const typeRank = type === 'usb' ? 30 : type === 'wifi' ? 20 : type === 'wifi-mdns' ? 10 : 0;
  return stateRank(device.state) * 100 + typeRank;
}

function toTransport(device) {
  return {
    serial: device.serial,
    type: transportType(device.serial, device.metadata),
    state: device.state,
  };
}

function addToGroup(group, device) {
  if (!group.members.some((member) => member.serial === device.serial)) group.members.push(device);
}

function buildLogicalDevice(group) {
  const members = [...group.members].sort((a, b) => transportRank(b) - transportRank(a));
  const primary = members[0];
  const ready = members.find((member) => member.state === 'device');
  const selected = ready && transportRank(ready) >= transportRank(primary) ? ready : primary;
  const metadata = Object.assign({}, ...members.map((member) => member.metadata || {}));
  return {
    serial: selected.serial,
    identity: group.identity || selected.serial,
    state: selected.state,
    metadata,
    transports: members.map(toTransport),
    raw: selected.raw,
  };
}

export function collapseDevices(devices = []) {
  const input = devices.filter(Boolean);
  if (input.length <= 1) {
    return input.map((device) => ({
      ...device,
      identity: hardwareSerialFromMdns(device.serial) || device.serial,
      transports: [toTransport(device)],
    }));
  }

  const mdnsHardwareIds = new Set(
    input.map((device) => hardwareSerialFromMdns(device.serial)).filter(Boolean),
  );
  const groups = new Map();
  const assigned = new Set();

  function ensureGroup(identity) {
    if (!groups.has(identity)) groups.set(identity, { identity, members: [] });
    return groups.get(identity);
  }

  for (const device of input) {
    const mdnsHardware = hardwareSerialFromMdns(device.serial);
    if (mdnsHardware) {
      addToGroup(ensureGroup(mdnsHardware), device);
      assigned.add(device.serial);
    }
  }

  for (const device of input) {
    if (assigned.has(device.serial)) continue;
    if (mdnsHardwareIds.has(device.serial)) {
      addToGroup(ensureGroup(device.serial), device);
      assigned.add(device.serial);
    }
  }

  const anchoredGroups = () => [...groups.values()];
  for (const device of input) {
    if (assigned.has(device.serial)) continue;
    const signature = metadataSignature(device);
    if (!signature) continue;
    const matching = anchoredGroups().filter((group) =>
      group.members.some((member) => metadataSignature(member) === signature));
    if (matching.length === 1) {
      addToGroup(matching[0], device);
      assigned.add(device.serial);
    }
  }

  const unassigned = input.filter((device) => !assigned.has(device.serial));
  for (const device of unassigned) {
    const signature = metadataSignature(device);
    const type = transportType(device.serial, device.metadata);
    if (type !== 'wifi' || !signature) continue;
    const matchingUsb = unassigned.filter((candidate) =>
      !assigned.has(candidate.serial)
      && transportType(candidate.serial, candidate.metadata) === 'usb'
      && metadataSignature(candidate) === signature);
    if (matchingUsb.length === 1) {
      const usb = matchingUsb[0];
      const group = ensureGroup(usb.serial);
      addToGroup(group, usb);
      addToGroup(group, device);
      assigned.add(usb.serial);
      assigned.add(device.serial);
    }
  }

  for (const device of input) {
    if (assigned.has(device.serial)) continue;
    addToGroup(ensureGroup(device.serial), device);
    assigned.add(device.serial);
  }

  return [...groups.values()].map(buildLogicalDevice);
}

export async function listLogicalDevices() {
  return collapseDevices(await listDevices());
}
