# Architecture

## Principle

Keep the product layer ours and upstream engines replaceable.

```text
UI (future desktop shell)
        |
BLC Workspace / Automation
        |
BLC Device Core
  |        |        |
ADB      scrcpy   Diagnostics
  |        |        |
external executables / OS services
```

## Phase 0 modules

- `command.js`: safe child-process boundary.
- `adb.js`: version/device discovery, pairing, connection and APK installation primitives.
- `scrcpy.js`: option builder and external process launcher.
- `diagnostics.js`: user-facing probes and recovery hints.
- `cli.js`: thin validation surface before GUI work begins.

## Phase 1 target

Add a desktop UI only after the core can reliably:

1. Detect 0/1/many connected devices.
2. Distinguish unauthorized/offline/ready states.
3. Pair and reconnect wireless devices.
4. Launch scrcpy for an explicitly selected device.
5. Install an APK to the selected device.
6. Produce actionable diagnostic messages without exposing raw ADB commands to normal users.
