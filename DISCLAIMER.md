# Disclaimer

## The build is not code-signed

`PlayPort.exe` is **not digitally signed**. Signing certificates are a paid
service, and this release does not carry one. That single fact is the cause of
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
- **Your browser may warn on the download.** The download here is the same file,
  byte for byte; the SHA-256 checksum beside it (`download/PlayPort.exe.sha256`)
  lets you confirm that.

### How to verify the download

```powershell
certutil -hashfile PlayPort.exe SHA256
```

Compare the result with `download/PlayPort.exe.sha256`. If it matches, you have
exactly the build this repository published.

## No warranty

PlayPort is provided **as is**, without warranty of any kind. It manages servers
and can move or overwrite world files, so **keep backups**. You are responsible
for your own data. See `LICENSE`.
