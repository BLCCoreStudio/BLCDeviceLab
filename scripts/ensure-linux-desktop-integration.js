import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') process.exit(0);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourceIcon = join(projectRoot, 'src', 'desktop', 'assets', 'app-icon.png');
const localShare = join(homedir(), '.local', 'share');
const applicationsDir = join(localShare, 'applications');
const desktopTarget = join(applicationsDir, 'blc-device-lab.desktop');
const electronBinary = join(projectRoot, 'node_modules', '.bin', 'electron');

function quoteExec(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function pngSize(bytes) {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') return 256;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width === height && width >= 16 && width <= 1024 ? width : 256;
}

const iconBytes = await readFile(sourceIcon);
const size = pngSize(iconBytes);
const iconDir = join(localShare, 'icons', 'hicolor', `${size}x${size}`, 'apps');
const iconTarget = join(iconDir, 'blc-device-lab.png');

await mkdir(applicationsDir, { recursive: true });
await mkdir(iconDir, { recursive: true });
await copyFile(sourceIcon, iconTarget);

const desktopEntry = `[Desktop Entry]\nType=Application\nVersion=1.0\nName=BLC Device Lab\nComment=Local-first physical Android device workspace\nIcon=blc-device-lab\nExec=${quoteExec(electronBinary)} ${quoteExec(projectRoot)}\nTerminal=false\nCategories=Development;Utility;\nStartupWMClass=blc-device-lab\nX-GNOME-WMClass=blc-device-lab\n`;

await writeFile(desktopTarget, desktopEntry, 'utf8');

spawnSync('update-desktop-database', [applicationsDir], { stdio: 'ignore' });
spawnSync('gtk-update-icon-cache', ['-f', '-t', join(localShare, 'icons', 'hicolor')], { stdio: 'ignore' });
