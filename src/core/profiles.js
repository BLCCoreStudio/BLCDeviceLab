const PROFILES = Object.freeze({
  balanced: Object.freeze({
    id: 'balanced',
    label: 'Balanced',
    description: 'Sharp 1080p-class mirroring with smooth interaction.',
    options: Object.freeze({ maxSize: 1920, maxFps: 60, videoBitRate: '8M', stayAwake: true }),
  }),
  latency: Object.freeze({
    id: 'latency',
    label: 'Low latency',
    description: 'Lighter stream for responsive control on slower links.',
    options: Object.freeze({ maxSize: 1280, maxFps: 60, videoBitRate: '4M', stayAwake: true }),
  }),
  quality: Object.freeze({
    id: 'quality',
    label: 'High quality',
    description: 'Higher detail for demos, previews and capture workflows.',
    options: Object.freeze({ maxSize: 2560, maxFps: 60, videoBitRate: '16M', stayAwake: true }),
  }),
});

export function listProfiles() {
  return Object.values(PROFILES).map(({ id, label, description }) => ({ id, label, description }));
}

export function getProfile(id = 'balanced') {
  const profile = PROFILES[id];
  if (!profile) throw new Error('Unknown mirror profile.');
  return profile;
}
