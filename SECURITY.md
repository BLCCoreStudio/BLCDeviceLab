# Security Policy

BLC Device Lab controls real Android devices through ADB and scrcpy, so device authorization, command construction, local files, and the Electron privilege boundary are security-sensitive.

## Reporting a vulnerability

Please do not publish exploit details in a public issue before maintainers have had a reasonable opportunity to investigate.

If GitHub offers a **Report a vulnerability** option for this repository, use it. Otherwise, contact the maintainer privately using the contact information associated with the BLCCoreStudio account and provide only the information needed to reproduce and assess the issue.

Useful reports include:

- affected version, branch, or commit;
- affected operating system and Android/API version when relevant;
- a minimal reproduction;
- expected versus actual security boundary;
- impact and realistic attack prerequisites;
- sanitized logs or screenshots.

Never include ADB private keys, wireless-debugging pairing codes, access tokens, private captures, or unrelated device data.

## High-priority security areas

Please report issues involving:

- arbitrary shell or command execution through UI-controlled input;
- Electron renderer-to-privileged-process boundary bypasses;
- unsafe ADB/scrcpy argument construction;
- path traversal or arbitrary local file read/write;
- exposure of ADB credentials, pairing material, device identifiers, captures, or logs;
- unintended persistent or background wireless-device reconnection;
- validation bypasses for package names, device selectors, recording paths, or virtual-display parameters.

## Scope notes

ADB and scrcpy are external tools that the user installs and authorizes separately. Their mere presence is not a BLC Device Lab vulnerability. Reports should show how this project weakens an expected boundary, leaks sensitive information, or causes unintended privileged behavior.

Real-device security testing must be performed only on devices and accounts you own or are explicitly authorized to test.
