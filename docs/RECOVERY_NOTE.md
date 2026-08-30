# Recovery note

The productization surface change was reverted after a real KDE/Wayland validation exposed an interaction regression. The desktop UI must remain fully interactive before any branding or shell integration change is merged.

Future desktop identity and icon changes must be isolated from renderer behavior changes and validated separately on a real Linux desktop.
