# Contributing

BLC Device Lab is still an early alpha and its project-wide redistribution license has not been selected yet.

## Current contribution status

Bug reports, reproducible device-compatibility results, documentation corrections, design discussion, and security reports are welcome.

External code contributions are **not being accepted yet**. A public-core license must be selected before we begin accepting third-party code. This avoids creating unclear ownership or redistribution terms while the product and dependency model are still being finalized.

## Useful reports

When reporting a device or workflow problem, include only the information needed to reproduce it:

- host operating system and version;
- Android version/API level;
- ADB and scrcpy versions when relevant;
- the exact workflow that failed;
- sanitized logs or error output.

Do not post ADB private keys, wireless-debugging pairing codes, account tokens, private captures, or unnecessary device identifiers.

For vulnerabilities, follow `SECURITY.md` instead of opening a public issue with exploit details.

## Engineering rules

Changes maintained by the project must preserve these boundaries unless a deliberate design review says otherwise:

- no arbitrary shell input from the renderer;
- Electron context isolation remains enabled and renderer Node access remains disabled;
- device/package/preset arguments are validated before privileged execution;
- wireless reconnect remains bounded and user-initiated rather than becoming persistent background auto-connect;
- third-party binaries and source are not silently bundled.

The repository CI runs the project checks and tests. Real-device testing must use a device you own or are explicitly authorized to test.

This policy will be updated when the public-core license and external contribution process are finalized.
