function integerField(output, key) {
  const match = output.match(new RegExp(`^\\s*${key}:\\s*(-?\\d+)\\s*$`, 'm'));
  return match ? Number(match[1]) : null;
}

export function parseBattery(output) {
  const level = integerField(output, 'level');
  const scale = integerField(output, 'scale');
  const status = integerField(output, 'status');
  const temperatureRaw = integerField(output, 'temperature');
  const plugged = integerField(output, 'plugged');
  const percentage = level !== null && scale ? Math.max(0, Math.min(100, Math.round((level / scale) * 100))) : null;

  const statusLabels = {
    1: 'Unknown',
    2: 'Charging',
    3: 'Discharging',
    4: 'Not charging',
    5: 'Full',
  };

  return {
    level,
    scale,
    percentage,
    status,
    statusLabel: statusLabels[status] || 'Unknown',
    temperatureC: temperatureRaw === null ? null : temperatureRaw / 10,
    plugged: plugged ?? 0,
  };
}

export function parseStorage(output) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const data = [...lines].reverse().find((line) => /\s\d+%\s/.test(` ${line} `));
  if (!data) return null;
  const columns = data.split(/\s+/);
  if (columns.length < 5) return null;
  const totalKb = Number(columns[1]);
  const usedKb = Number(columns[2]);
  const availableKb = Number(columns[3]);
  const usePercent = Number.parseInt(columns[4], 10);
  if (![totalKb, usedKb, availableKb, usePercent].every(Number.isFinite)) return null;
  return {
    totalBytes: totalKb * 1024,
    usedBytes: usedKb * 1024,
    availableBytes: availableKb * 1024,
    usePercent,
  };
}

export function parsePackages(output) {
  return [...new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('package:'))
      .map((line) => line.slice('package:'.length).trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}
