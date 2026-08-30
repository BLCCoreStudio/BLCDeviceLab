const ADDRESS_PATTERN = /^(?:\[[0-9a-fA-F:]+\]|[A-Za-z0-9._-]+):(\d{1,5})$/;
const SERIAL_PATTERN = /^[A-Za-z0-9._:%\-\[\]]{1,200}$/;
const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;

export function normalizeAddress(value) {
  const address = String(value ?? '').trim();
  if (!address || address.length > 255 || /\s/.test(address)) {
    throw new Error('Enter a valid host and port, for example 192.168.1.20:37123.');
  }

  const match = address.match(ADDRESS_PATTERN);
  if (!match) {
    throw new Error('Enter a valid host and port, for example 192.168.1.20:37123.');
  }

  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be between 1 and 65535.');
  }

  return address;
}

export function normalizePairCode(value) {
  const code = String(value ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Pairing code must contain exactly 6 digits.');
  }
  return code;
}

export function normalizeSerial(value) {
  const serial = String(value ?? '').trim();
  if (!SERIAL_PATTERN.test(serial)) {
    throw new Error('Invalid device identifier. Refresh the device list and try again.');
  }
  return serial;
}

export function normalizePackageName(value) {
  const packageName = String(value ?? '').trim();
  if (packageName.length > 255 || !PACKAGE_PATTERN.test(packageName)) {
    throw new Error('Invalid application package identifier.');
  }
  return packageName;
}
