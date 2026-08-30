# Architecture

## Principle

Keep the product layer ours and upstream engines replaceable.

```text
Electron renderer (untrusted UI)
        |
restricted preload API
        |
Electron main process
        |
BLC Device Service
   |         |         |
Diagnostics Profiles Validation
   |                   |
ADB adapter       scrcpy adapter
   |                   |
external executables / OS services
```

## Security boundary

The renderer has `nodeIntegration: false`, `contextIsolation: true`, a local-only Content Security Policy and a narrow preload API. It cannot execute arbitrary ADB/shell commands. Pairing addresses, pairing codes and serials are validated in the privileged process layer, and mirror settings are selected from named profiles rather than renderer-supplied command flags.

## Phase 1 modules

- `command.js`: child-process boundary; commands and arguments are never concatenated into a shell string.
- `adb.js`: version/device discovery, pairing, connection and APK installation primitives.
- `scrcpy.js`: constrained option builder and external process launcher.
- `diagnostics.js`: probes and recovery hints.
- `profiles.js`: fixed quality/latency profiles.
- `deviceService.js`: privileged product operations and ready-device checks.
- `validation.js`: input constraints before privileged calls.
- `desktop/main.js`: Electron lifecycle and IPC handlers.
- `desktop/preload.js`: explicit renderer capability surface.
- `desktop/renderer/*`: UI only; no Node or raw IPC access.

## Next target

1. Reliable automatic refresh / reconnect state machine.
2. Device detail view with battery/storage/OS metadata.
3. App/package launcher without exposing arbitrary shell commands.
4. Capture controls and session history.
5. First signed development builds only after exact distribution license notices are automated.
