const api = window.blcDeviceLab;
const deviceGrid = document.querySelector('#deviceGrid');
const emptyDevices = document.querySelector('#emptyDevices');
const doctorGrid = document.querySelector('#doctorGrid');
const hints = document.querySelector('#hints');
const deviceCount = document.querySelector('#deviceCount');
const readyCount = document.querySelector('#readyCount');
const lastUpdated = document.querySelector('#lastUpdated');
const notice = document.querySelector('#notice');
const refreshButton = document.querySelector('#refreshButton');
const appDeviceSelect = document.querySelector('#appDeviceSelect');
const appSearch = document.querySelector('#appSearch');
const appList = document.querySelector('#appList');
const appEmpty = document.querySelector('#appEmpty');
const loadAppsButton = document.querySelector('#loadAppsButton');
const captureDeviceSelect = document.querySelector('#captureDeviceSelect');
const captureProfileSelect = document.querySelector('#captureProfileSelect');
const screenshotButton = document.querySelector('#screenshotButton');
const recordButton = document.querySelector('#recordButton');
const captureStatus = document.querySelector('#captureStatus');
const activeRecording = document.querySelector('#activeRecording');
const captureHistory = document.querySelector('#captureHistory');
const captureEmpty = document.querySelector('#captureEmpty');

let snapshot;
let loadedApps = [];
let loadedAppsSerial = null;
let captureState = { active: [], history: [] };

function showNotice(message, kind = 'good') {
  notice.textContent = message;
  notice.className = `notice ${kind}`;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.add('hidden'), 5000);
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function button(label, className, onClick, disabled = false) {
  const element = document.createElement('button');
  element.className = `button ${className}`;
  element.textContent = label;
  element.disabled = disabled;
  element.addEventListener('click', onClick);
  return element;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function detailCell(label, value) {
  const cell = document.createElement('div');
  cell.className = 'detail-cell';
  const key = document.createElement('span'); key.textContent = label;
  const data = document.createElement('strong'); data.textContent = value ?? 'Unknown';
  cell.append(key, data);
  return cell;
}

function renderDetails(container, details) {
  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  const battery = details.battery;
  const storage = details.storage;
  grid.append(
    detailCell('Device', [details.manufacturer, details.model].filter(Boolean).join(' ') || 'Unknown'),
    detailCell('Android', details.androidVersion ? `${details.androidVersion}${details.sdk ? ` · API ${details.sdk}` : ''}` : 'Unknown'),
    detailCell('Battery', battery?.percentage === null || battery?.percentage === undefined ? 'Unknown' : `${battery.percentage}% · ${battery.statusLabel}`),
    detailCell('Temperature', battery?.temperatureC === null || battery?.temperatureC === undefined ? 'Unknown' : `${battery.temperatureC.toFixed(1)} °C`),
    detailCell('Storage used', storage ? `${storage.usePercent}% · ${formatBytes(storage.usedBytes)}` : 'Unknown'),
    detailCell('Storage free', storage ? formatBytes(storage.availableBytes) : 'Unknown'),
  );
  container.replaceChildren(grid);
}

function renderDevices() {
  deviceGrid.replaceChildren();
  const devices = snapshot?.devices ?? [];
  const profiles = snapshot?.profiles ?? [];
  const ready = devices.filter((device) => device.state === 'device');

  deviceCount.textContent = `${devices.length} detected`;
  readyCount.textContent = String(ready.length);
  emptyDevices.classList.toggle('hidden', devices.length > 0);

  const previousSelected = appDeviceSelect.value;
  appDeviceSelect.replaceChildren();
  for (const device of ready) {
    const option = document.createElement('option');
    option.value = device.serial;
    option.textContent = (device.metadata.model || device.serial).replaceAll('_', ' ');
    appDeviceSelect.append(option);
  }
  if (ready.some((device) => device.serial === previousSelected)) appDeviceSelect.value = previousSelected;
  loadAppsButton.disabled = ready.length === 0;

  const previousCapture = captureDeviceSelect.value;
  captureDeviceSelect.replaceChildren();
  for (const device of ready) {
    const option = document.createElement('option');
    option.value = device.serial;
    option.textContent = (device.metadata.model || device.serial).replaceAll('_', ' ');
    captureDeviceSelect.append(option);
  }
  if (ready.some((device) => device.serial === previousCapture)) captureDeviceSelect.value = previousCapture;

  const previousProfile = captureProfileSelect.value;
  captureProfileSelect.replaceChildren();
  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.label;
    captureProfileSelect.append(option);
  }
  if (profiles.some((profile) => profile.id === previousProfile)) captureProfileSelect.value = previousProfile;
  renderCaptureState();

  for (const device of devices) {
    const card = document.createElement('article'); card.className = 'device-card';
    const titleRow = document.createElement('div'); titleRow.className = 'device-title-row';
    const identity = document.createElement('div');
    const name = document.createElement('div'); name.className = 'device-name'; name.textContent = (device.metadata.model || 'Android device').replaceAll('_', ' ');
    const serial = document.createElement('div'); serial.className = 'device-serial'; serial.textContent = device.serial;
    identity.append(name, serial);
    const state = document.createElement('span');
    const isReady = device.state === 'device';
    state.className = `device-state ${isReady ? 'ready' : 'warn'}`;
    state.textContent = isReady ? 'Ready' : device.state;
    titleRow.append(identity, state);

    const actions = document.createElement('div'); actions.className = 'card-actions';
    const select = document.createElement('select'); select.className = 'profile-select'; select.setAttribute('aria-label', 'Mirror profile');
    for (const profile of profiles) {
      const option = document.createElement('option'); option.value = profile.id; option.textContent = profile.label; select.append(option);
    }
    const mirrorButton = button('Open workspace', 'primary', async () => {
      setBusy(mirrorButton, true, 'Opening…');
      const result = await api.mirror(device.serial, select.value);
      setBusy(mirrorButton, false);
      if (result.ok) showNotice(`Workspace started with ${select.options[select.selectedIndex].text}.`);
      else showNotice(result.error || 'Could not start workspace.', 'bad');
    }, !isReady);
    const installButton = button('Install APK', 'ghost', async () => {
      setBusy(installButton, true, 'Installing…');
      const result = await api.installApk(device.serial);
      setBusy(installButton, false);
      if (result.canceled) return;
      if (result.ok) showNotice(result.message || 'APK installed.');
      else showNotice(result.error || 'APK installation failed.', 'bad');
    }, !isReady);
    const detailsBox = document.createElement('div'); detailsBox.className = 'device-details hidden';
    const inspectButton = button('Inspect', 'ghost', async () => {
      if (!detailsBox.classList.contains('hidden')) { detailsBox.classList.add('hidden'); return; }
      setBusy(inspectButton, true, 'Reading…');
      const result = await api.details(device.serial);
      setBusy(inspectButton, false);
      if (!result.ok) { showNotice(result.error || 'Could not inspect device.', 'bad'); return; }
      renderDetails(detailsBox, result.data);
      detailsBox.classList.remove('hidden');
    }, !isReady);
    actions.append(select, mirrorButton, installButton, inspectButton);
    card.append(titleRow, actions, detailsBox);
    deviceGrid.append(card);
  }
}

function formatCaptureTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Unknown time' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function renderCaptureState() {
  const active = captureState.active ?? [];
  const history = captureState.history ?? [];
  captureHistory.replaceChildren();
  captureEmpty.classList.toggle('hidden', history.length > 0);
  captureStatus.textContent = active.length ? `${active.length} recording` : 'Idle';

  const selectedSerial = captureDeviceSelect.value;
  const selectedActive = active.find((item) => item.serial === selectedSerial) || active[0];
  activeRecording.replaceChildren();
  activeRecording.classList.toggle('hidden', !selectedActive);
  if (selectedActive) {
    const meta = document.createElement('div');
    meta.className = 'recording-meta';
    const title = document.createElement('strong');
    title.textContent = 'Recording in progress';
    const detail = document.createElement('span');
    detail.textContent = `${selectedActive.fileName || 'Recording'} · ${selectedActive.profileId || 'balanced'}`;
    meta.append(title, detail);
    const stop = button('Stop & finalize', 'secondary', async () => {
      setBusy(stop, true, 'Finalizing…');
      const result = await api.stopRecording(selectedActive.id);
      setBusy(stop, false);
      if (result.ok) { showNotice('Recording finalized.'); await refreshCaptureState(); }
      else showNotice(result.error || 'Could not stop recording.', 'bad');
    });
    activeRecording.append(meta, stop);
  }

  const activeSerials = new Set(active.map((item) => item.serial));
  recordButton.disabled = !selectedSerial || activeSerials.has(selectedSerial);
  screenshotButton.disabled = !selectedSerial;

  for (const entry of history.slice(0, 20)) {
    const row = document.createElement('div');
    row.className = 'capture-row';
    const kind = document.createElement('div');
    kind.className = 'capture-kind';
    kind.textContent = entry.type === 'recording' ? '●' : '▣';
    const file = document.createElement('div');
    file.className = 'capture-file';
    const name = document.createElement('strong');
    name.textContent = entry.fileName || 'Capture';
    const time = document.createElement('span');
    time.textContent = formatCaptureTime(entry.endedAt || entry.createdAt || entry.startedAt);
    file.append(name, time);
    const state = document.createElement('span');
    state.className = `capture-state ${entry.status === 'recording' ? 'recording' : ''}`;
    state.textContent = entry.status || 'completed';
    row.append(kind, file, state);
    captureHistory.append(row);
  }
}

async function refreshCaptureState() {
  const result = await api.captureState();
  if (!result.ok) return;
  captureState = result.data;
  renderCaptureState();
}

function renderApps() {
  appList.replaceChildren();
  const term = appSearch.value.trim().toLowerCase();
  const apps = loadedApps.filter((packageName) => packageName.toLowerCase().includes(term));
  appEmpty.classList.toggle('hidden', apps.length > 0);
  appEmpty.textContent = loadedApps.length === 0 ? 'Choose a ready device and load its user-installed packages.' : 'No packages match this filter.';
  for (const packageName of apps) {
    const row = document.createElement('div'); row.className = 'app-row';
    const label = document.createElement('div'); label.className = 'app-package'; label.textContent = packageName;
    const launchButton = button('Open', 'ghost', async () => {
      setBusy(launchButton, true, 'Opening…');
      const result = await api.launchApp(loadedAppsSerial, packageName);
      setBusy(launchButton, false);
      if (result.ok) showNotice(result.message || `Opened ${packageName}.`);
      else showNotice(result.error || 'Could not open application.', 'bad');
    });
    row.append(label, launchButton); appList.append(row);
  }
}

function doctorCard(label, probe) {
  const card = document.createElement('article'); card.className = 'doctor-card';
  const title = document.createElement('strong'); title.textContent = label;
  const status = document.createElement('span'); status.className = `health ${probe?.ok ? 'good' : 'bad'}`; status.textContent = probe?.ok ? 'READY' : 'NEEDS ATTENTION';
  card.append(title, status); return card;
}

function renderDoctor() {
  doctorGrid.replaceChildren(); hints.replaceChildren();
  const diagnostics = snapshot?.diagnostics; if (!diagnostics) return;
  doctorGrid.append(doctorCard('ADB bridge', diagnostics.adb), doctorCard('scrcpy engine', diagnostics.scrcpy), doctorCard('Device scan', diagnostics.devices));
  for (const message of diagnostics.hints) { const item = document.createElement('div'); item.className = 'hint'; item.textContent = message; hints.append(item); }
}

async function refresh() {
  setBusy(refreshButton, true, 'Scanning…');
  const result = await api.snapshot();
  setBusy(refreshButton, false);
  if (!result.ok) { showNotice(result.error || 'Device scan failed.', 'bad'); return; }
  snapshot = result.data; renderDevices(); renderDoctor();
  await refreshCaptureState();
  lastUpdated.textContent = `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function runFormAction(buttonElement, action, progressLabel) {
  setBusy(buttonElement, true, progressLabel); const result = await action(); setBusy(buttonElement, false);
  if (result.ok) { showNotice(result.message || 'Done.'); await refresh(); } else showNotice(result.error || 'Action failed.', 'bad');
}

document.querySelector('#pairButton').addEventListener('click', (event) => runFormAction(event.currentTarget, () => api.pair(document.querySelector('#pairAddress').value, document.querySelector('#pairCode').value), 'Pairing…'));
document.querySelector('#connectButton').addEventListener('click', (event) => runFormAction(event.currentTarget, () => api.connect(document.querySelector('#connectAddress').value), 'Connecting…'));
loadAppsButton.addEventListener('click', async () => {
  const serial = appDeviceSelect.value; if (!serial) return;
  setBusy(loadAppsButton, true, 'Loading…'); const result = await api.apps(serial); setBusy(loadAppsButton, false);
  if (!result.ok) { showNotice(result.error || 'Could not load applications.', 'bad'); return; }
  loadedAppsSerial = serial; loadedApps = result.data; renderApps();
});
screenshotButton.addEventListener('click', async () => {
  const serial = captureDeviceSelect.value;
  if (!serial) return;
  setBusy(screenshotButton, true, 'Capturing…');
  const result = await api.screenshot(serial);
  setBusy(screenshotButton, false);
  if (result.canceled) return;
  if (result.ok) { showNotice('Screenshot saved.'); await refreshCaptureState(); }
  else showNotice(result.error || 'Screenshot failed.', 'bad');
});

recordButton.addEventListener('click', async () => {
  const serial = captureDeviceSelect.value;
  if (!serial) return;
  setBusy(recordButton, true, 'Starting…');
  const result = await api.startRecording(serial, captureProfileSelect.value || 'balanced');
  setBusy(recordButton, false);
  if (result.canceled) return;
  if (result.ok) { showNotice('Recording started.'); await refreshCaptureState(); }
  else showNotice(result.error || 'Could not start recording.', 'bad');
});

captureDeviceSelect.addEventListener('change', renderCaptureState);
appSearch.addEventListener('input', renderApps);
appDeviceSelect.addEventListener('change', () => { loadedApps = []; loadedAppsSerial = null; renderApps(); });
refreshButton.addEventListener('click', refresh);
for (const navButton of document.querySelectorAll('.nav-button')) {
  navButton.addEventListener('click', () => {
    document.querySelector(`#${navButton.dataset.target}`).scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.nav-button').forEach((candidate) => candidate.classList.remove('active')); navButton.classList.add('active');
  });
}
refresh();
