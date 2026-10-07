# PlayPort

**Game server + web hosting panel - as a single Windows executable.**

PlayPort is a self-hosted management panel for game servers **plus** website
hosting, packaged as **one `.exe`** that runs on any Windows 10/11 with **no
install and no runtime to ship**.

This repository is the **download** for PlayPort: the portable executable, its
manual, the sales site and the brand kit. It does **not** contain the source,
which is proprietary and stays private — see [LICENSE](LICENSE).

---

## Download & run

1. Download **[`download/PlayPort.exe`](download/PlayPort.exe)**.
2. Verify it against **[`download/PlayPort.exe.sha256`](download/PlayPort.exe.sha256)** (optional, see [DISCLAIMER.md](DISCLAIMER.md)).
3. Drop it in any writable folder and double-click — or run:

   ```
   PlayPort.exe --open
   ```

   It opens <http://127.0.0.1:8080/>, where you create the admin account and
   add your first server or website.

**Portable by default.** Everything (config, sites, servers, MariaDB, SteamCMD)
lives in a `playport-data/` folder it creates next to itself. Delete that folder
to uninstall completely. If the exe's folder is not writable (e.g. `Program
Files` without elevation) it falls back to `%LOCALAPPDATA%\PlayPort`.

> **Unsigned build.** PlayPort.exe is not code-signed, so Windows may warn you
> the first time. That is expected — read [DISCLAIMER.md](DISCLAIMER.md) before
> you run it.

## What it does

- Minecraft servers (Vanilla + Paper) with automatic downloads and updates
- **Steam games via SteamCMD**, with live download progress and update timers
- Manual/process servers (any executable)
- Live console (WebSockets), per-server and machine CPU/RAM charts
- File manager, selective zip backups, schedules
- **Website hosting**: static, **PHP/FastCGI**, and reverse-proxy sites, each on
  its own port with its own file manager
- **Automatic HTTPS** — one-click Let's Encrypt (built-in ACME v2 client), a
  self-signed cert for LAN/offline use, or your own PFX
- Multi-user logins with roles, first-run setup, PBKDF2 passwords
- **Cloudflare tunnels built in** — a temporary public URL with no account and
  no open ports, or named tunnels for stable hostnames
- JSON-file storage: no database and no external files needed at runtime

## Documentation

- **[`docs/operator-manual.md`](docs/operator-manual.md)** — the full manual:
  installing, running servers, hosting websites, TLS, tunnels and troubleshooting.

## Repository contents

| Path | What it is |
| --- | --- |
| [`download/PlayPort.exe`](download/PlayPort.exe) | The portable build (Windows 10/11) |
| [`download/PlayPort.exe.sha256`](download/PlayPort.exe.sha256) | SHA-256 checksum of the build |
| [`docs/operator-manual.md`](docs/operator-manual.md) | The operator manual |
| [`index.html`](index.html) | The sales / landing page (also the GitHub Pages site) |
| [`marketing/`](marketing/) | The brand kit — logos, social artwork, copy, brand guide |
| [`DISCLAIMER.md`](DISCLAIMER.md) | The unsigned-binary warning |
| [`LICENSE`](LICENSE) | Proprietary licence — all rights reserved |

## Licence

PlayPort is **not open source**. Copyright © 2026 Joshua van Doorn, trading as
PlayPort. All rights reserved. See [LICENSE](LICENSE).
