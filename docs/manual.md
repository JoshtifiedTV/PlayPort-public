# PlayPort manual

Welcome. PlayPort is a self-hosting panel for Windows that runs two things from one window: **game servers** and **websites**. It is a single `.exe`. There is nothing to install and no separate runtime to set up.

This manual is written to be read, not decoded. It starts with getting the app running, then walks through each job you can do with it. If you would rather poke at a simulated panel first, open the [interactive demo](../demo.html).

---

## Before you start

You need:

- A Windows 10 or 11 PC. PlayPort uses the .NET Framework that is already part of Windows.
- A writable folder to keep it in. The Desktop, your Documents folder, or a dedicated folder such as `C:\PlayPort` all work.
- Administrator rights only if you want to accept connections from the internet. Running servers and websites on your own machine does not need them.

You do **not** need a database, IIS, nginx, Node.js or Java on the machine. PlayPort downloads and manages what a server or website needs, when it needs it, into its own data folder.

---

## Getting started

### 1. Get PlayPort and run it

1. Get **PlayPort.exe** from your purchase. PlayPort is a paid product, so there is no free download; the [product page](../index.html#download) is where checkout lives.
2. Put it in the folder you chose.
3. Double-click it, or run it from a terminal:

   ```
   PlayPort.exe --open
   ```

The panel starts and opens in your browser at `http://127.0.0.1:8080/`. A small console window also opens and stays open. That window is the panel; closing it stops PlayPort and its servers.

> The build is not code-signed, so Windows may warn you the first time. Click **More info**, then **Run anyway**. This is explained in the [disclaimer](../DISCLAIMER.md), including how to verify the download against its checksum.

### 2. First run

The first time it opens, PlayPort asks you to create an **admin account**. Pick a username and password and you are in. You can add more people later under **Settings → Users**.

### 3. Add your first thing

From the panel you can either:

- Click **Game servers → + New server** to install a Minecraft or Steam game server, or
- Click **Websites → + Host a website** to put a website online.

Both are covered in their own sections below.

### Where your data lives

Everything PlayPort creates lives in a folder called `playport-data/`, next to the `.exe`:

```
PlayPort.exe
playport-data/       <- settings, websites, servers, databases, backups
```

That folder is the whole app. Recent versions remember which location you chose, so a later launch reuses it.

### Stopping PlayPort

Plain ways to stop it, none of which need administrator rights:

- Type `exit` in the console window, or press Ctrl+C in it.
- Close the console window (the little **X**).
- Run `PlayPort.exe --stop` from another window.
- Just launch a newer `PlayPort.exe` on the same port. The new copy asks the old one to stop, waits for the port, and takes over.

When PlayPort stops it **saves and stops your game servers first**, so worlds are not left running or half-written.

### Updating PlayPort

There is no self-updater, on purpose. Updating means **running a newer `PlayPort.exe`**. Your data is safe: it lives in `playport-data/`, not inside the `.exe`. Download the new build, put it where you like, and launch it. If an older panel is still running, the new one takes over as described above.

---

## The panel at a glance

The left sidebar is how you move around. The main screens are:

| Screen | What it is for |
| --- | --- |
| **Dashboard** | A system health check: panel, disk space, database, backups, certificates, and anything that needs attention. |
| **Game servers** | Every Minecraft and Steam server, with start, stop, console and settings. |
| **Websites** | Every website, with its files, HTTPS and public access. |
| **Files** | The file manager, shared by servers and sites. |
| **Backups** | What each server backs up, and where copies go. |
| **Databases** | The managed MariaDB server and the databases handed out to sites and servers. |
| **Activity** | Every long-running job (installs, updates, backups) with progress and a retry button. |
| **Settings** | Storage, alerts, tunnels, users, Java runtimes and server readiness. |

Two conveniences worth knowing straight away:

- **Search:** press **Ctrl+K** anywhere. One box searches servers, websites, databases, mailboxes, backups and console history. It only shows things you are allowed to open.
- **Activity:** if something is taking a while, it is listed there with progress rather than freezing the page.

---

## Game servers

PlayPort installs and updates game server files, starts and stops them, shows a live console, and gives you the settings in plain language. Everything runs on your machine.

### Create a Minecraft server

1. Open **Game servers → + New server**.
2. Pick **Minecraft: Vanilla** or **Paper**. Paper is the common choice for plugins.
3. Choose a version. Leave it on **latest** to always use the newest stable version.
4. Give it a name, RAM and a port (the default is 25565).
5. Accept the Minecraft EULA when asked. You must accept it to run a Minecraft server; this is Mojang's rule, not PlayPort's.

PlayPort downloads the jar, sets up the runtime, and adds the server to your list. Press **Start**, then open the **Console** to watch it boot.

### Create a Steam game server

1. Open **Game servers → + New server** and choose **SteamCMD**.
2. Pick a game, either from the built-in catalog or by typing its Steam App ID.
3. Free dedicated servers (for example Team Fortress 2 or Counter-Strike 2) install with an anonymous login. Games you own need your Steam username and password, set in the server's **Settings** page.
4. After the files install, set the **start executable** (for example `steamapps/common/valheim/valheim_server.exe`).

PlayPort handles installing and updating the files. How a given game boots is up to that game, so the start command is something you fill in, the same way other game panels do it.

### A server from any executable

The **Manual** option runs any program as a server. Point it at an executable and working folder, and PlayPort gives it the same console, start/stop and backup treatment as the built-in types.

### The console

Each server has a **Console** tab: live output over a WebSocket, an input box to type commands, and one-click chips for commands you use often. You can save a typed command as a chip (up to 30 per server). Sending to a stopped server is refused, because there is nothing to write to.

### Starting, stopping and restarts

Start and stop are single buttons. PlayPort also gives you:

- **Restart warnings:** before a scheduled restart, players get a countdown in chat.
- **Auto-restart:** if a server crashes, PlayPort can bring it back. It gives up after too many crashes in a row rather than looping forever.
- **Plain-English crashes:** when a server dies, the panel explains likely causes rather than dumping a stack trace.

### Settings and RAM

A server's **Settings** page holds its name, version, RAM, port, Java runtime and start command. Changes that need a restart say so. Minecraft's own `server.properties` is edited through a friendly form, grouped and labelled, instead of by hand.

---

## Minecraft networks

A **network** is a proxy in front of several Minecraft servers, so players join one address and move between them. PlayPort can build the whole thing in one go:

1. Open **Game servers → + New server**, then choose the **Network** category.
2. Pick a name and port for the proxy.
3. Choose a hub (where players land) and any number of game servers, each with its own port.
4. Optionally add a limbo lobby, a lightweight holding area for players.

PlayPort writes all the configs (the proxy and every backend), sets up player forwarding, and gives the network a single **Start network** / **Stop network** button. Backends come up first, then the proxy; stopping runs in reverse. Every Paper backend comes up already running the PlayPort Core plugin, on the template its name implies (a server called `Survival` gets the survival template, a hub gets the hub template).

### PlayPort Core, the bundled plugin

PlayPort Core is a first-party Minecraft plugin that is built into the app, so you do not download it and you do not need an account. The Plugins tab of any Paper or Purpur server shows it at the top with a **profile picker** and an **Install** button, and installation copies the jar straight out of the app into the server's `plugins/` folder.

A **profile** is what turns the one jar into a particular kind of server:

| Profile | What it turns the server into |
| --- | --- |
| Hub | A lobby: no survival world, protection and cosmetics for a network entry point. |
| Survival | Economy, homes, land claims, mail and teams for an ordinary survival world. |
| Creative | Free building with plot protection and builder tools, no economy. |
| Skyblock | Island-based play with the modules a skyblock server needs. |
| Factions | Claims, power, faction chat, a faction TNT bank and raids. |
| Prison | Mines, ranks, a shop and the grind a prison server is built on. |
| Lifesteal | PvP hearts you can take, drop and trade back. |

Over ninety modules sit behind those profiles, and nothing in the plugin can be bought: economy, permissions and groups, homes, warps, kits, claims, teams, an auction house, custom enchantments and items, cosmetics, pets, boss arenas, crates, jobs, quests and more. Each one has a switch you can turn on or off from the panel, so you keep the parts you want. A server you create from a starter pack (for example `paper-prison` or `paper-factions`) installs the plugin with the right profile already chosen.

### Modpacks and plugins from Modrinth

- **Modpacks:** the new-server dialog has a **Modpacks** category, fed by Modrinth's public catalog. Pick a pack and a version; PlayPort installs the mods and the right server loader (Fabric, Forge or NeoForge) for you.
- **Third-party plugins:** the **Plugins** tab also browses Modrinth's catalog, filtered to the server's own type and Minecraft version so you only see jars that will actually load. Install drops the file into `plugins/`; enable/disable and delete work from the same list, with no filesystem work.

---

## Websites

PlayPort hosts websites directly. There is no IIS or nginx involved, and each site runs on its own port.

### Host a static site

1. Open **Websites → + Host a website**.
2. Choose **Static**.
3. Give it a domain or a name and a port (for example 8081).
4. Upload files through the site's **Files** tab, or point it at an existing folder on disk.

### Host a PHP site

Choose **PHP / FastCGI**. PlayPort downloads `php-cgi` on first use and speaks FastCGI itself. A PHP site runs `index.php` out of the box, so you can drop in WordPress or another PHP app and install it from the browser. Each site gets its own generated `php.ini`.

### Import a folder or a ZIP

- **A folder on disk:** set the site to serve an existing folder, and PlayPort serves it in place. Nothing is copied or moved.
- **A ZIP:** use **Files → Import ZIP** to unpack a built site straight into the site root.
- **Build output:** if you point PlayPort at a JavaScript project (React, Vue, Svelte, Next static export, and others), it can detect the framework, run the build, and serve the output folder for you.

### Preview before going live

Every site has a **Preview** button. It serves the site on a throwaway local port so you can check it in your browser without it being public. Stop the preview when you are done.

### Reverse proxy

A **reverse-proxy** site forwards traffic to another program you are running (for example an app on `127.0.0.1:3000`). Use it when your site is served by something PlayPort did not launch itself.

---

## Domains and HTTPS

Each website has a **TLS** panel in its Settings. There are three ways to get HTTPS:

| Method | When to use it |
| --- | --- |
| **Let's Encrypt** | You own a domain and it points at this machine. One click gets a real, browser-trusted certificate. The panel speaks to the certificate authority itself; no extra tools. |
| **Self-signed** | For testing on your local network. Browsers will warn about it, which is expected. |
| **Upload PFX** | You already have a certificate, for example from your company or registrar. |

For **Let's Encrypt**, the domain must reach this machine on port 80 for the first check. There is a **staging** option to test the process without using up your rate limit. Once HTTPS is on, you set a TLS port (443 by default) and the site serves both HTTP and HTTPS.

Certificates from Let's Encrypt are **renewed automatically** before they expire. Self-signed and uploaded certificates are never replaced.

---

## Going public

By default everything listens on `127.0.0.1`, meaning only this machine. To let other people in, you have two routes.

### Open a port on your router

This is the classic approach. Three things have to line up:

1. **Router:** forward the port (for example 25565 for Minecraft, or 80/443 for a website) to this PC's local address.
2. **Firewall:** allow the matching inbound port in Windows Firewall. PlayPort's **Settings → Server readiness** page tells you exactly which rule is missing.
3. **Bind address:** in the site or panel settings, choose to listen on all interfaces rather than only loopback.

The **Server readiness** screen measures these for you rather than guessing, and names the one thing left to fix.

### Use a tunnel (no router changes)

Tunnels are the easy way to share something without touching your router.

- **Cloudflare quick tunnel:** open a site's **Public access** panel and start a quick tunnel. Within seconds you get a temporary `https://something.trycloudflare.com` link, with no account and no open ports. It disappears when you stop it or close PlayPort.
- **Cloudflare named tunnel:** for a stable hostname, PlayPort can generate a config that routes your domains. The one-time terminal setup is described on the screen.
- **playit.gg:** an alternative tunnelling agent the panel can install and run for you.

Tunnels stop automatically when PlayPort closes, so nothing stays reachable by accident.

---

## Databases

**Settings → MySQL** installs a portable MariaDB server (no Windows service, no admin rights needed). From there, any website or game server can get its own database and user in one click. Each database gets a user that can only touch that one database.

MariaDB runs on `127.0.0.1` only, so databases are for local sites and servers and are never exposed to the internet. It runs sandboxed with a memory cap and stops when PlayPort stops.

---

## Email

PlayPort includes a small mail service so a PHP site can send mail immediately. By default it runs in **capture** mode: mail is kept on the machine so you can confirm a site's email works, and nothing is delivered. When you are ready, you can switch to **relay** (through your email provider, which is the reliable option from a home connection) or **direct** delivery.

The **Email** page walks through hooking up a domain, publishing the DNS records it shows you, and sending a test message.

---

## Backups

Backups are the part that saves you, so PlayPort makes them specific rather than giant.

### What a backup contains

A server's **Backups** tab opens with a plan, split into categories (player data, server settings, world, plugins and mods, logs and crash reports, everything). Each category shows **what it would actually take**, measured from disk. Start from **Smallest**, **Standard** or **Everything**, then tick what you want. Your choice is remembered for that server.

Each archive carries a small manifest, so the list tells you in plain words what is inside.

### Where copies go

A backup on the same disk as the server does not protect you from that disk failing, so each server can also copy its archives somewhere else:

| Destination | What it is for |
| --- | --- |
| **Folder or share** | A second disk, a USB drive, or a network path such as `\\nas\backups`. |
| **S3-compatible bucket** | Cloudflare R2, Backblaze B2, Wasabi, MinIO and similar. |
| **Public file host** | Hand a single archive to somebody with a link. |

You can **test** a destination before trusting it, and each one remembers its last success and last failure.

### Restoring

Every backup can be **downloaded** (the safe option: you get the file and nothing is changed) or **restored** (PlayPort writes the files it contains back into the server folder, leaving anything else alone).

---

## Files, schedules and monitoring

- **File manager:** upload, download, edit, rename, move and delete, for both servers and sites. There is also a ZIP import.
- **Schedules:** start, stop, restart, back up or send a command on a timer, per server.
- **Storage and alerts:** **Settings → Storage** totals what PlayPort manages, and **Alerts** can send a webhook or email when a server crashes, a backup fails, or disk space runs low.
- **Live player counts:** server and network cards show who is online, read from the game's own status protocol.
- **Phone layout:** the whole panel is usable from a phone on the same network.

---

## Users and permissions

There are three roles:

- **Admin:** everything, including users and panel settings.
- **Moderator:** manages every server and site, but not users or panel settings.
- **User:** sees and controls only what they create.

On top of roles, an admin can **grant** one person access to one specific server or site without handing over ownership. Grants are deliberately coarse (view, start/stop, edit, files) and the panel hides buttons a person cannot use. The server re-checks every request regardless.

---

## The built-in assistant

PlayPort ships a built-in assistant that helps inside the panel. It answers questions about the panel itself, can read a server's recent log to explain a crash, and can point you at the right screen. It runs locally with no account required, and every action it can take is limited to what the person asking is allowed to do.

---

## Troubleshooting

### Windows warns that the publisher is unknown

Expected. The build is not code-signed. Click **More info → Run anyway**. On Windows 11, if **Smart App Control** blocks it outright, that setting can be turned off in **Windows Security → App & browser control**; note that turning it off is not reversible without resetting Windows, so only do it if you understand that. To be sure your copy is the one that was built for release, compare its SHA-256 hash with the checksum you received with your purchase:

```
certutil -hashfile PlayPort.exe SHA256
```

### The panel will not start, or the port is in use

A PlayPort may already be running. The new copy detects it and offers to take over, or you can run `PlayPort.exe --stop`. If a different program holds the port, change PlayPort's port (`PlayPort.exe --port 8081`) or the other program's.

### I cannot reach my site or server from the internet

Run **Settings → Server readiness**. It checks the router path, the firewall, the bind address and the certificate, and tells you the specific thing to fix. On a home connection, a **tunnel** (see above) is often the faster answer.

### A Minecraft server will not start

Almost always Java. A server needs the matching runtime, and PlayPort downloads them for you. Open the server's **Settings**, where the panel names the Java the server asks for and offers a one-click **Install Java**. A server pinned to a Java version its jar cannot load is reported clearly rather than left to fail silently.

### My website shows a blank page or an error

Check the site's **Console** and its log. For PHP sites, confirm the file you expect is `index.php`. For built JavaScript sites, confirm the build completed on the **Activity** page and that the output folder is the one being served.

### Something is stuck

Open **Activity**. Long jobs are listed there with progress, and jobs the panel can redo offer a **Retry** button.

---

## Uninstalling

Delete the `playport-data/` folder, then delete `PlayPort.exe`. That is the whole uninstall. Nothing was written to the Windows registry or system folders, and no service was installed.

If you want to keep your worlds or website files, copy them out of `playport-data/` first.

---

## Licence and warranty

PlayPort is proprietary software. Copyright © 2026 Joshua van Doorn, trading as PlayPort. All rights reserved. See the [LICENSE](../LICENSE).

It is provided as is, without warranty of any kind. It manages servers and can move or overwrite world files, so keep backups. You are responsible for your own data.

Nothing here implies approval or endorsement by Mojang, Valve, or any other game or service mentioned.
