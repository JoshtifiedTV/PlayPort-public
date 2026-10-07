# Disclaimer

## The build is not code-signed

`PlayPort.exe` is **not digitally signed**. Signing certificates are a paid
service that this release does not carry. That single fact is the cause of
every warning below.

### What Windows may do

- **SmartScreen / "Windows protected your PC".** When you first run the exe,
  Windows may show a blue box saying the publisher is unknown. Click **More
  info → Run anyway** to continue.
- **Smart App Control (Windows 11).** If this setting is on, Windows may refuse
  to start an unsigned executable outright. It can be turned off in
  **Windows Security → App & browser control → Smart App Control**. Turning it
  off is not reversible without resetting Windows, so only do this if you
  understand the trade-off - or run PlayPort on a machine where the policy
  allows it.
- **Your browser or mail client may warn when you save it.** The checksum that
  ships with your purchase is the way to confirm the file is the one that was
  built for release.

### How to verify your copy

```powershell
certutil -hashfile PlayPort.exe SHA256
```

Compare the result with the checksum you received with your purchase. If it
matches, you have exactly the build that was released.

## No warranty

PlayPort is provided **as is**, without warranty of any kind. It manages servers
and can move or overwrite world files, so **keep backups**. You are responsible
for your own data. See `LICENSE`.
