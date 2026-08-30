# BLC Device Lab

> Working codename. Not a final trademark-cleared product name.

BLC Device Lab is an early cross-platform physical-device workspace. Its goal is **not** to become another scrcpy GUI or DeX clone. It treats the user's real Android phone as a local device lab: connect it reliably, diagnose ADB problems, launch/control apps, install builds, capture sessions, and later automate repeatable workflows.

## Phase 0

The first implementation deliberately keeps third-party tools outside our codebase:

- `adb` is invoked as an external executable.
- `scrcpy` is invoked as an external executable.
- No scrcpy/ADB/FFmpeg/SDL source or binaries are currently bundled.
- The repository contains only BLC-owned orchestration code and documentation.

This separation reduces integration and licensing complexity while keeping upstream updates easy to adopt. It is not a substitute for a formal legal review before commercial distribution.

## Current commands

```bash
npm run doctor
npm run devices
node src/cli.js mirror [device-serial]
```

## Product direction

**Connect** — one-click USB/wireless connection, pairing, automatic reconnect, self-healing diagnostics.

**Work** — app launcher, APK install, package tools, virtual-display workspaces, file/clipboard workflows.

**Capture & Test** — screenshots, recording, device information, logs, repeatable profiles and creator/QA presets.

Later versions may add multi-device orchestration and automation, but we will not claim features until they actually work.

## License status

This alpha scaffold is intentionally **not licensed for redistribution yet**. Copyright is reserved while dependency, distribution, brand, and monetization decisions are finalized. A public-core license should be selected before accepting external contributions.
