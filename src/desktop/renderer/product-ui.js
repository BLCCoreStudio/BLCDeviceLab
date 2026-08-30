const readyCount = document.querySelector('#readyCount');
const deviceCount = document.querySelector('#deviceCount');
const connectionBadge = document.querySelector('#connectionBadge');
const doctorGrid = document.querySelector('#doctorGrid');

function numberFrom(element) {
  const match = String(element?.textContent || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function updateConnectionBadge() {
  if (!connectionBadge) return;
  const count = numberFrom(readyCount);
  const label = connectionBadge.querySelector('.connection-label');
  if (label) label.textContent = count > 0
    ? `${count} device${count === 1 ? '' : 's'} connected`
    : 'No device connected';
  connectionBadge.classList.toggle('offline', count === 0);
}

function updateDeviceDoctorState() {
  if (!doctorGrid) return;
  const cards = doctorGrid.querySelectorAll('.doctor-card');
  if (cards.length < 3) return;
  const scanStatus = cards[2].querySelector('.health');
  if (!scanStatus) return;
  const detected = numberFrom(deviceCount);
  scanStatus.classList.remove('good', 'bad', 'warn');
  if (detected > 0) {
    scanStatus.classList.add('good');
    scanStatus.textContent = 'READY';
  } else {
    scanStatus.classList.add('warn');
    scanStatus.textContent = 'NO DEVICE';
  }
}

function refreshTruthfulStatus() {
  updateConnectionBadge();
  updateDeviceDoctorState();
}

const observer = new MutationObserver(refreshTruthfulStatus);
for (const element of [readyCount, deviceCount, doctorGrid]) {
  if (element) observer.observe(element, { childList: true, subtree: true, characterData: true });
}

refreshTruthfulStatus();
