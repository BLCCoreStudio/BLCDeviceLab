const api = window.blcDeviceLab;
const appList = document.querySelector('#appList');
const appToolbar = document.querySelector('.app-toolbar');
const appDeviceSelect = document.querySelector('#appDeviceSelect');
const loadAppsButton = document.querySelector('#loadAppsButton');
const notice = document.querySelector('#notice');
const refreshButton = document.querySelector('#refreshButton');

let virtualWorkspace = { available: false, presets: [] };
let presetSelect;

function showNotice(message, kind = 'good') {
  if (!notice) return;
  notice.textContent = message;
  notice.className = `notice ${kind}`;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.add('hidden'), 5000);
}

function ensurePresetPicker() {
  if (!virtualWorkspace.available || !virtualWorkspace.presets?.length) {
    presetSelect?.closest('label')?.remove();
    presetSelect = undefined;
    return;
  }

  if (!presetSelect) {
    const label = document.createElement('label');
    label.dataset.virtualWorkspace = 'preset';
    label.append('Virtual workspace');
    presetSelect = document.createElement('select');
    presetSelect.id = 'virtualWorkspacePreset';
    label.append(presetSelect);
    appToolbar?.insertBefore(label, loadAppsButton || null);
  }

  const previous = presetSelect.value;
  presetSelect.replaceChildren();
  for (const preset of virtualWorkspace.presets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    option.title = preset.description || '';
    presetSelect.append(option);
  }
  if (virtualWorkspace.presets.some((preset) => preset.id === previous)) presetSelect.value = previous;
}

function enhanceAppRows() {
  for (const row of appList?.querySelectorAll('.app-row') || []) {
    if (row.dataset.virtualWorkspaceEnhanced === 'true') continue;
    row.dataset.virtualWorkspaceEnhanced = 'true';
    if (!virtualWorkspace.available || !virtualWorkspace.presets?.length) continue;

    const packageLabel = row.querySelector('.app-package');
    if (!packageLabel) continue;
    const packageName = packageLabel.textContent?.trim();
    if (!packageName) continue;

    const openButton = document.createElement('button');
    openButton.className = 'button ghost';
    openButton.textContent = 'Virtual workspace';
    openButton.addEventListener('click', async () => {
      const serial = appDeviceSelect?.value;
      const preset = presetSelect?.value || virtualWorkspace.presets[0]?.id;
      if (!serial || !preset) return;
      openButton.disabled = true;
      const original = openButton.textContent;
      openButton.textContent = 'Opening…';
      const result = await api.launchVirtualApp(serial, packageName, preset);
      openButton.disabled = false;
      openButton.textContent = original;
      if (result.ok) showNotice(result.message || 'Virtual workspace opened.');
      else showNotice(result.error || 'Could not open virtual workspace.', 'bad');
    });
    row.append(openButton);
  }
}

async function refreshCapability() {
  const result = await api.snapshot();
  if (!result?.ok) return;
  virtualWorkspace = result.data?.virtualWorkspace || { available: false, presets: [] };
  ensurePresetPicker();
  enhanceAppRows();
}

const observer = new MutationObserver(enhanceAppRows);
if (appList) observer.observe(appList, { childList: true });
refreshButton?.addEventListener('click', () => setTimeout(() => { void refreshCapability(); }, 350));
void refreshCapability();
