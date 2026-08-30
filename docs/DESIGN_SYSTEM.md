# BLC Device Lab Design System

## Product identity

BLC Device Lab should feel like a premium local device workspace, not a generic Electron shell and not a scrcpy skin.

Visual principles:

1. **Local-first confidence** — calm, trustworthy status feedback; no cloud/SaaS visual language by default.
2. **Physical-device focus** — connected hardware is the primary object in the UI.
3. **Technical without terminal clutter** — advanced workflows are visible, but raw ADB complexity is hidden behind safe product actions.
4. **Restrained neon** — blue/violet accents identify the product; glow is reserved for status and primary actions.
5. **Dense but readable** — desktop space is used efficiently with strong grouping and hierarchy.

## Core palette

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#070b13` | Main application background |
| `--surface` | `rgba(13, 21, 37, .92)` | Primary panels |
| `--surface-2` | `rgba(18, 29, 49, .86)` | Secondary/inset panels |
| `--line` | `rgba(154, 182, 255, .12)` | Borders and dividers |
| `--text` | `#f5f7ff` | Primary text |
| `--muted` | `#8c97ad` | Secondary text |
| `--accent` | `#4f87ff` | Primary blue |
| `--accent-2` | `#8e65ff` | Violet companion accent |
| `--accent-cyan` | `#36c8ff` | Device/connectivity detail |
| `--good` | `#68dca0` | Ready/healthy states |
| `--warn` | `#f2c66d` | Attention states |
| `--bad` | `#ff8590` | Failure/error states |

## Shape language

- Application shell: rectangular desktop workspace, not oversized mobile cards.
- Primary panel radius: `18px`.
- Inset/control radius: `9–13px`.
- Status pills: fully rounded.
- Primary actions: blue → violet gradient, reserved for deliberate actions.
- Avoid heavy 3D/gloss effects in the UI itself; the richer rendered icon may carry more depth than the product UI.

## Brand icon

The icon direction is a phone/device-lab motif with diagnostics and connection cues, without a lettermark and without third-party mascots or logos.

Source asset in Phase 1 design implementation:

`src/desktop/assets/app-icon.png`

The 64px asset is sufficient for the current Linux window/title-bar validation. Release packaging must later generate audited platform variants:

- PNG multi-resolution set for Linux
- ICO for Windows
- ICNS for macOS

Do not ship the Electron default icon.

## Navigation

Primary navigation groups the product by user intent:

- Home / connected device
- Workspace
- Apps
- Capture & Test
- Wireless
- Device Doctor

Future engines should appear as roadmap/feature surfaces only until they are implemented. Do not present planned features as working controls.

## Product differentiation surfaces

The design reserves product-level identity for three BLC engines:

### Continuity Engine

Seamless physical-device identity across USB/Wi-Fi/mDNS, connection scoring, handoff, and recovery.

### Repro Capsule

A reproducible bug/session package containing explicitly selected device/environment metadata, user steps and optional evidence.

### Device Twin

A local history of meaningful device/app/environment changes between sessions to explain regressions and compatibility differences.

These names should be treated as product concepts and reviewed for naming/trademark conflicts before commercial launch.

## Privacy UX

Capture and diagnostic surfaces must state where data is stored. Screenshot/video/log collection should be explicit rather than silent. Network upload is not implied by local capture actions.

## Motion

Future animation should be subtle and functional:

- 140–200 ms hover/press transitions
- device-ready state fades
- reconnect state progress
- panel expansion for Inspect

Avoid constant ambient motion, excessive glow pulses, or animation that reduces readability.
