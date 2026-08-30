# Third-party components

No third-party binaries are distributed by this repository in the current alpha stage.

| Component | Purpose | Current relationship |
| --- | --- | --- |
| adb / Android Platform Tools | Device discovery and control | External executable only |
| scrcpy | Screen/audio/control transport | External executable only |
| Electron 44.0.0 | Desktop application shell during development | npm development dependency; no BLC release binary published yet |
| Chromium / Node.js components included by Electron | Desktop runtime internals | Not separately redistributed by BLC at this stage |
| FFmpeg | Used by scrcpy builds | Not bundled by this repo |
| SDL | Used by scrcpy client | Not bundled by this repo |
| libusb | Optional/platform dependency used by scrcpy | Not bundled by this repo |

Electron itself is MIT-licensed, but a future packaged Electron application contains a larger third-party runtime. Before publishing any installer, generate notices from the exact packaged artifacts rather than assuming Electron's top-level license covers every notice obligation.

Before any bundled installer is published, replace/extend this document with exact version, license, source URL, notices and hashes for each shipped artifact and generate an SBOM.
