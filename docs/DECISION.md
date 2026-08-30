# Product Decision — 2026-08-30

## Verdict

**GO — modified concept.**

Killed concepts:

- A generic scrcpy GUI: crowded and easy to substitute with free tools.
- A DeX clone: crowded, product-name/trademark risk, and narrow positioning.
- A direct QtScrcpy/eScrcpy fork: too much inherited product identity and competitor overlap.
- A LocalSend fork: excellent project, but too mature/free to create a credible paid wedge by rebranding it.

Winning concept:

**A cross-platform physical Android device workspace/device lab that uses external scrcpy and adb as engines.**

The moat must come from reliability, workflow orchestration, diagnostics, session/workspace restoration, creator/QA features and later team/device automation — not from mirroring itself.

## Non-negotiable kill conditions

Stop or reposition the project if any of these become true:

1. A competitor delivers the same one-click diagnostic + workspace workflow with comparable polish for free.
2. The product cannot demonstrate a meaningful advantage over launching scrcpy manually within the first two public milestones.
3. Distribution requires a license combination we cannot comply with cleanly.
4. Wireless pairing/reconnect cannot be made materially easier than existing GUIs.
5. The product needs a hosted backend before there is validated demand.
