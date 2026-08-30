const PRESETS = Object.freeze({
  responsive: Object.freeze({
    id: 'responsive',
    label: 'Responsive',
    description: 'A resizable virtual display that follows the desktop window.',
    options: Object.freeze({ newDisplay: true, flexDisplay: true, videoBitRate: '12M', maxFps: 60 }),
  }),
  desktop: Object.freeze({
    id: 'desktop',
    label: 'Desktop 1080p',
    description: 'A fixed 1920×1080 workspace for landscape apps and demos.',
    options: Object.freeze({ newDisplay: '1920x1080/240', videoBitRate: '12M', maxFps: 60 }),
  }),
  tablet: Object.freeze({
    id: 'tablet',
    label: 'Tablet',
    description: 'A 1600×1200 workspace for tablet-style layouts and QA.',
    options: Object.freeze({ newDisplay: '1600x1200/240', videoBitRate: '10M', maxFps: 60 }),
  }),
});

export function listVirtualWorkspacePresets() {
  return Object.values(PRESETS).map(({ id, label, description }) => ({ id, label, description }));
}

export function getVirtualWorkspacePreset(id = 'responsive') {
  const preset = PRESETS[id];
  if (!preset) throw new Error('Unknown virtual workspace preset.');
  return preset;
}

export function detectVirtualWorkspaceCapabilities(helpText = '') {
  const text = String(helpText);
  return {
    newDisplay: text.includes('--new-display'),
    flexDisplay: text.includes('--flex-display'),
    startApp: text.includes('--start-app'),
  };
}

export function canLaunchVirtualWorkspace(capabilities, preset) {
  if (!capabilities?.newDisplay || !capabilities?.startApp) return false;
  if (preset?.options?.flexDisplay && !capabilities.flexDisplay) return false;
  return true;
}
