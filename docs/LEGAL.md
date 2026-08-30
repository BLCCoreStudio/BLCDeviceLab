# Licensing and Brand Guardrails

This file is an engineering compliance checklist, not legal advice.

## Architecture rule

BLC Device Lab invokes `adb` and `scrcpy` as separate external programs. Do not copy upstream source into this repository and do not bundle third-party binaries until their exact license obligations are audited for each platform.

## scrcpy

scrcpy is published under Apache License 2.0. If we redistribute it or derivative source/object code, preserve the required license, copyright and attribution notices. The license does not grant trademark rights.

## Electron

The desktop shell currently declares Electron 44.0.0 as a development dependency. Electron's top-level project is MIT-licensed, but a packaged Electron runtime contains Chromium, Node.js and additional third-party components. Before distributing desktop binaries, collect notices from the exact packaged runtime and verify packaging obligations instead of relying only on the top-level Electron license.

## FFmpeg

If a future installer bundles FFmpeg through a scrcpy distribution, verify the exact FFmpeg build configuration. Keep GPL/nonfree components out of a proprietary distribution unless the chosen distribution model is intentionally compatible. Preserve corresponding source/build information as required by the applicable FFmpeg license.

## Android brand

Do not put `Android` in the product name. Use it only descriptively (for example, “for Android™ devices”) and include the applicable Google trademark attribution when required.

## Naming

`BLC Device Lab` is a working codename only. Before a paid/public launch, perform a formal trademark/domain/store-name clearance in target markets.

## Release gate

Before shipping any installer:

- Produce an SBOM.
- Generate third-party notices from the exact shipped binaries.
- Record exact upstream versions and hashes.
- Verify source-offer/source-link obligations for every LGPL/GPL component.
- Verify Electron/Chromium/Node third-party notices for the packaged runtime.
- Verify icons, fonts, screenshots and other assets separately from code licenses.
