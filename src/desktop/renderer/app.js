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

let snapshot;

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

function renderDevices() {
  deviceGrid.replaceChildren();
  const devices = snapshot?.devices ?? [];
  const profiles = snapshot?.profiles ?? [];
  const ready = devices.filter((device) => device.state === 'device');

  deviceCount.textContent = `${devices.length} detected`;
  readyCount.textContent = String(ready.length);
  emptyDevices.classList.toggle('hidden', devices.length > 0);

  for (const device of devices) {
    const card = document.createElement('article');
    card.className = 'device-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'device-title-row';
    const identity = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'device-name';
    name.textContent = (device.metadata.model || 'Android device').replaceAll('_', ' ');
    const serial = document.createElement('div');
    serial.className = 'device-serial';
    serial.textContent = device.serial;
    identity.append(name, serial);

    const state = document.createElement('span');
    const isReady = device.state === 'device';
    state.className = `device-state ${isReady ? 'ready' : 'warn'}`;
    state.textContent = isReady ? 'Ready' : device.state;
    titleRow.append(identity, state);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const select = document.createElement('select');
    select.className = 'profile-select';
    select.setAttribute('aria-label', 'Mirror profile');
    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.label;
      select.append(option);
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

    actions.append(select, mirrorButton, installButton);
    card.append(titleRow, actions);
    deviceGrid.append(card);
  }
}

function doctorCard(label, probe) {
  const card = document.createElement('article');
  card.className = 'doctor-card';
  const title = document.createElement('strong');
  title.textContent = label;
  const status = document.createElement('span');
  status.className = `health ${probe?.ok ? 'good' : 'bad'}`;
  status.textContent = probe?.ok ? 'READY' : 'NEEDS ATTENTION';
  card.append(title, status);
  return card;
}

function renderDoctor() {
  doctorGrid.replaceChildren();
  hints.replaceChildren();
  const diagnostics = snapshot?.diagnostics;
  if (!diagnostics) return;
  doctorGrid.append(
    doctorCard('ADB bridge', diagnostics.adb),
    doctorCard('scrcpy engine', diagnostics.scrcpy),
    doctorCard('Device scan', diagnostics.devices),
  );
  for (const message of diagnostics.hints) {
    const item = document.createElement('div');
    item.className = 'hint';
    item.textContent = message;
    hints.append(item);
  }
}

async function refresh() {
  setBusy(refreshButton, true, 'Scanning…');
  const result = await api.snapshot();
  setBusy(refreshButton, false);
  if (!result.ok) {
    showNotice(result.error || 'Device scan failed.', 'bad');
    return;
  }
  snapshot = result.data;
  renderDevices();
  renderDoctor();
  lastUpdated.textContent = `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function runFormAction(buttonElement, action, progressLabel) {
  setBusy(buttonElement, true, progressLabel);
  const result = await action();
  setBusy(buttonElement, false);
  if (result.ok) {
    showNotice(result.message || 'Done.');
    await refresh();
  } else {
    showNotice(result.error || 'Action failed.', 'bad');
  }
}

document.querySelector('#pairButton').addEventListener('click', (event) => {
  runFormAction(event.currentTarget, () => api.pair(
    document.querySelector('#pairAddress').value,
    document.querySelector('#pairCode').value,
  ), 'Pairing…');
});

document.querySelector('#connectButton').addEventListener('click', (event) => {
  runFormAction(event.currentTarget, () => api.connect(document.querySelector('#connectAddress').value), 'Connecting…');
});

refreshButton.addEventListener('click', refresh);
for (const navButton of document.querySelectorAll('.nav-button')) {
  navButton.addEventListener('click', () => {
    document.querySelector(`#${navButton.dataset.target}`).scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.nav-button').forEach((candidate) => candidate.classList.remove('active'));
    navButton.classList.add('active');
  });
}

refresh();
