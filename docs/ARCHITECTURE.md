# Architecture

## Principle

Keep the product layer ours and upstream engines replaceable.

```text
Electron renderer (untrusted UI)
        |
restricted preload API + named events
        |
Electron main process
   |             |
Device monitor   Workspace session store
   |             |
BLC Device Service
   |         |         |
Diagnostics Profiles Validation
   |                   |
ADB adapter       scrcpy adapter + capability probe
   |                   |
external executables / OS services
```

## Security boundary

The renderer has `nodeIntegration: false`, `contextIsolation: true`, a local-only Content Security Policy and a narrow preload API. It cannot execute arbitrary ADB/shell commands. Pairing addresses, pairing codes and serials are validated in the privileged process layer, and mirror settings are selected from named profiles rather than renderer-supplied command flags.

Virtual workspaces follow the same rule: the renderer supplies only a validated package identifier and a named BLC preset. Display dimensions and scrcpy flags come from immutable product presets. The local scrcpy `--help` output is probed before virtual-display controls are offered, so unsupported flags are not assumed.

Background reconnect is deliberately bounded. Only wireless endpoints that the user successfully connected during the current app process are eligible for automatic retry. Reconnect attempts use a cooldown and do not turn the persisted workspace preference into a silent cross-restart network connection. Wireless pair/connect results are also parsed for explicit ADB success/failure text instead of treating process exit code alone as proof of success.

## Phase 1 modules

- `command.js`: child-process boundary; commands and arguments are never concatenated into a shell string.
- `adb.js`: version/device discovery, pairing, connection, fixed inspection/capture calls and APK installation primitives.
- `adbOutcome.js`: explicit success/failure classification for wireless ADB pairing and connection.
- `scrcpy.js`: constrained option builder, external process launcher and runtime capability probe.
- `virtualWorkspace.js`: immutable Responsive/Desktop/Tablet virtual-display presets and capability gates.
- `diagnostics.js`: probes and recovery hints.
- `profiles.js`: fixed quality/latency profiles.
- `deviceMonitor.js`: non-overlapping background scans, device-state diffs and reconnect planning.
- `workspaceSession.js`: atomic local persistence for validated preferred device/profile fields only.
- `deviceService.js`: privileged product operations and ready-device checks.
- `validation.js`: input constraints before privileged calls.
- `desktop/main.js`: Electron lifecycle, IPC handlers, monitor lifecycle and bounded reconnect orchestration.
- `desktop/preload.js`: explicit renderer capability/event surface.
- `desktop/renderer/*`: UI only; no Node or raw IPC access.

## Current state machine

1. A lightweight monitor scans `adb devices -l` every few seconds.
2. Only changed device lists are pushed to the renderer.
3. Full Device Doctor probes stay user/manual-refresh oriented rather than running every monitor tick.
4. A successful manual wireless **Connect** adds that endpoint to the in-memory self-healing set.
5. If that endpoint disappears or becomes offline, reconnect planning applies a cooldown before another fixed `adb connect` call.
6. The last validated device/profile preference is written atomically to the desktop app user-data directory and restored on the next launch.
7. Full/manual snapshots refresh scrcpy capabilities; only compatible virtual workspace presets are exposed.
8. A virtual app workspace rechecks the selected ready device, validates the package against the current user-app list and launches only a fixed BLC preset.

## Next target

1. Real-device validation of reconnect, recording finalization and virtual-display behavior on Windows/Linux.
2. Session-aware workspace launch history and recent-device UX.
3. First signed development builds only after exact distribution license notices are automated.
4. Multi-device orchestration only after the single-device reconnect state machine proves reliable.
