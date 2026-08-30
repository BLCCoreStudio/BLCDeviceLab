# Real-device validation checklist

This checklist is a release gate for the current alpha. CI cannot prove physical-device behavior, so the automated smoke and the interactive desktop checks must both be completed on real hardware before packaging a development build.

## 1. Automated non-destructive smoke

Prerequisites:

- Node.js 22+
- `adb` on `PATH`
- `scrcpy` on `PATH`
- one Android device in the `device` state, or an explicit `--serial`

Run:

```bash
npm install
npm run smoke:device
```

For multiple devices:

```bash
npm run smoke:device -- --serial <device-serial>
```

Expected result:

- ADB version probe passes.
- scrcpy version probe passes.
- selected device is ready.
- manufacturer/model/Android/API inspection succeeds.
- screenshot is non-empty and has the PNG signature.
- a short headless recording starts, remains alive for the smoke window, stops with `SIGINT`, finalizes as completed, and produces a non-empty MP4.
- the command exits with status 0 and prints the temporary artifact directory.

Do not continue to packaging if any automated check fails.

## 2. Normal workspace

Run `npm run desktop`, select the real device and use **Open workspace**.

Pass criteria:

- the scrcpy window actually appears;
- mouse/keyboard control works;
- no success toast is shown if scrcpy cannot start;
- closing the scrcpy window does not crash BLC Device Lab.

## 3. Wireless pairing and connection

From Android Wireless debugging:

1. pair using the temporary pairing address + six-digit code;
2. connect using the main Wireless debugging address;
3. confirm the device appears as Ready without a manual full-page restart.

Pass criteria:

- invalid/expired pairing data reports failure rather than success;
- a successful connect adds the endpoint only to the current process's self-healing set;
- after a temporary Wi-Fi/ADB interruption, reconnect attempts are bounded by the cooldown;
- restarting BLC Device Lab does not silently reconnect to a previously stored network endpoint.

## 4. Workspace/session restore

Select a device and mirror profile, close BLC Device Lab, reopen it with the device still available.

Pass criteria:

- the preferred device/profile selection is restored;
- the UI does not create a new network connection merely because the previous serial looked like an IP:port.

## 5. Virtual app workspace

Load user applications in App Manager. If the installed scrcpy exposes `--new-display` and `--start-app`, choose a preset and open one user application in **Virtual workspace**.

Pass criteria:

- the button is hidden/unavailable when the local scrcpy lacks the required capabilities;
- Responsive uses flex display only when supported;
- Desktop 1080p and Tablet use only the built-in preset dimensions;
- the chosen user app launches in the virtual display;
- arbitrary package names or arbitrary scrcpy flags cannot be entered from the renderer.

## 6. Capture & Test UI

Use the desktop UI to create a screenshot, then start and stop a recording.

Pass criteria:

- PNG saves to the user-selected path;
- recording creates MP4 or MKV at the user-selected path;
- **Stop & finalize** completes without hanging;
- capture history updates locally;
- a second recording cannot be started for the same device while one is active.

## Gate to packaging

Only proceed to development installers when sections 1–6 pass on at least one real Android device. Before any public binary or paid distribution, also complete the exact bundled-component license/NOTICE/SBOM audit and signing plan.
