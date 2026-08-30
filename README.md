# BLC Device Lab

> Working codename. Not a final trademark-cleared product name.

BLC Device Lab is an early cross-platform physical-device workspace. Its goal is **not** to become another scrcpy GUI or DeX clone. It treats a real Android phone as a local device lab: connect it reliably, diagnose ADB problems, launch/control it, install builds and later automate repeatable workflows.

## Phase 1 — desktop control center

The first desktop shell now includes:

- live device discovery with ready / unauthorized / offline states;
- Device Doctor health checks for `adb`, `scrcpy` and connected hardware;
- Wireless Debugging pairing and connection flows;
- three constrained mirror profiles: Balanced, Low latency and High quality;
- one-click workspace launch for an explicitly selected ready device;
- APK file selection and install for the selected device;
- on-demand device inspection for Android version, API level, battery, temperature and storage;
- a constrained user-app package launcher that never exposes arbitrary shell input;
- PNG screenshots captured directly from the selected device;
- controlled scrcpy recording sessions with MP4/MKV output and local capture history;
- a hardened Electron preload boundary with context isolation and no renderer Node access.

The product still keeps third-party engines outside our repository:

- `adb` is invoked as an external executable;
- `scrcpy` is invoked as an external executable;
- no scrcpy/ADB/FFmpeg/SDL source or binaries are bundled;
- Electron is a development dependency for the desktop shell, not a published BLC binary yet.

## Run the core

```bash
npm run doctor
npm run devices
node src/cli.js mirror [device-serial]
```

## Run the desktop shell

Prerequisites: Node.js 22+, `adb` and `scrcpy` available on `PATH`.

```bash
npm install
npm run desktop
```

No installer or release binary is published at this stage. Distribution licensing and exact bundled-component audits remain release gates.

## Product direction

**Connect** — one-click USB/wireless connection, pairing, automatic reconnect and self-healing diagnostics.

**Work** — app launcher, APK install, package tools, virtual-display workspaces and file/clipboard workflows.

**Capture & Test** — screenshots, recording, device information, logs, repeatable profiles and creator/QA presets.

Later versions may add session restoration, multi-device orchestration and automation. We will not claim features until they actually work.

## License status

This alpha scaffold is intentionally **not licensed for redistribution yet**. Copyright is reserved while dependency, distribution, brand and monetization decisions are finalized. A public-core license should be selected before accepting external contributions.
