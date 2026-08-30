import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') process.exit(0);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourceIcon = join(projectRoot, 'src', 'desktop', 'assets', 'app-icon.png');
const localShare = join(homedir(), '.local', 'share');
const applicationsDir = join(localShare, 'applications');
const iconDir = join(localShare, 'icons', 'hicolor', '512x512', 'apps');
const iconTarget = join(iconDir, 'blc-device-lab.png');
const desktopTarget = join(applicationsDir, 'blc-device-lab.desktop');
const electronBinary = join(projectRoot, 'node_modules', '.bin', 'electron');

function quoteExec(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

await mkdir(applicationsDir, { recursive: true });
await mkdir(iconDir, { recursive: true });
await copyFile(sourceIcon, iconTarget);

const desktopEntry = `[Desktop Entry]\nType=Application\nVersion=1.0\nName=BLC Device Lab\nComment=Local-first physical Android device workspace\nIcon=blc-device-lab\nExec=${quoteExec(electronBinary)} ${quoteExec(projectRoot)}\nTerminal=false\nCategories=Development;Utility;\nStartupWMClass=blc-device-lab\nX-GNOME-WMClass=blc-device-lab\n`;

await writeFile(desktopTarget, desktopEntry, 'utf8');
