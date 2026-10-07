# PlayPort - game server + web hosting panel, as a single Windows executable

A self-hosted management panel for game servers **plus** website hosting, packaged
as **one .exe** that runs on any Windows 10/11 with **no install and no runtime to
ship** (it targets the .NET Framework that ships inside Windows).

- Minecraft servers (Vanilla + Paper) with **automatic downloads/updates** from
  Mojang's and PaperMC's public APIs
- **Steam games via SteamCMD** - boots the official `steamcmd.exe` (downloads it
  on first use), installs/updates dedicated servers with live download progress,
  with auto-update timers and "check for updates before starting" like AMP
- Manual/process-type servers (any executable)
- Live console with WebSockets, per-server + machine CPU/RAM charts
- File manager (upload/download/edit/rename/move), **selective zip backups**
  (per-category plan with measured sizes, per-kind retention),
  **schedules** (start/stop/restart/backup/command timers)
- **Website hosting**: static, **PHP/FastCGI** (the panel downloads `php-cgi`
  on first use and speaks FastCGI itself - no IIS/nginx needed), and
  reverse-proxy sites, each on its own port, with its own file manager
- **Automatic HTTPS**: one click gets a real **Let's Encrypt** certificate (a
  built-in ACME v2 client with http-01 challenges - zero external tools), or a
  self-signed cert for LAN/offline use, or upload your own PFX. The panel
  serves TLS directly on any port with no admin URL ACL.
- Multi-user logins with roles (admin / user), first-run setup, PBKDF2 passwords
- **Cloudflare tunnels built in**: one click downloads the official `cloudflared`
  binary (~60 MB) and gives any website a temporary public
  `https://*.trycloudflare.com` URL with no account and no open ports, or
  generates a named-tunnel `config.yml` routing every enabled domain for
  stable hostnames
- JSON-file storage (no database, no external files needed at runtime)

## Try it

```
PlayPort.exe --open
```

**Portable by default:** drop `PlayPort.exe` into any writable folder and
double-click - everything (config, sites, servers, MariaDB, SteamCMD) lives in
a `playport-data/` folder it creates next to itself. Delete the folder to
uninstall completely. If the exe's folder is not writable (e.g. Program Files
without elevation) it falls back to `%LOCALAPPDATA%\PlayPort`.

Opens http://127.0.0.1:8080/ - create the admin account, then
**Game Servers → + New server** - Minecraft Vanilla/Paper (pick a version,
accept the EULA) or **SteamCMD** (pick a game from the App ID catalog or type
any App ID) - or **Websites → + Host a website**.

**Importing a web app folder** (including Vite/React/Svelte/SolidJS/Angular/
Astro/Nuxt/Next source projects): point the site at the folder - PlayPort
detects the framework from `package.json`, runs `npm install` +
`npm run build` using bundled/auto-detected Node.js (retrying strict
peer-dependency failures with `--legacy-peer-deps`), and serves the build
output (`dist/`, `build/`, `.output/public/`, …) automatically. Frameworks
with static-hosting quirks produce a clear warning (e.g. SvelteKit needs
`@sveltejs/adapter-static`, Next.js needs `output: 'export'`, Angular builds
to a nested `dist/<project>/` - PlayPort finds it). Client-rendered SPA sites
get history-API fallback: unknown paths without a file extension serve
`index.html` so deep links and refreshes never white-screen; missing assets
still 404.

**Where data lives (switchable):** by default the exe keeps everything in a
`playport-data/` folder next to itself (portable). Launch with `--appdata` to
use `%LOCALAPPDATA%\PlayPort` instead (the old behaviour) - the choice is
remembered next to the exe, and `--portable` switches back. `--data DIR`
always wins over both.

Websites: the site's Settings page has the **TLS panel** - set a domain (e.g.
`example.com`) and click *Get Let's Encrypt certificate* (the CA must be able
reach port 80 on that domain; use the *staging* option to test), *Self-signed*
for `https://<lan-ip>` testing, or *Upload PFX*. Enable **HTTPS** with a
`tlsPort` (default 443) and the site serves both HTTP and HTTPS. PHP sites run
`index.php` out of the box and the file manager can upload anything - install
real web apps (WordPress etc.) from the site's Files page.

Steam servers: free dedicated servers (e.g. Counter-Strike 2, Team Fortress 2)
install with anonymous login. Games you own need your Steam username/password,
set in the server's Settings page (stored in `instance.json`). After install,
set the **start executable** (usually relative to the server folder, e.g.
`steamapps/common/valheim/valheim_server.exe`) - the panel only installs/updates
files; how the game boots is up to you, like AMP's generic SteamCMD template.

```
PlayPort.exe --port 8081 --data "D:\PlayPortData" --bind-all --open
```

**Duplicate protection:** if a panel is already running on the port, the second
copy detects it (public `/api/version` probe), shows a yellow warning, and offers
**[K] kill & take over** (graceful stop of the old instance - servers save and
tunnels close) or **[Q] quit**. Fatal startup errors pause ("Press any key")
instead of vanishing when the exe is double-clicked.

`--bind-all` (all interfaces) and website ports above 1024 may need, once:
`netsh http add urlacl url=http://+:8080/ user=Everyone`

### Going public (router port-forwarding)

To make sites/panel reachable from the internet (router forwards 80/443/8080/8081
to this PC), three things must line up - `add-urlacl.ps1` and `add-firewall.ps1`
(both run once with admin rights) do the first two:

1. **URL ACLs for every prefix form** - http.sys ACL-checks each form separately:
   `http://+:PORT/`, `http://*:PORT/`, `http://127.0.0.1:PORT/`,
   `http://localhost:PORT/`, `http://<LAN-IP>:PORT/`. A `+` reservation alone does
   NOT cover the loopback/IP forms (and `user=Everyone` fails on non-English
   Windows - use `sddl=D:(A;;GX;;;WD)`).
2. **Port-based firewall rules** - websites on ports 8080/8081/80 are served by
   http.sys (PID 4, kernel), so program rules for PlayPort.exe never match;
   add inbound TCP port rules instead. (TLS :443 is PlayPort's own raw socket,
   which is why it works with just the program rule.)
3. **Settings** - Website bind address blank (= all interfaces) and panel Bind =
   "All interfaces". Sites rebind immediately on save; the panel needs a restart.

Verify from outside with check-host.net: `https://check-host.net/check-http?host=http://<WAN-IP>:8081/`

## Build (from source, Windows only)

```
bash build.sh            # both binaries (see below)
bash smoke.sh            # every static and live check
bash harness/live/portslivetest.sh    # the three ports, with keys and a real agent
bash harness/live/tierlivetest.sh     # which model answers, and on which machine (needs no engine)
bash harness/live/modellivetest.sh    # the automatic pick, against a real runtime (Ollama etc.)
```

### Two binaries, and why (Smart App Control)

Where Smart App Control is enforced, Windows refuses binaries whose publisher it does
not know, and a self-signed certificate does not satisfy it. That policy blocked this
project's shipping exe on the machine it was developed against, twice, and the log
named the reason each time:

```
Code Integrity determined that a process (\...\explorer.exe) attempted to load
D:\project\playport\dist\PlayPort.exe that did not meet the Enterprise signing
level requirements or violated code integrity policy
(Policy ID:{0283ac0f-fff1-49ae-ada1-8a933130cad6})
```

The file it names is the one that **asks for administrator rights**. The same sources
built without the elevation manifest ran every single time and never appeared in that
log. So `build.sh` now produces both:

| Output | Manifest | What it is for |
|---|---|---|
| `dist/PlayPort.exe` | none | **double-click and it runs.** No UAC prompt, no block. The panel's own readiness screen says when it cannot add a firewall rule and prints the command to run instead |
| `dist/PlayPort-admin.exe` | `requireAdministrator` | a machine where Smart App Control is off, or where a real code-signing identity exists (Azure Trusted Signing). Cannot be probe-launched from a shell: its manifest means a UAC prompt, so MSYS refuses it outright |

A build is **installed only after it has been proved to run** (`--help`, which prints
usage and exits without starting a panel). If the policy refuses the new image, the
build retries with a new stamp, because each build is a new hash, and it never replaces
a working binary with a blocked one. Three refusals in a row stop the build with the
reason, and leave whatever was already in `dist/` untouched.

The durable fix is a real code-signing certificate. A self-signed one cannot satisfy
that policy, and no amount of rebuilding changes the publisher it cannot verify.


The build uses only `csc.exe`, which ships with Windows - no SDK install needed.

```
bash build.sh        # or: cmd /c "dist\build.cmd"? - bash is the supported path
```

Output: `dist/PlayPort.exe` - a true single file with the web UI embedded
(the `web/` folder is only used at build time / dev overrides).

## What's inside

| Area | Backend (C#/.NET, `src/`) | Frontend (`web/`) |
|---|---|---|
| Panel server, console WebSocket, static serving | `Http.cs`, `Program.cs` | `index.html`, `app.css`, `app.js` |
| JSON config/state, users/sessions | `Core.cs`, `Store.cs` | - |
| Instance manager, MC installs, backups, schedules | `Instances.cs` | SPA console/files/backups/schedules pages |
| What a backup contains (categories, matching, size plan, manifest) | `Backup.cs` | Backups tab plan panel |
| SteamCMD module (bootstrap, app_update runner) | `Steam.cs` | - |
| Game templates (CubeCoders/AMPTemplates catalog) | `Templates.cs` | Templates category in the game picker |
| Modrinth modpacks (catalog, mrpack install, loader server jars) | `Modpack.cs` | Modpacks category in the game picker |
| Websites (static + PHP/FastCGI + reverse proxy) | `Sites.cs`, `Fcgi.cs` | SPA site pages |
| HTTPS (ACME v2 client, self-signed, TLS server) | `Acme.cs`, `Der.cs`, `Tls.cs` | TLS panel in site settings |
| Helper bot (rule-based, no AI / no network) | `Help.cs` | floating ? widget + error banners |
| REST API | `Api.cs` | SPA calls it directly |
| Machine metrics | `Sys.cs` | Dashboard + charts |
| MySQL hosting (portable MariaDB, per-site/server databases) | `Db.cs` | DB panels on site/instance pages + Settings |
| Sandbox (job objects: memory cap + kill-on-close) | `Sandbox.cs` | - |
| Owner isolation (client accounts see only their own) | `Api.cs` (+ `Owner` on Site/Inst) | - |
| Cloudflare tunnels | `Tunnel.cs` | Settings + site panels |

### Hosting existing web apps

- **Import a folder**: create a site and point it at an existing folder on disk
  (or set "Serve an existing folder" in a site's Settings). PlayPort serves
  that folder in place - nothing is copied or moved.
- **Import a ZIP**: Files tab → *Import ZIP…* - upload a `dist`/build zip and
  it is unpacked into the site root (a single common top-level folder is
  stripped automatically; paths are guarded against zip-slip).
- **Preview before going live**: open a disabled site and hit *Preview site* -
  it serves the folder on a throwaway loopback port (127.0.0.1) that you can
  open in your browser without the site being publicly reachable. *Stop
  preview* tears it down.

### Game server picker (AMP-style)

The **+ New server** dialog is a searchable catalog: a category rail
(Minecraft / Networks / Modpacks / Templates / Manual) on the left, a grid of
tiles on the right - Minecraft Vanilla and Paper, Minecraft networks, the
Modrinth modpack catalog (sorted by popularity, with pack icons and download
counts), the full game-template catalog, and Manual. Pick a tile, then
configure name, version, RAM and port.

On a desktop window the dialog is sized for browsing rather than for a form: it
takes up to 1240px (five tile columns on a 1400px window, versus three when it
was capped at 740px) and the grid is about twice as tall, because the template
catalog is 200+ entries and a narrow strip meant endless scrolling. Narrower
desktop windows and phones scale down automatically; the config step keeps a
readable form width instead of stretching across the whole dialog.

### Game templates (CubeCoders' AMP library)

The **Templates** tab is not a hand-written list: PlayPort pulls the same
template library AMP ships, straight from GitHub -
[`CubeCoders/AMPTemplates`](https://github.com/CubeCoders/AMPTemplates) -
without cloning it and without vendoring a copy. On first view the panel reads
the repo's file index, downloads each `.kvp` manifest (plus its
`<slug>updates.json` / `<slug>ports.json` companions) with 10 workers, and keeps
a normalised catalog in `<dataRoot>/templates/catalog.json`. After that the
picker is instant and offline; **refresh** re-pulls from GitHub.

Each catalog entry carries what actually makes a game runnable - display name,
description, Steam header art, the *dedicated-server* App ID (Valheim 896660,
not the game's 892970), default game port, the Windows executable, the command
line, whether anonymous SteamCMD install works, and whether the template is
Linux-only. Creating a server from a template fills in all of that, so you are
not left hand-writing a startup command. AMP's `{{Setting}}` placeholders that
PlayPort can't know (server name, passwords, world name…) are surfaced in the
dialog instead of being silently dropped, and `{{$ApplicationPortN}}` is
substituted with the port you chose.

Database and runtime templates (MariaDB, MySQL, PostgreSQL, MongoDB, node,
Python, …) are filtered out of the picker - PlayPort already provides those.

**A server row says what it will actually run.** `paper · 26.2 (as "latest") · Java 25`: the resolved
Minecraft version with the label you created it with beside it, and the runtime its own jar asks
for, both read from the installed jar and carried in the list response itself - no extra request per
row. A runtime pinned below what the jar needs cannot load it, so that pairing is called out on the
row in red (`pinned to Java 21, needs 25`), and the server's Settings tab says the same two facts
plus the reason when you pick such a runtime by hand.

**What `latest` means, and why it is not a version.** A server created with *latest* resolves its
version and its Java from the artifact, never from the label: the version is the newest one Paper
publishes a **stable build** for (compared by version number, not by whatever order the API lists),
and once the jar is on disk its own `version.json` answers the Java question (`java_version` for
26.x, `javaVersion.majorVersion` for 1.17+). Both halves exist because of a report each: 26.3 was
listed with alpha builds only, so `latest` stopped installing at all, and a 26.2 jar launched on
`jre21` because the version string said `latest` and the rule for that string said 21. If a server
was ever pinned to a Java family its jar cannot load, the pin is cleared to Automatic at the point
of use and the swap is written into that server's console.

### Minecraft networks (Velocity + hub + games + limbo)

**Create → Networks → Minecraft Network** builds a whole proxy network in one
go:

- a **Velocity** proxy on the port players connect to (latest stable resolved
  from PaperMC's v3 API),
- a **hub** server (Paper or Vanilla) that players land in,
- any number of **game servers**, each with its own port (`25590+`),
- an optional **limbo** lobby (NanoLimbo) for AFK/fallback,
- **the core plugin and a template on every Paper back end** - the hub and each
  game server, chosen per server in the wizard,

then wires them together: a shared `forwarding.secret`, modern player-info
forwarding, a generated `velocity.toml` listing every backend with `try`
ordered hub-first, `online-mode=false` on each backend, and `paper-global.yml`
with the proxy secret. Adding a backend later (any Paper/Vanilla/Limbo server
with a network name) rewrites every proxy config in that network. `GET
/api/networks` returns the grouped view, `DELETE /api/networks/<name>` tears the
network down - the proxy and every member of it, in one call, with their files
kept if that is what you asked for (the network card's **Delete network**).

A proxy's Java requirement is not guessed and not pinned: it is read out of the
proxy's own jar (the manifest names the main class, and a class file's major
version is that class's Java major plus 44). Velocity's current builds are
compiled for Java 25, older ones for 21 or 17, and the panel downloads whichever
one the jar asks for. Pinning a proxy to a runtime the jar cannot load is
repaired rather than honoured - the pin is cleared with a line in the console
saying so - because a JVM rejects the class before any of the proxy's own code
runs, so such a pin can only produce a network that restarts forever.

Each back end also gets the **core plugin**, on a template you can see and change
before anything is built: every game row and the hub block has a **PlayPort Core**
picker - *automatic (the name picks the template)*, a named template, or *No core
plugin*. Automatic is the default and it reads the server's own name, so a game
server called `Creative` comes up as a creative server and one called `Survival`
as a survival server without anybody choosing it twice; a hub resolves to the hub
template by its *role*, whatever the network is called. The same pickers apply to
a server added to the network later, and a template the panel does not ship is
refused before anything is created rather than after. A vanilla back end or the
limbo lobby loads no plugins: it is told so in its own console instead of being
handed a jar it cannot use. See `pkg/notes/WORKQUEUE.md` 0al.

Every network also gets the **bridge** (`playport-bridge.jar`, installed into the
proxy's `plugins/`): `/hub`, `/server`, `/send`, `/sendall`, `/find`, `/glist`,
`/alert` and network staff chat are answered on the proxy, and a configured list of
staff commands is forwarded to the backend the player is standing on and run
*there*, as that player. Who counts as staff on the proxy comes from three places -
a name list in `bridge.yml`, a permissions plugin on the proxy, or the backends'
own **`perms` groups reported over the link** - so a network whose servers run the
core plugin needs nothing installed on the proxy at all.

### Modpacks (Modrinth)

Server-compatible modpacks are fetched from Modrinth's public API (no key, no
login). Pick a pack → pick a version → accept the EULA → install. PlayPort
downloads the `.mrpack`, places every mod/config in the right folder (client-
only files are skipped), applies the pack's overrides, and installs the
**Fabric**, **Forge**, or **NeoForge** server loader so the panel's normal
Minecraft launcher just works. The pack's Minecraft version drives the
automatic Java selection (Java 25 for 26.x, 21 for 1.20.5+, …). If a pack
pins a Fabric loader build that was never published, PlayPort falls back to
the newest loader for that Minecraft version.

The modpack picker searches Modrinth's whole catalog, not a fixed list: type a
name and it queries the live API (debounced) with the currently selected
loader/version, so packs that are not on the first page still show up. Each
result carries its download count and supported Minecraft versions.

### Minecraft plugins

Paper, Purpur and Velocity servers get a **Plugins** tab. It browses Modrinth's
plugin catalog filtered to the server's own type and Minecraft version, so you
only see things that will actually load. **Install** downloads the `.jar`
straight into the server's `plugins/` folder (no manual upload), and the
installed list can enable/disable (renames to `.jar.disabled`) or delete them
without touching the filesystem by hand. The server is not restarted for you:
reload or restart it when you are ready.

Alongside that installer there is a first-party core plugin so a template does
not need a stack of third-party jars: one jar, switched per template with a
profile. Ninety-three modules, and nothing in it can be bought: permissions and
groups, economy, earned ranks, homes/warps/kits/teleport requests, land claims,
private vaults (`/pv`) and shared ones for a faction or a team (`/teamvault`),
teams (a shared chest, a home and a chat, for the templates that have no factions),
king of the hill (`/koth`: capture zones, timers and rewards),
factions (claims, power, allies, faction chat, death-to-raid, a faction TNT bank,
upgrades, and named zones for spawn protection or war), faction beacons with siege defence,
spawner stacking, egg changing and levels, a buy and sell shop, prison mines, PvP
hearts with withdrew-able heart items, chat and mail, staff tools and jails, an
auction house, enchantments with permission locks, config-driven custom
enchantments that run through listeners instead of the vanilla registry, custom
items and chat glyphs (one item definition, one model-data space and one resource
pack: a module hands its items over and the pack build writes the texture, model and
override, taking the drawing from a png or from a pack the operator already ships),
fishing (a weighted table of twelve catches across six rarities, a level that gates
them, and a market that pays what they are worth and refuses anything that is not a
catch),
cosmetics (nicknames, nameplates, sitting, riding, glow, holograms, portals, and the
reference's own `armoreffect` / `particlepicker` / `panimation`),
cosmetic pets that can be vanilla mobs or Blockbench models (`familiars`), a bought
chunk hopper (`hoppers`), random teleport to safe unclaimed ground and a pearl check
that refuses a throw which would wedge you instead of teleporting you into it
(`rtp`, `/pearlfix`), thirty
throwable debuff potions (`potions`), and boss arenas with bosses defined in
`config.yml` - eleven premade ones, minions, on-hit effects and loot split by the damage
each player actually did, with a fight that survives a restart (`arena`), clickable
NPCs that look at passing players and run a command, message or warp when clicked,
editable in game or through a browser dialogue editor (`npc`), player-to-player
trading where nothing leaves an inventory until both sides confirm (`trade`),
server operations (time, weather, ping, TPS, player lookups, maintenance) and a
performance dashboard (tps, mspt, hotspots, lag cleanup, restart scheduling) that
also writes `perf.json` for the panel to read.

Forty-five more modules came in as one batch on 2026-09-17, each the *whole* of a reference plugin
whose remaining gap was a command's worth of behaviour: `crates` (keys, placed crates and weighted
tables), `doors` (named sets that toggle together), `parkour` (checkpoints and a finish plate),
`orders` (posted buy orders, with the money held from the poster), `market` (the black market),
`stream` (a streamer list, a live tag, watch time and drops), `bounty`, `button`, `compass`, `cooking`,
`donate`, `drops`, `effect`, `enchantlock`, `flags`, `flyc` (timed flight charges), `giftpet`,
`killall`, `kiteditor`, `limiter`, `lockip`, `lootchests`, `merchant`, `notarget`, `patrol`,
`realname`, `revive`, `reward`, `sameip`, `saveall`, `shoot`, `shulker`, `silentchest`, `skin`,
`sound`, `stack` (Orestack's merge, under its own `/orestack` - `/stack` is Admin's `/more`),
`tags`, `top`, `voice`, `warpsign`, `analytics`, `anvil` (a repair-cost cap) and `attachcommand`
(a command bound to the item in hand) - with a switch each and a value section each in
`config.yml`, so every one of them can be turned off from the panel. Six files in that batch were
duplicates of modules we already had and five of its command words were already taken, and the four
hard-coded fallbacks it carried (an invented crate table, two invented crate names, four invented
loot items, two invented market listings) were refused rather than merged; the reasoning is in
`WORKQUEUE.md` **0cs**.

The siege charge is worth a line of its own, because it is the one thing that
breaks reinforced obsidian: you use it on the block, not into the air, and the
module turns that into a thrown fireball that can still miss. Two debug switches
exist for exactly this kind of "it did nothing" report and are off by default:
`factions.debugInteract` logs every container interaction with its coordinates and
the protection decision, and `beacons.debugSiege` logs every charge launch and
impact. Both are what separated a plugin that stayed quiet from a server that never
received the click.

That jar is not something you download: `build-plugin.sh` compiles it, `build.sh`
embeds it in the exe, and the Plugins tab of any Paper server shows it as
**PlayPort Core** at the top, with a profile picker and an Install button. A
starter pack whose gamemode has a profile installs it too, with that profile
already chosen (`paper-hardcore` gets lifesteal, `paper-prison` gets prison,
`paper-factions` gets factions, and so on). Nothing else in the Plugins tab touches
it: it is the one file there that PlayPort itself wrote.

Profiles are the whole point of splitting it this way. Five ship in the jar
(`hub`, `survival`, `lifesteal`, `prison`, `factions`) and each is a small overlay
that switches modules off and tunes the rest, so the same jar is a lobby, a
survival server or a prison. Which one applies is resolved in one order, and every
layer is reported so nobody has to guess:

1. `profile:` in the plugin's own `config.yml` (your edit, always wins)
2. `pack.txt` next to it (what the panel's template asked for)
3. the only `profile-*.yml` in the folder, if there is exactly one

`/playport profile` prints which one is in effect and where it came from;
`/playport profile prison` switches, and `/playport profile off` drops back to
`config.yml` alone. The panel never writes your `config.yml`: a template change is
one line in `pack.txt`, which is what makes it reversible. The panel's own view of
this is `GET /api/instances/:id/plugins/core`, and it reports the same precedence,
so the interface cannot show one template while the server runs another.

Because the plugin is ours, the panel drives it while the server is up. The
**Settings** button on the plugin's card opens a form built from the catalog the
plugin itself reports - every key, its group, its label, its type - and saving it
is not a restart: the plugin watches the file and reapplies within a minute. The
form's groups are the modules themselves, so the newest one is reachable without a
console like the rest: **Trading** carries how long an invitation waits, how long an
idle window stays open, how far apart two players may wander, the money cap, how
many settled trades `/trade logs` keeps, whether they are written to the server log,
and the two switches for money offers and the written log. The
**NPCs** button beside it is the dialogue editor, and it is a different channel on
purpose. A dialogue is a list in order, and a key/value form has no way to say
*this before that*: so an NPC is a record, its click actions are rows with a
dropdown each (`message`, `command`, `console`, `warp`, `tp`, `spawn`, `sound`),
and they run top to bottom. What is typed in the browser is written to the plugin's
folder in a plain block format, and the plugin applies the file within a minute
without a restart.

Two rules keep the browser and the game from fighting. **The panel never writes a
position** - where an NPC stands belongs to the game, so a new one starts at the
world spawn and `/npc move <name>` decides the rest, then moving it in game is not
undone by the next save. And **the file is authoritative only for what it lists**:
NPCs the panel created or edited are created, updated or deleted from it, while an
NPC created in game is shown in the editor (so its dialogue can be changed from the
browser) but is never removed by a save. The editor labels each one *from the
panel* or *placed in game* so that is visible before saving rather than discovered
afterwards. The plugin reports its NPCs back with their world and coordinates, so
reloading the page shows what actually exists instead of an empty form.

The same card carries a **view** for each module that has something worth looking at,
and every one is drawn from the plugin's own report rather than from a copy the panel
keeps: **Models** and **Skills** are the makers, **Alerts** is the cheat history,
**LuckPerms** is the hand-off, and **Fishing** is the loot table - each catch with the
rarity it belongs to and the level that gates it, then the anglers by experience and the
counters (catches defined, caught of rolled, the level cap, where the textures come
from). The rarity colours are the module's own six names in the module's own order, and
the money is the server's own formatting, so an owner who renames a rarity or changes a
currency symbol sees that here instead of a palette the panel guessed at. A view appears
only while the module it reads is running, so a hub with fishing switched off shows no
Fishing button at all rather than an empty one.

Its notes live in `pkg/`:
`PARITY.md` (what every reference plugin does, mapped onto our own modules with a
status, the rule for which built-in commands are taken over, how a profile reaches
the server, and which of their code may legally be reused), `RESEARCH.md` (what was
learned from reading them) and `pkg/livetest/` (the harness that tests it against a
real Paper server with real bot clients).

`pkg/notes/REFERENCE-SCOPE.md` is generated too, and it is the wider of the two:
`node reference-scope.js` reads every reference jar and writes down what each plugin
actually **is** — its identity, every command it declares with aliases and permission
nodes, its **own config surface** (the top-level sections and their keys, which is where
a plugin names its features in its own words, including the ones no command touches),
the content it ships, and a feature index over the whole pile. It exists because both
features this project has missed were announced by a config key and by no command.

`pkg/notes/COMMAND-AUDIT.md` is generated, not written: `node command-audit.js` reads
the `commands:` block of every reference jar in the three download folders, falls back
to their class listings and permission nodes for the plugins that register commands in
code, and diffs the names against what `pkg/src/ppcore` actually registers - including
the words the core dispatches inside a root command. It is the scoreboard for command
coverage, and it exists because "did you add the safezone?" was answered "no, and it
was not even written down as missing" once.

`pkg/notes/FEATURE-GAP.md` is the third generator, `node feature-gap.js`, and it counts
rather than lists: what each reference declares, and how much of it the core already
names. Its headline is split on purpose - **hard** (a missing command, config section,
bundled file or message group, which is a feature by name and by storage) against
**names** (class-name words, which are leads) - because adding those together would be
the most misleading thing the document could do. It keeps a third column apart for the
same reason: **a feature the core already has under another name**. `Elevator` declares 28
config sections this core's vocabulary cannot place and 26 of them are built here
(`actionBarEnabled` is `elevator.notify`, `lazyCheck` is `elevator.lazy-check`), so a
module declares those renames beside its code - one `// ref-map:` line per reference name
- and `node harness/gates/refmap-gate.js` resolves each answer against `config.yml`, the registered
commands and the vocabulary before anything is credited. A declaration whose answer has
been renamed away credits nothing and fails the build, which is the difference between a
module saying what it is called and an alias table in the generator quietly whitelisting
it. The **third** state gets a column of its own for the same reason, and it is the only
one the number subtracts: a reference feature the core has **deliberately decided against**
is declared beside the code that would have it - `// ref-absent: <plugin> <name> -> <why>` -
with the argument, and `harness/gates/refmap-gate.js` resolves it both ways (the reference really declares
the name, this core really does not have it) before it leaves the work list. That is the
narrow version of what the retired "out of scope" label did badly: one named feature at a
time, printed with its reason and its `file:line`, reported as stale the moment a module
here grows the feature. Last run: **770 hard features missing across 83 reference plugins**,
70 credited by declaration and 1 recorded as deliberately absent, and it reads a module
already built as built, which is what makes it a work list. It also stamps the **core fingerprint** it was measured against, because the core is
edited while the generator runs - a second agent landing an 89 KB `Skyblock.java` mid-pass
moved the total 20 features on its own, and without the stamp that reads as a flaky tool
rather than a moving target.

`pkg/notes/RUNTIME-GAP.md` is the fourth, and it exists because every static read above
is a **floor**: a plugin's shipped `config.yml` is often a stub, and the real one - the
one that lists every feature in the author's own words - is written on first boot. So
`pkg/livetest/refboot.sh <tag> <jar>...` boots a batch of reference plugins on a second,
separate Paper server (its own ports and its own `plugins/`, so a probe can never disturb
a suite run) and archives what each plugin generates; `node reference-runtime.js` then
reports the difference, and `node feature-gap.js` folds it back into the headline. Run it
once and it pays for itself: ShopGUIPlus was scoring **0** hard features because its
entire config lives at `config/1_21.yml`, and probing is what surfaced it. **63 jars have
been probed and 8 could not be**, each listed with its own cause rather than dropped, and
rows that are a dependency rather than a reference are marked *(dep)* - which is what lets
this document and `FEATURE-GAP.md` reconcile instead of reporting different totals for the
same measurement (270 vs 227 is scope: 43 belong to libraries). Probing ten batches found
270 hard features no static read could see, the largest being VotingPlugin (+126) and
BigDoors (+44) - plugins whose shipped config is a stub or missing entirely. Since the two
documents are generated minutes apart while the core is being edited, `feature-gap.js`
checks `RUNTIME-GAP.md`'s fingerprint and states in the document when they disagree.

`node reference-runtime.js --plan` chooses the next batch from the artifacts rather than
from file names: unprobed references ranked by the gap the pipeline already scores them
at, then every blocked jar with the dependency it named and whether that jar is already on
disk. The first batch, picked by filename, was entirely plugins that were already
complete.

The same exercise is a test of the generator, and it failed it three times, all fixed here
rather than reported: ItemsAdder's 288 "features" were vanilla block models it had
downloaded into a cache; WorldGuardExtraFlagsPlus and WorldGuard were both credited with
the same 152 config sections because an extension writes inside the folder it extends; and
`config-wgefp.yml` was not read as config at all, which moved that finding - correctly -
from "only running the plugin reveals it" into the static column.

Run the plugin's tests with the JDK and Node already cached under `.runtime`:

```bash
bash build-plugin.sh                         # compile pkg/src into the jar
bash pkg/livetest/run.sh newmods-test.js     # ench, server and admin modules
bash pkg/livetest/factionsrun.sh             # factions, beacons, spawners (turns them on)
bash pkg/livetest/run.sh hoppers-rtp-potions-test.js   # hoppers, rtp, potions
bash pkg/livetest/familiarsrun.sh            # cosmetic pets, including a model pet
bash pkg/livetest/arenarun.sh                # boss arenas, both phases (incl. a restart)
bash pkg/livetest/ghostworldrun.sh           # the same files with a world the server cannot see
bash pkg/livetest/kitsrun.sh                 # the kit grid: a panel save into a live server, then a restart
bash pkg/livetest/npcsrun.sh                 # NPCs: create/click, a restart, the panel's editor
bash pkg/livetest/run.sh trade-test.js       # trading between two real players
bash pkg/livetest/run.sh probe-chatpub.js    # chat, broadcasts, mail
bash pkg/livetest/cosrun.sh                  # nicks, glow, hats, balloons, holograms, portals,
                                             # armour glow, the particle picker, the animations
bash pkg/livetest/run.sh customench-test.js  # custom enchantments
bash pkg/livetest/modelsrun.sh               # the Blockbench compiler and the pack
bash pkg/livetest/fishingrun.sh              # fishing: the table, the level, the market, the pack
bash pkg/livetest/run.sh profiles-test.js    # every template profile, applied
bash pkg/livetest/profilerun.sh               # which profile is chosen, and from where
bash pkg/livetest/ah-expiry.sh                # auction house, both phases
bash pkg/livetest/proxyrun.sh                # the network bridge: a proxy + 2 backends + 2 bots
bash pkg/livetest/worldgenrun.sh             # world generation: terrain, relief, sea, biome, a restart
bash pkg/livetest/uiartrun.sh                # artwork: the pack's font branch, codepoints, a restart
bash pkg/livetest/uihudrun.sh                # hud strips: pixel placement, the refusals, a redraw, a restart
bash pkg/livetest/uipanesrun.sh              # the UI editor's three panes, in a real browser
bash pkg/livetest/uipackrun.sh               # artwork out of a resource pack you already ship
bash pkg/livetest/packrealrun.sh             # the same, against the real packs, as a survey
bash pkg/livetest/itemverbsrun.sh            # the item verbs: the raw reads, the ten writes, then a restart
bash pkg/livetest/econrun.sh                 # the economy verbs: enchantment worth, derived prices, scavenge, cheque
bash pkg/livetest/ranksrun.sh                # the rank ladder: the list, one rung, a staff correction, a step down, a restart
bash pkg/livetest/votesrun.sh                # vote sites: the listener they call, the daily rule, the rewards, a restart
bash pkg/livetest/streamrun.sh               # streaming: a viewer count from a fixture source, watch time,
                                             # events and drops, a private stream, a broken source, three boots
```

**Voting (`votes`, ships off).** A vote site is an HTTP client, so this module runs its own small
listener (`com.sun.net.httpserver`, no dependency) and the listener is the feature. Two ways in:
a **token** call (`GET /vote?player=&site=&token=`, or the same fields form-encoded) and a
**Votifier v1** block, RSA-encrypted to the public key the module writes on first start as
`plugins/PlayPortCore/public.key`. Votifier v2 is refused and says why in the log: a v2 payload is
signed with the *site's* key, which the server does not hold, so accepting one would mean paying on
something unverifiable. With no token anywhere the port is not opened at all.

One vote per player per site per **calendar day** (the clock a vote site resets on), plus an
optional per-site `delayHours`. A vote is recorded the moment it arrives and its rewards are a
separate delivery: the record holds `total` (votes heard) and `paid` (votes whose rewards were
handed over), so the difference *is* the pending queue - an offline vote is paid on the next join,
a crash cannot double-pay, and `/playport save` cannot lose it. Points and a consecutive-day streak,
milestones at an exact vote count, vote parties that fire at a threshold and only once, and three
boards (`/votetop all|week|month`) as period-stamped counters. Rewards are console commands with
`%player%`, `%site%`, `%points%`, `%streak%`, `%votepoints%` and `%votetotal%` substituted, so a
vote can pay out through any other module.

Player commands need no node (`/vote`, `/votetop`, `/voterewards`, `/voteparty`, `/voteremind`);
`/adminvote` (`status`, `sites`, `add`, `take`, `clearday`, `points`, `streak`, `total`, `pay`,
`party`, `reload`) is `ppcore.votes.admin`, in the staff group. Turn it on with
`modules.votes.enabled: true` and set `votes.listener.token` (or a key per site) first.

**The item verbs** (CMI's items group) split into the two halves a staff member actually
wants from a thing in front of them: **read it raw** (`/itemnbt`, `/blocknbt`, `/entitynbt`,
`/entityinfo`, `/itemcmdata`, `/recipe`) and **change it** (`/item`, `/condense`,
`/uncondense`, `/dye`, `/trim`, `/itemframe`, `/book`, `/openbook`, `/getbook`, `/mirror`).
The reads answer with what the *server* holds rather than with a summary: a chest's contents
as opposed to the copy a window was sent, the components on an item, the data a module
attached to an entity. The writes are asserted on the server's own copy of the item, because
that is the copy that matters for a colour, a trim or a written book.

Two of them are not commands in any ordinary sense: `/mirror` is a listener on a block
placement that copies it across the plane through your own column - and never overwrites
a block that is already something else, which is the difference between a builder's tool and
a griefing one - and `/openbook` is a packet the client either receives or does not.
`/book` writes pages, finishes the book with a title, and saves it to a library file;
`/getbook` hands it back to anybody, with its pages, across a restart. The one deliberate
omission is `/customrecipe` (see `pkg/notes/PARALLEL-QUEUE.md`): a recipe editor belongs with
the crafting engine this project was handed a reference for, not bolted onto an item command.

**The four economy verbs** (CMI's economy group) are the ones that put a number on an item and a
number back into a player's hand. **`/setenchantworth`** prices an enchantment - one price for
every level, or a level of its own - and that one table is what `/price`, `/sellall`, econ's
`/sell` **and** `/scavenge` all read: an enchanted pickaxe worth more at the shop than at `/sell`
is a difference a player finds in a minute, so there is one number and four doors. **`/generateworth`**
derives a price list from the server's own recipes - an item is worth what its ingredients are worth,
taking the cheapest way to make it - never revising an operator's own price, stopping after a fixed
number of passes because a recipe graph has cycles, and pricing nothing at all when a recipe needs an
ingredient nobody has priced, so a half-priced server gets fewer numbers rather than wrong ones.
Before it writes nine hundred prices into the operator's data file it takes a backup: that is the one
place in the module that can destroy a hand-written list. **`/scavenge`** takes an enchanted item
apart, paying its enchantments out as experience bottles and returning the item's own ingredients,
with the four chances printed before anything is spent - and a worn-out item is likelier to lose its
materials, so bringing one in is a decision rather than a free win. **`/cheque`** writes a balance
onto paper, with the amount in the item's persistent data rather than in a name a player could
retype, and a right-click puts it back; a click on something interactive is left alone, or the
deposit would swallow every chest in the world for anybody carrying one.

**The rank ladder has six verbs over one earned list, and the split is the design.** A rung is a
group from the perms module gated on things a player earned - blocks mined, minutes played, money
earned in game - so "ranks are permission sets" is what the code does rather than a promise.
`/rank` says where you are and what the next rung asks; `/rankup` takes it when you have earned it;
**`/ranklist`** prints the whole ladder in order with your place marked; **`/rankinfo`** takes one
rung apart - its requirements as `current/needed`, the group it grants, the rung after it - for you
or for a named player; **`/rankset`** is a *correction*, staff only (`ppcore.ranks.set`), because a
rank that can be granted without being earned stops meaning anything; **`/rankdown`** steps back
down to an earlier rung and takes a confirmation, because giving a rank back is a loss.

Two things the suite settled that reading the code would not have. The ladder used to compare a
record's money field directly, and an unread record holds **`-1`** with the real balance in
`econ.startBalance` - so a player who had the money and had simply never run `/money` was refused a
money rung. And `/rankdown` answered "there is nothing below it" at the bottom rung *before* it
looked at its argument, which meant two refusals (a rung that is not below you, a rung that does not
exist) could never be reached from the bottom. Both are the same shape of bug: a true sentence
answering the wrong question. The reference this group was read from (CMI's own rank commands over
`Settings/Ranks.yml`) is a *graph* - several `NextRanks` per rank, and requirements that may be
exp, votes, permissions, items, third-party skill levels or stats this plugin does not measure -
and what does not map is named rather than implied: this ladder is linear, its requirements are the
three numbers this server already keeps, and `ranks.command` is the hook for an owner who wants
their own rules applied instead.

**Artwork can come from a pack you already ship.** `ui.art.import` names one or more `.zip`/folder
packs; every `bitmap` provider in their `assets/<ns>/font/*.json` becomes an artwork named after the
font file and the picture (`ui/logo`), drawing at **the pack's own codepoint** - because that is the
number the client's copy of that pack answers. An imported picture is therefore *not* published into
the pack this plugin builds: the client needs that pack, and `/playport check ui` says so by name.

**Or take the pictures instead of borrowing them.** `ui.art.adopt` names packs whose pictures become
this plugin's own: the bytes are written into `art/<name>.png` under the pack's own name, and the
ordinary folder pass gives each one a codepoint from this plugin's registry and publishes it into the
pack this plugin builds. A client then needs nothing but the server's pack - at the cost of a copy
frozen at the moment it was adopted. Adopting never writes over a file already in `art/`. The three
real packs measured here (UltimateUI, ItemsAdder, CosmeticsCore) are **348 pictures, adopted with 0
lost**; `PP_PACKREAL_MODE=adopt bash pkg/livetest/packrealrun.sh` is the survey that proves it, and
it counts the files written *and* the names listed so the two have to agree.

`uipanesrun.sh` is the one suite here that drives a **browser** (Chrome over CDP). It needs no Paper
server: what it measures is markup, and the markup is built by the panel from the report it is
holding. So it boots the panel, installs the core plugin, seeds a report through the plugin's own
route and token, and then clicks its way through the menu, strip and board editors - asserting the
workspace's *shape* (three columns, all three panes inside the right one), the sizes a person reads,
and that no page error was thrown. Three pictures land beside the log for a human to look at. It
exists because the two failures it caught were invisible from every other angle: an unbalanced
`</div>` in a pane's markup *closes an ancestor early*, which the browser accepts silently, and a
repaint that throws at its last step leaves the page looking correctly painted.

Every driver goes through `node pkg/livetest/lint-drivers.js` before it runs, which refuses one
particular file: a driver whose note sits **inside a template literal** and carries a backtick, so
the note itself ends the literal and the rest of the script is parsed as code. `node --check` cannot
see it - the file still parses - and the suite dies two minutes in with `missing ) after argument
list`, which reads as a broken editor rather than as a broken sentence. It cost two runs in one
afternoon before the check existed. Run it by hand against any file: `node
pkg/livetest/lint-drivers.js web/core-uis.js`.

Each of these takes its own **lane** (`pkg/livetest/lane.sh`): its own server root, its own
ports, and a lock. So two suites can run at the same time - and two agents can work at the
same time - without one runner's "free the port before starting" step killing the other's
server, which used to surface as a crash in a module that had nothing wrong with it. The
lane's root and ports are the first line of every run; a second run of the *same* suite is
refused with the reason instead of quietly sharing the world.

`proxyrun.sh` is the only suite with more than one server in it, because the bridge is
the only piece whose job is to talk to a different process: it stands up two Paper
backends and a real Velocity proxy, and proves end to end that a player connecting to
the proxy is moved between the two backends by `/server` and back by `/hub`, that both
backends report the link under the names the proxy knows them by, that a network listing
reaches a player's chat, and that a staff command typed in the proxy's console runs on
the backend that player is standing on and on no other. It uses **two bots** - one on each
backend - because half the bridge's verbs are only meaningful with somebody else in the
world: `/find` needs a name to look up, `/glist` needs people on more than one server to be
a network view, `/sendall`'s "everyone" has to be more than one player, and staff chat's
whole value is reaching a reader on a *different* backend. It also types two commands in
the same instant on purpose: Velocity rate-limits a player's commands and forwards the
over-limit ones to the backend, which is where a routing verb used to be answered by the
core plugin's unrelated command of the same name.

And the panel's half of that, which is a different claim: that the plugin can
get from the exe into a server at all.

```bash
bash coretest.sh                       # the bundled core plugin, installed through the API
bash pkg/livetest/panellink.sh         # a live panel and a live server, talking to each other
```

`panellink.sh` is the only test where neither half is faked: the panel the build
just produced and a real Paper server running the real jar. It proves the settings
file, the NPC editor and the status report in both directions - a value typed into
the panel is the value the server is running with, and an NPC created in the
browser is placed in the world, reported back, and removed again when it is deleted.

The same walk is done for each of the panel's record editors - **NPCs, models, skills, quests,
kits and custom enchantments** - and each one follows one contract: the editor writes the shape
the plugin's own config already uses (`ess.kits.list.<id>`, `customench.enchantments.<id>`,
`quests.defs.<id>`, ...) into its own `panel-*.yml`/`.txt`, the plugin merges that file over its
config within a minute, and the *module* reports back what it loaded - including the
vocabularies its own code enforces, so a picker in the browser is built from the thing that
applies it. `pkg/notes/PANEL-CONTRACT.md` is the inventory: every file the panel writes, the
keys the plugin actually reads, and the two where those did not agree.

**A template is not finished when it can be edited; it is finished when there is a lot of it to
edit.** `pkg/notes/TEMPLATES.md` is the standing instruction for that, and it is addressed to every
agent rather than to one session: the five parts of a finished template (records, volume, a
generator, a gate, a switchboard so an owner can take a little or a lot), the two rules that make
shipping hundreds of rows safe (a template is a *layer* over the config path the module already
reads, and it fills only ids nothing above it defined), four worked examples - the quest library
(317 quests in 16 packs, gated against the API jar's own `Material`/`EntityType` lists), the shop
catalogue (530 listings in 12 packs, one *worth* per item, calibrated so the prices `config.yml`
already fixes are adopted rather than re-derived), the custom enchantment library (259 reference
names, 102 appliable) and the **jobs library** (24 professions in 4 packs, 482 pay rows whose rates
are not written at all but *derived*: a fifth of what the work is worth, capped under a crate's
expected value, which is the only way a wage paid on every block can ship without being a printer) -
a ledger of how dense each template currently is, the checklist for expanding one, and the traps that
cost the most time.

**An economy needs an ordering, and the ordering is checked.** Prices that are each defensible alone
can still be a server where digging pays better than playing, so `pkg/tools/economy.js` holds the
ranking this project runs on - a quest pays more than a head, a head more than a giveaway, a giveaway
more than a job action (the smallest unit of work in the ladder: one block, one kill, one catch, and
the only rung that pays on *every* action rather than on one deliberate act), and a job more than
selling an item - measures it against the shipped quests, head prices, giveaway pools (on expected
value), the profession library and the catalogue's bands, and writes `pkg/notes/ECONOMY.md`, the sheet
an owner can read. `bash harness/check.sh` runs it, so a pack that inverts the ranking fails the build rather than becoming
a server nobody farms. Every reward is a *wage* too: a quest's pay is clamped to the value of what its
goal makes, times at most eight, under a ceiling taken from the most expensive purchase the server
sells (twice the dearest spawner axis).

`coretest.sh` drives a panel out of a **slot** of its own (`harness/coretest-lane.sh`): a panel port
(8137 upward), a data root (`.coretestdata-lane<i>`), the ports its instances use (27400 upward,
above the live suites' band), its own model/brain ports, its own **copy of the binary**
(`${TMPDIR:-/tmp}/ppbin-coretest/PlayPort-coretest-lane<i>.exe`, taken from `dist/PlayPort-test.exe`
and refreshed whenever that is newer) and a lock. The first free slot is claimed, so
**two runs at once are normal** - this is the panel's own API test and it takes minutes, and until the
slots existed both runs shared port 8137 and one root, so the second run's first act killed the first
run's panel and the first then answered `instance not found` to every call. The private copy is the
other half of that: `dist/PlayPort-test.exe` is the file `ensure-test-exe.sh`, `smoke.sh` and every
peer's `build.sh` write, so a run that drove it would be driving a file that is renamed and replaced
underneath it - and this suite starts its panel up to three times in one run, which would then be three
attempts at different binaries. Under its own name nothing rebuilds or stops it; the shared build can
be replaced mid-run and the suite is unaffected (proved: the run was green while a peer's
`stop-panels.sh --exe PlayPort-test.exe` reported nothing to stop and the shared file's own mtime never
moved). The suites' lanes are in
`pkg/livetest/lane.sh`; this one is a pool rather than a name-to-lane table because the same suite
running twice is the case to *support*, not to refuse. Pin a slot with `PP_CORE_SLOT=1 bash coretest.sh`.

Two runs at once are proven rather than assumed: a pair in slots 0 and 1 finished
`PASS=293 FAIL=0` each while overlapping for five and a half minutes of installs, server starts and
network teardown, and each panel listed exactly its own root's instances while both were live. The
one thing a slot cannot isolate a run from is a **peer's build**: a build used to ask *every* panel on
the machine to stop when it wrote a new exe, so another session building mid-run killed the panel
under test. That is fixed - a panel records its own image and a build now stops only the panels
running the file it is replacing (`stop-panels.sh --exe <name>`; `--list` prints who is running what
and stops nothing) - but a peer on an older build, or a bare `stop-panels.sh`, can still do it, so the
suite says so on its first failure: it checks whether anything is listening on its own panel port, and
if not it prints the cause and the artifact timestamps and stops, instead of finishing with two hundred
`instance not found` lines that read as a broken panel. If you see that message, the rest of the log
is not evidence about the product: re-run once the other session's build is done.

`coretest.sh` creates a server through the panel, installs the core plugin, and
checks the files on disk: that the jar is in `plugins/`, that it is byte-identical
to the built one, that its five profiles landed next to it, that `pack.txt` names
the requested profile, that a second install does not overwrite an edited profile,
that the reported state follows the real precedence order, that an unknown profile
is refused rather than guessed, and that a starter pack installs it with the right
profile. The panel's side of the plugin link is covered the same way: the settings
form and the NPC editor both write files the plugin reads, and both are checked
byte for byte, including the case where a value containing a newline would otherwise
forge a second setting or a second NPC. It also asserts that the files it writes
never leave the repository, which
is a lesson from this suite: an earlier version extracted a profile into `pkg/`
and then moved it out, deleting a shipped file from the source tree.

Each one boots a throwaway Paper server, joins real clients, and reads the server's
own state (inventories, health, abilities, entity data) rather than trusting what a
plugin says about itself.

### Game settings, with names instead of keys

`server.properties` is where every Minecraft owner ends up, and it is the worst
interface in the stack: dozens of keys, no labels, no ranges, and the server
rewrites the whole file on boot so hand edits get normalised and their comments
disappear. The **Game** tab replaces it with grouped controls: *Identity*,
*Gameplay*, *World*, *Performance and safety*, *Remote access*, *Resource pack*.
Each row carries a plain-language explanation, numbers get real limits, booleans
become switches, `difficulty` and `gamemode` become dropdowns, and the RCON
password is masked until you ask to see it.

It is a *safe* editor, not a form over a file. Only the rows you changed are
written; comments and any key PlayPort does not know about are left byte for
byte as they were (unknown keys are shown raw at the bottom rather than hidden).
Values are escaped exactly the way the server escapes them (`Hi: there` is
written `Hi\: there`, a coloured MOTD keeps its escape), and duplicate keys are
collapsed - Java keeps the last one, so leaving an earlier line behind is how an
owner edits `view-distance=10` at the top of the file and watches nothing
happen. A value that fails validation is refused by name with the reason, and
the rest of the batch still applies. The server port is shown as managed, because
PlayPort writes it at every start and an editable field there would be a lie.

### Players: whitelist, operators and bans

The **Players** tab is the four JSON files nobody wants to edit by hand
(`whitelist.json`, `ops.json`, `banned-players.json`, `banned-ips.json`) plus
who is online right now, in one list with badges. Every UUID in those files is
the player's Mojang id in dashed form; get it wrong and the entry silently does
nothing, so the panel never guesses:

- **While the server is running** every change is a normal console command
  (`whitelist add`, `op`, `ban`, `kick`), so the server resolves the name itself
  and writes the file. The row says which path was used.
- **While it is stopped** the files are edited directly, resolving the name
  against Mojang's public lookup endpoint, and falling back to the deterministic
  offline-mode UUID (MD5 of `OfflinePlayer:<name>`, the same value every offline
  server computes). Which of the two was used is stated in the response rather
  than hidden, because a guessed id on an online-mode server looks like success.
- Actions that need a live server (kick) say so instead of failing quietly, and
  a name that is not a valid Minecraft name is refused before any write.

### Restarts that warn the players first

A reboot at 04:00 with no warning is the most common complaint about a server.
A schedule whose action is *Restart* or *Stop* now has a **Warn players first
(minutes)** field: the panel broadcasts over the server's own console at the
full time, again at one minute and again at ten seconds, then performs the
restart. Warnings are checked on the fast tick, so they land within a couple of
seconds of when they were asked for. Deleting or editing the schedule during
that window cancels the pending restart and says so in the console - leaving it
queued would restart a server minutes after the operator called it off.

### Auto-restart that knows when to stop

Auto-restart used to retry forever. A server that dies within a minute of
starting is not flapping, it is failing, and retrying it fills the disk with
crash reports and buries the cause under the retry noise. Three fast failures
in a row now stop the loop: the status becomes an error that names what
happened (`Gave up after 3 failed starts in a row`), the console explains it and
points at the diagnosis above it, and pressing **Start** by hand clears the
counter for a fresh run. Retries back off 8s, 16s, 32s, and the counter is
visible per server (`failStreak`) so the interface can say a server is being
retried rather than showing one that quietly keeps dying.

### Plain-English crash explanations

When a server dies, PlayPort does not just tell you "it stopped" - it reads the
tail of the log through a rule-based analyzer (no AI, no API key, entirely
offline) and prints a plain-language cause plus a suggested fix. It recognises
the failures people actually hit: a missing or wrong Java version with the exact
`java.exe` download to install, port already in use (naming the other server),
the EULA not being accepted, out-of-memory limits, a world saved by a newer
version, a config file that will not parse, and mod/plugin dependency clashes.
It is scanned automatically the moment a server enters an error or crashed state
(the banner offers **What happened?** / **Why did it crash?**), and the panel in
the console has **Scan again** and **Look further back** if the real cause scrolled
past. You never have to understand the raw stack trace.

The one failure a console cannot explain is a world folder that was left half-made,
so the panel reads the folder too and puts it where the crash is: what shape it is
in, how much land is in it, and - only when there is a `level.dat`, no world gen
settings and *no chunk ever generated* - one button that sets the half-made folder
aside (`world.broken-<timestamp>`) so the server can create the world properly.
A world with land in it is never moved by the panel; that is the owner's call, and
the panel says so instead of offering. Once the folder is fine, the fatal finding
is dropped from the reading rather than kept there accusing a repaired server.

When the model is asked instead of the rules, the answer is rendered as the
markdown the model wrote (headings, steps, bold, inline code - escaped first, so
nothing a model writes can become markup) and is shown together with **the lines
it was actually handed**, collapsed behind a summary, and the count of what the
panel read versus what it passed on. A reading made from four kept lines should
look like one.

### The bot that reads the log so the model does not have to

A Minecraft console is mostly not errors. A 250-line window of one is a plugin
list, a lag monitor, a spark banner, a warning about `sun.misc.Unsafe` and a wall
of `at java.base/...` frames. Handing all of that to a model that runs on the
same machine costs three things at once: the local model's context is small, its
generation is the slowest thing the panel does, and a model given fifty lines of
noise reasons about the noise (the first version of this genuinely suggested
"turn on Update on start" and mentioned the `sun.misc.Unsafe` warning as if
either had anything to do with the crash).

So `LogFeed` runs first, and it is deliberately dumb in a way you can check. It
keeps the exception, what the server said it could not do, the `Caused by` chain
and a few frames per exception, and it drops the banners, the plugin lists, the
repeated warnings, the JVM plumbing frames and the panel's own earlier commentary
(a model that reads its own previous guess as evidence starts arguing with
itself). Two rules make it honest rather than clever: **it never invents a line**
(everything it keeps is a line the server printed, in order), and **it says what
it dropped**, so the count is visible next to the answer instead of the model
going quiet about it.

Every place a console can reach a model goes through it: the crash explainer, the
triage of an unrecognised crash, and the assistant's own view of a server. The
console window itself is a bounded in-memory ring, so "reading gigabytes of logs"
is not something it can do; what the bot bounds is the *prompt*.

You can see exactly what a model would be handed, with no model and no panel:

```
PlayPort.exe --feed path\to\console.log
```

It prints the kept lines, the counts (kept / routine / known noise / frames
folded) and the same summary sentence the page shows. `harness/live/feedlivetest.sh` pins it
against the real failure that made it exist, a quiet boot, a two-deep cause chain
and an empty file.

### Worlds a server owns, decided before it exists

A world is the one part of a Minecraft server that cannot be fixed afterwards.
The plugin can *adopt* land that is already on disk, but adoption keeps whatever
made that land: a world the server generated first is ordinary vanilla terrain no
matter which preset is named later, and the only way to get the terrain you
wanted is to ask before the first chunk is ever written.

So the create form asks, whenever the core plugin is going in with a starter
pack: a list of worlds, each with a name, a preset and an optional seed. The list
travels with the create, the panel's own validator checks it on that path exactly
as it does on the world view (same slugging, same seed rule, same refusals in the
same words), the install writes it into the plugin's `panel-worlds.yml`, and the
plugin makes those worlds itself on the first start. A row that fails is refused
**by name in the new server's own console**, so a typo arrives as a sentence
rather than as a world that quietly is not there.

The preset choices come from the bundled plugin's `config.yml`, read out of the
jar by the panel, so the dropdown and `/worldgen create` cannot disagree and
there is no second list to keep in step.

### Unrecognised crashes (the review queue)

A rule engine only explains failures somebody wrote a rule for. When a crash
matches no rule, PlayPort does not throw the evidence away: it saves a trimmed
copy of that server's log and lists it under **Activity → Unrecognised crashes**
(admin/moderator only, since a log can belong to any client's server).

The list is built to be worked through rather than browsed:

- Crashes are **grouped by signature**. Timestamps, ports, ids and file paths are
  normalised away, so the same bug on six restarts or three different servers is
  **one** row with a `×N` count instead of six rows. Sort is by count, newest
  first, so the thing that hurts most is at the top.
- Each row shows the **server**, when it was last seen, and the single most
  distinctive line from the crash, so you can usually tell what it is at a
  glance. **Show log** expands the saved console tail; the panel's own lines
  (`! Process exited unexpectedly`, the explainer steps) are ignored when picking
  that line, so you always see what the game said, not what PlayPort said.
- **Re-check** re-runs the current rules over that saved log. Add a rule to
  `Diagnose.cs`, press Re-check (or just restart the panel, which re-checks
  everything once), and the row flips to **"A current rule explains this now"**
  with the rule's title - so you can see the fix worked before deleting the
  entry. **Reviewed** removes one; **Clear all** empties the queue.
- Crashes the analyzer *can* explain are never filed here. Filing only happens
  when nothing specific matched, so this list stays a genuine to-do list.

Nothing in this loop talks to a network. The saved log is capped (last 40 lines
per entry, 60 entries, oldest dropped first) and lives in the data root as
`unknown-crashes.json`, so it is deleted along with the rest of your data.

### Three ports, three promises

PlayPort listens in three places, and they are three different doors on purpose:

| Port | Who talks to it | What proves who they are | What it can reach |
|---|---|---|---|
| `8080` (yours) | a person, in a browser | a login session | the whole panel |
| `8100` (Settings: *Model and agent port*) | a program, like another AI tool | an API key | models, the tool loop, the brain over HTTP |
| `8101` (Settings: *Brain port*) | a program | an API key | what this machine has learned |

Why not one port: a tunnel or a firewall rule is aimed at one port, so an agent that
can use a model should not silently also be able to reach the control panel. Publishing
one door must not publish the other two, and which door you opened should be checkable
rather than remembered. **Ports** in the panel (and `/api/ports`) names all three with
what each is for.

The panel port deliberately does **not** answer `/v1`: a client pointed at it gets told
which port to use and which key to present, instead of a 404 that reads like the feature
was removed.

Both program ports bind **loopback only** unless *Reachable from the network* is on, and
they always demand a key whatever the bind, so nothing on the LAN can use the GPU just
by finding the port. If the network bind is refused (it needs admin or a urlacl on
Windows) the port still comes up locally and the log names the exact command to fix it.

### Models: the AI this panel runs on itself

The **Models** page in the sidebar is the local AI in one screen, and it answers three
questions a person actually has: what can this machine run, what is it running now, and
what does the panel make of the state it is in.

**The guard comes first, and it is about the machine, not about trust.** This panel
also hosts game servers, so a model is the one feature that competes with them for the
same GPU, the same RAM and the same heat budget. The page opens with the guard's own
verdict, and a limit that has been crossed is stated with the measured value next to the
threshold it broke. Loads and downloads are refused while a hard limit is held, rather
than attempted and cut short.

**The panel chooses, so there is nothing to pick.** A tool is finished when you can type
into it, not when it opens onto a list and waits. The page leads with the model this
machine should be running: the largest one it can run *well* (half or more of its layers
on the GPU), preferring what is already on the disk over something that has to be
fetched, and it says why in the same breath. It fetches the pick when it is missing and
loads it at startup, so a machine with an engine and nothing else ends up answering
questions with nobody watching. Picking a model by hand is how you **pin** one: that
pin always wins, and one button hands the choice back.

The decision is judged against this machine with **nothing loaded**. Without that, the
model the panel itself loaded is what makes the next one look like it no longer fits,
and the pick drifts down to the smallest thing that fits, once per restart, forever.
Two bugs of exactly that shape were found by running it: every fit row was missing the
model's parameter count (so nothing could be ranked and the smallest always won), and
the ranking put "fits entirely on the GPU" above everything, which made a 0.6B toy beat
a 7B coder by one layer of offload on a full 8 GB card. Size is what makes the answers
good; how it fits decides whether it is allowed at all.

**Asking is what loads a model.** Nothing is fetched on install: the weights arrive the
first time the panel decides it needs them, which on a machine with nothing on disk is
the first start. When no model is loaded, an AI route does not refuse any more, it asks
for the one this machine should be running and waits (bounded by `auto_wait_secs`, 45 by
default) for it to come up. **Let go** means let go: an idle unload or the button holds
the model down until a question or the button releases it, because an automatic pick
that reloads on a timer is a machine heating itself for nobody. Nothing here overrides
the guard, and every refusal it causes is reported with its reason exactly as a hand-made
one would be. Switching the panel's choice off is setting `autoload` to empty; a test
machine wants that, and so does "do not touch my GPU".

For the sizes: the catalogue is a list of names with what each one costs in VRAM, and
the size it needs comes from the publisher until the weights are actually on this disk,
at which point the measured number replaces the estimate and the page says which one it
is showing.

### Which model answers, and where (the tiers)

One panel can answer from three places: a small model on this machine, the big model this
machine was measured for, and a linked machine across the network. Doing nothing means the
big model is loaded for every question, which is wrong on a machine that is also doing
something else: a model big enough for a hard question holds the GPU the whole time it is up,
whether or not anybody is asking anything difficult.

So every request carries a **weight**, and the weight decides. **Routine work** (the
overview, the help box, a lookup, a thought) is `light`: it is answered on this machine,
always, on the small model. It costs nothing extra and it never wakes anything, because a
question about a menu does not deserve a cold GPU and certainly does not deserve somebody's
gaming machine. **A hard question** (a crash nobody has seen, a repair, an agent turn) is
`deep`, and only that one may move machines:

1. the model that is **already loaded**, if it can do it. Reloading to answer one question is
   the most visible waste there is;
2. the big model **here**, but only if this machine is idle enough for it. The machine's own
   load decides, not a preference: at or above `tier_busy_pct` (60% CPU by default), or with a
   guard verdict against starting work, the big model is not loaded on top of what is already
   running;
3. a linked machine that is **already awake**;
4. a linked machine that can be **woken**, and only now. Waking a whole computer is the most
   expensive thing the panel can do, so it is the last resort rather than the first;
5. the small model here, **saying so**, because a shorter answer with a reason beats a
   failure without one.

The Models page shows both paths with the reason for each, read from the panel rather than
re-derived by the page, and the reason is repeated in the feed whenever the answer moves
machines. `tier_mode` is the policy: `auto` (this machine first), `local` (never hand work to
somebody else) or `peer` (prefer the other machine). `tier_min_secs` (45 by default) is the
shortest time between two swaps of model, so a busy machine cannot be made to reload itself
continuously by a poll.

A panel pointed at a runtime that loads on demand (Ollama, LM Studio) is treated as able to
answer: such a runtime takes the request and pulls the model itself. Reading only "is a model
in memory right now" made a working runtime look like no model at all, and handed routine
questions to a sleeping computer.

### The free cloud: outsourcing to models that cost nothing

A panel with no model of its own is not a panel with no AI. `cloud_tier` is one switch, in three
honest positions: **off** (nothing leaves the machine), **fallback** (this machine answers, and
the cloud is where a question goes when nothing here can take it) and **prefer** (the cloud
answers, because the strongest thing on it is a 550B reasoning model and it costs nothing per
token). `cloud_url` and `cloud_model` point at any OpenAI-compatible router - the default is
Requesty's, one key for a catalogue of hundreds - and the key lives in its own file
(`ai/cloud.json`), never in `settings.json`, because a setting is something the panel shows, logs
and sends to a page.

The catalogue of models that cost nothing is **measured and then written down**: every entry in
`Cloud.Shipped` answered `GET /v1/models` with an input AND output price of exactly zero. The
panel refreshes that list from the router whenever it can reach it, so a model that starts being
billed disappears from the free list and is named as charged, rather than being offered as free
and quietly costing money.

**A rate limit is ordinary, not exceptional.** These are shared free quotas, so when the model a
panel is set to answers `429` the request walks the free catalogue and another one takes the
question: the reply says which model was asked first (`switched_from`) and **why it stepped aside**
(`switch_why`), in the words of the refusal that actually happened - a rate limit, a model that has
been retired (404), a router that errored. Whatever answered is named in the reply and in the feed,
because an answer that quietly comes from a model nobody picked is worse than a refusal. What was
rate-limited **stands aside** for `cloud_cooldown_secs` (120 by default) so the next question does
not pay for the same discovery, and the Models page can put it back in play by hand.

The switch that decides this is on the Models page, and so is what the panel actually saw: the
free catalogue, what is standing aside and why, and the reason the last answer came from where it
did. `harness/live/cloudlivetest.sh` proves the whole ladder against a stub router (99 checks), and
`tools/live_cloud.sh` proves it against the real router with the real key
(`bash tools/live_cloud.sh`, after building `dist/PlayPort-test.exe`): a question is put through
the panel with a model the router no longer has as the chosen one, and the answer must arrive
from a free standby, naming the retired model and the reason it was stepped over. The key is
read from the panel rather than pasted into the script, because a pasted copy goes stale the
moment somebody rotates it.

### Other machines: two panels using each other's hardware

Another PlayPort running this same software can answer for this one, and this one for it. A
machine is linked by the address of its **model port** (the one in *Three ports, three
promises*, not the panel) and a key minted on **its** Agents page. Nothing is sent anywhere
until somebody links a machine, and this one answers other machines only while *Serve this
machine's models to linked machines* (`peer_serve`) is on.

**Pairing: one code instead of an address and a key.** Getting a link right by hand means
three things at once, on the correct machine: the address of its model port, a key minted on
**its** panel, and which of the two machines the address belongs to. So the *Other machines*
card pairs instead. On the machine lending its hardware, **Pair a machine** shows a one-time
code (`7K3M-9QRT`: eight characters from an alphabet with no `0/O`, `1/I/L` in it, because a
code read off a screen should not have two possible readings) and a **ticket** that carries
this machine's own address. On the other machine, that ticket goes in one field: no address is
typed and no key is minted by hand.

The code is the credential for that one exchange and nothing else. The redeem route on the
model port asks for no key, because the code is the key: it works **once**, it expires
(`pair_ttl_mins`, 15 minutes by default; the page counts down), throwing it away makes it stop
working, ten wrong tries throw it away, and what comes back is an ordinary API key named after
the machine that paired. Everything after that is the link described above, so a paired
machine **does not bypass `peer_serve`**: the machine that showed the code keeps its right to
refuse, and pairing says so up front rather than letting the first hard question fail.

Both directions are set up from that one paste where they can be. The machine that pastes
offers a key of its own, and the machine that showed the code keeps a link back if the address
it was given answers. Where it cannot (two machines in different houses with only one of them
published) the reply says the link is **one way** instead of pretending, and the note on the
code says which addresses it can reach: a ticket carrying a LAN address for a port that only
answers on its own machine is a failure on the other machine that reads like a wrong code.

Pairing refuses in the words that say which kind of wrong it was, because those are different
problems: *that is not a pairing code* (not a ticket), *that code is not the one this machine
is showing* (a real code, the wrong one), *that code expired*, *that code has already been
used (by laptop)*, *this machine is not pairing right now* (thrown away).

**In the same house** the link is that LAN address and it works as it is. **Across the
internet** one of the two has to be reachable, so the Models page can **publish this machine's
model port** through the cloudflared the panel already manages: it prints an
`https://….trycloudflare.com` address to paste into the other machine's Models page. Three
rules make that switch safe to have:

- it is **off** unless somebody turns it on, and a machine that was published comes back
  published on the next start;
- it refuses while there is **no key** on this panel, because publishing a port before there is
  a key is advertising a model anyone could use, and it says which page mints one;
- it **says what it is doing**: the address, whether the tunnel is up yet, and that the port is
  now reachable are on the page and in the feed. A tunnel nobody can see is a tunnel nobody
  remembers to close.

Only the model port is published. The panel and the brain are separate doors and stay shut.

### Looking things up: for a model that has no internet

A model running on this machine cannot browse and cannot know anything released after it
was trained, which is exactly what a hosting panel gets asked: is this build newer than
what that plugin wants, what does this exception mean, which Java does 1.21.4 need. The
panel does have an internet, so with **Looking things up** on, the model is told it may
*ask*: it replies with `{"search":"..."}` instead of guessing, the panel runs the search,
and the answer is then written from results the model was actually given, cited `[1]`,
`[2]`. The model never browses. It asks, and the panel is what looks.

**Off by default, and it is the only part of PlayPort that sends anything anywhere on its
own initiative.** The switch lives on the Models page with what leaves stated in the same
sentence: the search words and, if the model clicks through, a page address. Nothing
about you, your servers or your files does. Every lookup is written to the panel's log and
its Activity feed, the page lists the last ones with the words that left, and the answer
the model gave keeps the sources under it so a person can check them.

Three engines, none needing a key or an account: **duckduckgo** (its HTML results page),
**wikipedia** (its search API, unusually reliable for technical facts), and **searx** -
your own instance, by URL, which is the homelab answer: nothing goes anywhere you do not
own. There is also a *Try it* box that runs one lookup and shows exactly what the model
would be handed, because "is this working" should be answerable by pressing something.

**A page is read as words, and only from places a model is allowed to reach.** Scripts,
styles, comments and markup are stripped; entities are decoded; the text is capped
(`ai_web_chars`, 6000 by default) so a wiki article cannot fill a context window. The URL
comes from a model, so the guard on it is explicit: http and https only, no credentials in
the address, and nothing that resolves to this machine, a private range, link-local or
multicast. A model reading a log file must not be talkable into fetching
`http://192.168.1.1/`. The engine you configured yourself is exempt from that last rule -
SearxNG on `127.0.0.1` is the normal setup, and it is a person's choice, not the model's.

**It is bounded, because the failure mode is not a wrong answer.** A small model that
decides to "check" every sentence turns a chat box into a scraper against somebody else's
website, so one answer may look up `ai_web_rounds` things (2), the panel as a whole may do
`ai_web_hourly` (20) in an hour, and an answer that runs out is told so in as many words:
it is asked to answer from what it has and to say what it could not check. A lookup that
fails is reported to the model rather than swallowed, so the answer says *I could not
check that* instead of inventing the fact.

From a command line, without a panel: `PlayPort.exe --web-search "paper 1.21.4 java"`,
`--web-fetch https://example.com/page`, and `--web-read page.html` (the reader, over a
saved file, touching no network - which is also how the extraction is tested).

**The fit badge is a calculation, not a vibe.** Every row says whether the model fits
the GPU whole, fits only partly (and how many layers would spill into system RAM), or
would run on the CPU, with the arithmetic printed underneath: how many layers, how much
weight, how much KV cache at the sensible context, and how much VRAM is actually free
right now. A badge that says *fits* is a claim the numbers next to it support.

**The engine card says which engine, and why not.** There is one honest complication on
Windows, and the panel puts it on the page rather than in a support thread: **Smart App
Control**, where it is on, refuses programs whose publisher it does not already trust,
and it does not accept a certificate PlayPort makes itself. So on such a machine the
panel will not fetch its own engine, and it says that in one sentence with the two
routes that do work: a vendor runtime (**Ollama** or **LM Studio**, signed installers,
which the panel drives through their own APIs) or a runtime on another machine, pointed
at by URL. The card also lists every place an engine could come from and whether it was
found, so "no engine" is a lookup rather than a mystery.

On a machine with Smart App Control on, that second route is the whole answer, and it
works out of the box: install **Ollama** (its installer is signed by Ollama Inc., which
is the kind of publisher the policy does trust, and it installs per-user so no prompt is
involved). The panel finds `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` on its own, says
so on the Models page, and from then on it drives that runtime through the runtime's own
API: **Fetch** asks Ollama to pull a model, **Load** asks it to hold one, **Let go** asks
it to drop it. Measured on the machine this was built against: a 7B model pulled through
the panel, loaded into 6.7 GB of an 8 GB card, and answered the panel's own questions.

Two things are worth knowing because they are the difference between "the vendor path
works" and "the vendor path is a stub that lies". A vendor runtime holds many models, so
it **requires the model to be named in the request**: llama.cpp infers the one model it
holds, Ollama answers a nameless request with `400 model is required`. Every internal
completion names it. And a *thinking* model (qwen3, deepseek-r1) can spend its whole
token budget reasoning and return an empty answer; for prose the panel uses that
reasoning rather than claiming nothing came back, while the one path that **acts** on a
parsed reply uses only the answer, so a plan the model merely considered is never
executed.

**Downloads are visible, and cancellable.** A fetch reports that it has started before
bytes arrive, then the percentage, the speed and which file it is on, and **Cancel**
stays clickable the whole time. A cancelled transfer is recorded as cancelled, not as a
failure: a red *failed* for something somebody deliberately did is a lie about what
happened, and this page does not tell it.

**The assistant is gated by the rules.** *Ask the panel* sends a question with the same
evidence the rule engine reads (server states, health items, this machine's load, and
one server's console if you pick it), so the answer can be checked rather than believed.
Rules stay authoritative for the failures they recognise; the model covers what no rule
matched. When it wants to *do* something it can only propose **start**, **stop** or
**restart** on a server that exists, and nothing happens until somebody presses
**Approve and run**. Yolo (in Settings) is the one switch that changes that, it says so
on the page, and the settings change is written into the event feed where it happened.

When no model can be loaded at all, every AI route **refuses with the reason** instead of
guessing or answering emptily, and the page shows that reason. The rules-based half of
the panel keeps working either way.

```
GET  /api/models/status        the guard, the hardware, the engine, the events
GET  /api/models/auto          what the panel would run, why, and the order it judged
POST /api/models/auto          mode=auto (pick for me) | mode=pin with an id | setup=true
GET  /api/models/catalog       every model with its fit verdict
GET  /api/models/engine        which engine was found, and why it is or is not usable
POST /api/models/engine/install  fetch the engine (managers; never on a SAC machine)
POST /api/models/load          put a model in memory (guard first)
POST /api/models/unload        let go of it
POST /api/models/download      fetch the weights (managers)
POST /api/models/download/cancel  stop a fetch without calling it a failure
POST /api/models/remove        delete the weights (managers)
POST /api/ai/ask               ask about the panel's own evidence
POST /api/ai/act               approve or decline a proposed action
POST /api/ai/overview          a plain-language read of the health items
```

The page redraws a section only when the data behind that section changed. That is not
an optimisation: re-rendering a panel replaces its buttons, so a click landing in the
gap goes to a node that is no longer in the document and does nothing, which reads as
"the button does not work". Progress is therefore written into the nodes that already
exist, and Cancel survives the whole download it belongs to.

### Agents: other AI tools, using the models this panel hosts

The **Agents** page in the sidebar is the whole story in one screen: the three ports
with what each is for, the keys, who is connected right now, the two-way channel with a
box to say something, and what each key is allowed to do.

Making a key shows the secret **once**, with a copy button and a ready-made `curl`.
Only a hash is kept, so a lost secret means a new key rather than a recovered one, and
the page says so where the value is, not in a manual. Each key's permissions are a row
of switches you can change later: its workspace, whether it may write outside that
workspace, run commands, delete files, and whether it may read and write the shared
brain. Writing outside, running and deleting are off until somebody ticks them, per key.

An agent is a program with a key. `POST /api/agents/keys` (panel) makes one and shows
the secret exactly once; only a hash is stored, and **Revoke** stops it everywhere at
once. What a key may do lives in one grant: a workspace, whether it may write outside
that workspace, run commands, delete files, and whether it may read and write the shared
brain. Writing outside the workspace, running commands and deleting are all **off**
unless a person turns them on for that key.

The agent surface on port `8100`:

```
POST /v1/chat/completions      OpenAI-compatible (streaming included)
GET  /v1/models                what is loaded, or the catalogue when nothing is
POST /api/agents/hello         check in: name, kind, version, capabilities
POST /api/agents/say           say something into the panel's feed
GET  /api/agents/inbox?wait=25 long poll for what the panel said back
POST /api/agents/tool          one tool call, for an agent running its own loop
POST /api/agents/work          a whole turn: the panel runs the loop and reports steps
GET  /api/agents/me            this key, its workspace, the guard's state
```

Auth is `Authorization: Bearer ppk_...`, `X-Api-Key: ppk_...` or `?key=ppk_...` for a
tool that cannot set headers. The last one exists because the alternative is a tool
that cannot connect at all, and it is worth knowing it puts the key in a URL.

### The brain: what this machine has learned

The brain is a folder of markdown under the data root (`brain/entries/*.md`), so you can
read it, grep it, copy it or edit it with no PlayPort running. It is served two ways: the
panel's `/api/brain/*` (a person, a session) and port `8101` (a program, a key):

```
GET  /search?q=&n=&type=       scored word search, each hit compressed against the query
GET  /context?q=&n=&budget=    the block to paste into a prompt, ready to use
GET  /context?q=&full=<id>     ...plus one entry in full, for what the block had to drop
GET  /get?id=                  one entry, whole
GET  /list?type=&n=            newest first
POST /add {type,title,body,tags,scope}
POST /delete {id}
GET  /stats                    how much is in there, by type
```

**The notes are compressed, not truncated.** A note is written for a person and read by a
model, and a prompt pays for every character twice. The old search returned the first 320
characters of the body, which for a note that opens with context is the least useful third
of it, and `Context` put five of those in the prompt with the newlines flattened.

So a note is compressed *against the question*: the blocks that answer are kept in their
original order and the rest is dropped and counted. The scorer is deliberately explainable -
words from the question, concrete things (a path, a flag, a setting, a command), the words a
decision is made of (never, only, instead, because), a small bonus for position and a
penalty for length - because the failure mode of a clever summariser is dropping the one
line that mattered and saying nothing. What survives says how much it left behind
(`7 further line(s) in this note were not shown`), so a reader can ask for the entry by id
instead of believing it read the whole thing.

The block has a ceiling (`Brain.ContextBudget`, 1400 characters) and states what it spent:
`4 note(s) shown, 900 of 41,000 characters, 3 note(s) not fetched`. The one exception is
stated too: the single best block is never dropped, because an empty block is
indistinguishable from a machine that knows nothing. A caller may set its own ceiling with
`budget=`, and each note in the answer carries `blocks` / `kept` / `dropped` so an agent can
see how much of a note made it through. Retrieval matches **words**, not substrings - the old
scorer matched the query word "use" inside "because" and fetched notes that had nothing to
do with anything, which is cost without answer.

With no panel at all:

```
PlayPort.exe --data <root> --brain-context "port 8080 already in use" --brain-budget 300
```

`harness/live/brainlivetest.sh` pins all of it over fixture notes: the line that answers survives and the
context around it does not, a heading becomes a label instead of leaking `##` into a prompt,
the ceiling is honoured, fewer blocks survive a smaller ceiling, a short note is untouched, an
empty store is not an error, and a question nothing answers reports the size of the store it
searched rather than pretending nothing is known.

An agent gets `brain_search`, `brain_get` and `brain_add` as tools as well, offered only
when its grant allows, and a key can be read-only on the brain while still using models.
The point is the one this panel's own reasoning is built on: look it up before
investigating, write it down after learning, so the next agent does not pay for the same
lesson twice.

### Help: the panel explaining itself

**Help** in the sidebar (or `F1` from anywhere) opens one box that answers questions about
this panel, using the model it already runs. The question people actually arrive with is
"how do I give a server more RAM", which is a question about the panel and not about the
world, and a model on its own answers it by inventing a menu. So the box is grounded in
this machine's real state before the model sees anything:

- **its pages**, each with what it is for, read from the same list the sidebar draws, so an
  answer names only pages that exist and can say "the panel does not do that"
- **its settings**, with the label each is shown under, read from the settings code itself
  so the list cannot go stale
- **the machine**: the health check, and the servers that exist
- **the brain**: what this machine has already learned, ranked for the question, so a fix
  worked out here once is an answer it gives away for free the next time

In practice that means `#/instances` never turns into "Settings > Game servers", a route the
model invents is **dropped** rather than followed, and a question this machine has already
answered is answered from its own notes. It can also say what it cannot do: ask it for
something the panel has no page for and it says so instead of inventing one.

**Remember this** writes the answer into the brain, and only a person can press it: a
brain feeds every later prompt, so a model's guess must not land there on the model's own
say-so. A kept answer is a normal brain entry, which means any agent using the brain API
reads what the panel learned from being asked.

When no model is available the box is still not a dead end. It says so, names the note that
looks relevant, and points at **Models** to see what this machine runs and why.

### Buddy's hands: what the assistant may touch on this machine

An assistant that can only talk is a consultant, and this one used to be exactly that: asked
"why did my server crash" it could say what to click and nothing more. It now has a middle
ground between talking and having a shell, and the whole of the design is one idea: **a
rulebook that says where the lines are** (see `src/Hands.cs`).

Every failure the panel already recognises by name knows which file is worth opening for it.
So each rulebook entry carries three things: the symptom it answers to (the same rule ids the
crash page uses), the files to open and the pattern that picks the lines out of them with a
sentence saying what they are, and, where one exists, the single safe edit that removes the
cause. Nothing is invented at the time, by the panel or by the model.

**Pick a server in the composer and the answer changes.** The panel reads that server's
console through the same feeder the crash page uses, adds the tail of the server's own
`logs/latest.log` (that memory is emptied by a restart while the crash is still on disk), and
opens the files the rulebook names for the symptoms it recognised. The model is handed those
lines with their file and line number, and told to quote only what it was given. It never
reads a whole log: a 40 MB `latest.log` costs a 256 KB tail read.

**A fix is written by the panel, not by the model.** A model can only name a fix the panel
already decided applies to that server as it is now, so a fix card is a file, a key, the value
it holds and the value it would get. The rules that make that safe are checked in code before
the card exists:

- a fix is offered only when it applies. A view distance already at 8 offers nothing, and a
  world folder is set aside only when it really is half-made and has no land in it
- every write goes through the tool layer, so what it replaced is journalled and **Undo this**
  puts it back from the same card
- the machine's own guard can refuse the write, and the file is read back afterwards and the
  value reported from what it now holds, never from the intention
- a fix that worked becomes a brain entry, so the next server that dies this way does not need
  a model at all

The rulebook ships with ten entries and four fixes (a half-made world, a taken port, a view
distance a machine cannot afford, and the EULA line). It is listed in the Buddy page's hands
card, with where each rule looks, so what the assistant is able to do is readable rather than
trusted.

**Three modes, and the mode follows who is doing the thinking.** `ai_buddy_hands` is `auto` by
default: when the free cloud or a linked machine is set to answer, the assistant gets the
rulebook *and* the agent tools boxed in that server's own folder (the same tools, journal and
guard as an external agent, with run and delete off unless a person switched them on); when
this machine's own small model answers, it gets the reads and the prewritten fixes. That is the
honest answer to "can a 7B model be given hands": it can be given a rulebook and a journal, and
it does not have to author the change. `off`, `rules` and `full` pin it either way.

### Adding servers to an existing network

You do not have to rebuild a network to grow it. On any network card, **Add
server** either creates a new backend or attaches an already-existing server to
the network, and either way the proxy is rewired for you: the shared secret,
player-info forwarding, the `[servers]` list and every backend's proxy config
are rewritten from one place. Detaching a server reverses it.

### Network settings in one place

Editing a Velocity network used to mean opening `velocity.toml` plus several
`paper-global.yml` files by hand. The network card's **Settings** dialog is now
the single source of truth: edit the network name, forwarding mode, MOTD,
max players, the hub server and the backend list once, and PlayPort rewrites
every affected file consistently. Saving while the network is running offers a
restart so the change takes effect.

### Updating PlayPort

PlayPort has no self-updater on purpose: updating means **running a newer
`PlayPort.exe`**. Drop the new build anywhere and launch it - the panel takes
care of the handover (see below), so you never have to hunt for a running copy
to close first. Your data lives in the data root, not in the exe, so replacing
the binary never touches servers, sites or databases.

When you launch a newer exe while an older panel is running on the same port,
the new copy notices it (via `/api/version`), asks it to shut down gracefully
over loopback, waits for the port and takes over. If it cannot get the port it
tells you which panel is holding it instead of exiting silently.

### Stopping the panel (no admin prompt)

PlayPort runs elevated (its manifest requires it), which used to mean only an
elevated shell could kill it - the cause of a lot of avoidable UAC prompts.
The panel is now its own kill switch: on start it writes a small control file
(`%LOCALAPPDATA%\PlayPort\panels\<port>.json` - pid, port, data root, per-run
secret) and serves `POST /api/panel/shutdown`, which accepts **loopback callers
only** with that secret. It then stops game servers and websites gracefully and
exits itself.

That gives three admin-free ways to stop a panel:

- `PlayPort.exe --stop` (or `--stop --port 8080` to target one)
- `bash stop-panels.sh [port]` - plain curl, used by `build.sh`
- launching the exe again on the same port: it notices the running panel, asks
  it to stop, waits for the port, and takes over. When there is no interactive
  console it defaults to taking over instead of silently doing nothing.

One shell-specific trap: from **Git Bash**, `./dist/PlayPort.exe --stop` fails
with `Permission denied` when that exact binary is the one still running (its
copy of MSYS will not start an image that is already loaded). `cmd.exe`,
PowerShell and `bash stop-panels.sh` are all unaffected, so use the script - or
any other `PlayPort*.exe` copy - when stopping a panel from bash.

So a rebuild never needs elevation: `build.sh` builds to `dist/*.new.exe`, asks
any running panel to stop, and if a panel is somehow still running it renames
the old binary aside (Windows allows renaming a running `.exe`) before moving
the new one into place.

Build flags: `PP_OUT=PlayPort-dev.exe` builds a side-by-side binary,
`PP_NOADMIN=1` embeds no admin manifest (a test copy that launches without a
UAC prompt), `PP_NOADMIN=1 PP_OUT=PlayPort-test.exe` is the usual dev combo.
`smoke.sh` builds that test copy itself, verifies it actually starts, and
rebuilds if the machine's code-integrity policy blocks the new hash - then runs
the whole suite.

**There are two artifacts, and only one of them is the product.** `dist/PlayPort.exe` is what a
person launches; `dist/PlayPort-test.exe` is what `coretest.sh`, `panellink.sh` and `smoke.sh` drive.
A fix that has only been compiled into the test copy leaves every real user on the old behaviour -
which is exactly how "the Java fix did not work" came back one report after the source was corrected,
with `src/Instances.cs` written at 16:44 and `dist/PlayPort.exe` still carrying the 16:35 build. So
a change to the panel is finished when **both** are rebuilt:

```bash
bash build-plugin.sh && bash build.sh                            # dist/PlayPort.exe   - ships
PP_NOADMIN=1 PP_OUT=PlayPort-test.exe bash build.sh              # dist/PlayPort-test.exe - tested
```

The same applies to the plugin jar: `build.sh` embeds whichever `pkg/playport-core-*.jar` is in the
tree, so a suite run against a jar newer than the exe around it is testing something nobody will
receive. Rebuild in that order.

The build signs the exe with a local `CN=PlayPort Dev` code-signing certificate
(created on first build) so the panel ships as a signed binary. `build.sh` also
imports that certificate into your **user** trusted-root store (via
`certutil -user -addstore Root`, no elevation, no prompt) - without it every
signature reports `UnknownError` because the chain ends at an untrusted root
rather than a real issuer. Remove it any time with
`certutil -user -delstore Root "PlayPort Dev"`.

### MySQL database hosting (MariaDB)

One managed MariaDB 11.4 server (portable zip - no Windows service, no admin
rights, installed into the data root from Settings → *MySQL*), many isolated
databases. Any site or game server can get its own database + user with one
click (*MySQL database* panel on the site/instance page): the user gets
`GRANT ALL` **only** on its own database, credentials are shown once and
stored, and admins can list/drop every issued database. The server binds
127.0.0.1 only (databases are for local sites/servers, never exposed
directly), runs sandboxed with a memory cap, and dies with the panel.

### Server readiness (is this machine actually reachable from the internet?)

On a real server the things that break hosting live outside the panel, so
**Settings → Server readiness** measures them instead of restating config. It
runs live probes and reports each result as pass, warn, fail or info, with a
plain-language fix whenever there is something to do:

- **Public address and reverse DNS.** It finds the address the internet sees,
  looks up its PTR, and checks the record is *forward-confirmed* (the PTR name
  resolves back to the same address) and matches the mail host every domain's MX
  record names. A missing or mismatching PTR is the single biggest reason direct
  mail is junked.
- **The address published in the DNS records.** This catches the deployment trap:
  behind a router the generated MX, A and SPF records name the machine's private
  address, which nobody on the internet can reach, while every field in the UI
  still looks correct.
- **Ports, measured not assumed.** It opens a real TCP connection to a mail
  server on 25 and to a relay port on 587, so "outbound 25 is blocked by the ISP"
  and "relay will work" are facts rather than guesses. It also checks whether the
  delivery mode currently selected can achieve anything, and diagnoses the
  combination properly (for example: direct mode plus a blocked port 25 is a
  failure, not a warning).
- **Administrator rights**, because a non-loopback bind and adding firewall rules
  both need elevation.
- **Windows Firewall**, for each listener that faces the network. A router
  port-forward is only half the path: without a matching inbound rule Windows
  drops the packets silently, which looks exactly like "the service is down".
  Every network-facing listener asks for its rule (mail reception, game servers,
  websites, and a non-loopback panel); the loopback-only ones - mail submission,
  MariaDB and PHP FastCGI - deliberately do not, so they stay private.
- **Bind addresses and certificates**: whether websites are bound to loopback
  (the default, and the reason a site works on the machine and nowhere else),
  and which domain-backed sites still have HTTPS switched off.
- **Per-domain mail**, from the same live DNS check the Email page uses.

The report is measured once per session and cached; the **Run checks** button
refreshes it. Nothing here is a substitute for a real test from outside, but it
names the specific thing to fix rather than saying "it does not work".

### Email hosting (a website's PHP can send mail immediately)

PlayPort runs its own SMTP service, so a PHP site can call `mail()` the moment
it is created with nothing to configure and nothing to sign up for. Each site's
`php.ini` is generated with `SMTP = 127.0.0.1`, the submission port, and a
sender derived from that site - if a mailbox is attached to the site, its
address is used, otherwise one is built from the site's domain and name.

Mail is hosted **domain first**. PlayPort does not register domains: you hook up
one you already own and the panel hosts the mail for it, locally and out to the
internet once the DNS records below are published. A mailbox only exists under a
hooked domain, because a mailbox on any other domain could never send anywhere.
Hooking up a domain on a domain it already knows is the primary action;
mailboxes live underneath it.

The **Email** page covers the whole thing:

- **Sites send through** `127.0.0.1:1025` (submission, loopback only - it takes
  mail from any local process without a password, so it is never exposed).
- **Domains you host mail for** is the top of the page. Each hooked domain gets
  its own DKIM key pair, and sending can be turned on or off per domain (off
  means no signature for that domain's mail; receiving can be turned off too).
- **A live DNS check** runs when you hook a domain up and on demand afterwards.
  It queries the public resolver for the MX, SPF, DKIM and DMARC records and
  reports a plain verdict - `live`, `partly live` or `not live yet` - plus
  exactly what is still missing or different. It reports honestly rather than
  optimistically: a published DKIM key that does not match this panel's is
  called out as a mismatch, not as present.
- **Per-domain DKIM signing.** Every message sent as a hooked domain is signed
  with that domain's key (`rsa-sha256`, relaxed/relaxed), which is what stops
  receivers treating it as forged. The public half is shown as the
  `<selector>._domainkey` TXT record to publish.
- **Three delivery modes**, because they fail in very different ways.
  *capture* keeps every message on this machine and delivers nothing, which is
  the safe default and proves a site's email works. *relay* hands messages to
  your provider or a transactional service over STARTTLS with a login, and is
  the only mode that reliably reaches strangers' inboxes from a home
  connection because it borrows the provider's IP reputation. *direct* looks up
  each recipient's MX record and delivers on port 25 - honest warning: most
  ISPs block outbound 25, and without a static IP with matching reverse DNS
  plus SPF/DKIM the big providers will junk it.
- **Mailboxes** live under a hooked domain, optionally attached to a website,
  with one catch-all per domain. A message for an address that has no mailbox
  is kept in **Unmatched** rather than bounced away.
- **Incoming mail** is opt-in (needs administrator rights, a firewall rule for
  port 25, and an ISP that does not block it) and the page prints the exact MX,
  A, SPF, DKIM and DMARC records to publish, with a one-line explanation of
  each and why it matters.
- **Stored messages** are readable per folder with headers and a plain-text
  body, and there is a **Send test message** button that walks the exact same
  path a site's `mail()` takes, so the chain can be proven end to end.

Nothing leaves the machine in capture mode. The relay password is stored in the
panel data folder and is never sent back to the browser, and a per-domain DKIM
private key stays there too. Mailboxes and stored mail are permission-checked: a
plain user may see the service status but not change it, hook up a domain, or
read internal folders.

### Bug audit (September 2026)

A systematic adversarial pass over every endpoint, looking for the things a
hosting panel gets wrong: authorization between owners, path handling, malformed
input, injection, and lifecycle edge cases. What was checked and held up, and
what was found and fixed:

**Held up (no change needed).** Resource authorization is enforced everywhere:
a plain `user` cannot read, start, stop, delete, browse files of, or read the
console of another account's server or site, and cannot reach the admin-only
areas. Every traversal attempt through the file manager, the static file server,
the backup restore path and the zip importer was refused (`..`, backslashes,
percent-encoding, double-encoding, drive-absolute and UNC names). Malformed JSON
returns a clean error instead of a crash. Mail rejects CRLF in addresses, so no
header can be injected. 60 concurrent requests are served cleanly.

**Fixed.**

- **The live console socket never worked.** The HTTP response was closed as soon
  as the request handler returned, which tore down the upgraded WebSocket the
  instant it opened: browsers saw it open and immediately close (code 1006) with
  no output. Any server's console now streams.
- **The console socket had no ownership check.** Any logged-in user could attach
  to any other account's server console and watch everything it printed. It now
  requires that you own the server (staff may watch any).
- **A website could be created under someone else's account.** A plain user could
  pass `owner` and hand their site to another user; server creation already
  ignored that field, sites did not. Both now force the creator for non-staff,
  and an owner that is not a real account is rejected instead of creating a
  resource nobody but staff can see.
- **Zip slip when importing a website.** File entries were checked against the
  site root but folder entries were not, so a crafted zip could create
  directories anywhere the panel can write (as administrator, that means
  anywhere). Every entry is now contained, and absolute or drive-rooted names
  are refused.
- **Malformed request bodies returned 500.** `Body()` returned null for invalid
  JSON and 32 handlers used it without a check, so a stray `{` produced
  `Object reference not set to an instance of an object.` A malformed or
  non-object body is now a clear 400 for every endpoint.
- **Only-whitespace and unbounded names were accepted.** A site or server named
  `"   "` was stored and rendered as a nameless row; a 5000-character name is now
  capped at 100.
- **Stopping any non-Minecraft server appeared to hang for 40 seconds.** Only the
  Minecraft types understand a console `stop`, so for Steam games, the Velocity
  proxy and manual processes the panel waited the full grace period for a signal
  it never sent before killing. It now waits long only when a signal was actually
  sent: Minecraft still gets its full budget, everything else stops in about two
  seconds.

Regression cover for all of it lives in `smoke.sh` under *hostile input*.

### Honest limitation: hosted PHP is not filesystem-isolated

A PHP site runs with the same privileges as the panel, and PHP's `open_basedir`
is not set, so code in any hosted site can read any file the panel can read,
including the panel's own data folder (`auth.json` with password hashes, and the
mail relay password in `mail.json`). This is the one place where "everything
exposed" is not the same as the OS-level containment the game servers and
MariaDB get from their Job Objects. Treat a website you host for someone else as
code you are choosing to trust, and host untrusted clients on a separate panel.
The contained fix, if you want it, is a per-site `open_basedir` in the generated
php.ini pointing at the site root plus a temp folder, with `upload_tmp_dir` and
`session.save_path` moved inside the site so PHP can still work.

### Sandboxing & multi-client isolation

- Every game server, the MariaDB server, **and every PHP worker** run inside a
  Windows Job Object: a hard memory cap (2× configured RAM per server) plus
  kill-on-close - if PlayPort exits by any means, the OS reaps every child
  instantly. No orphans, no leaked RAM, no zombies holding ports.
- Every raw listener socket is created non-inheritable. Sockets are inheritable
  by default and .NET starts child processes with handle inheritance on, so a
  child could otherwise inherit a listening socket and keep the port bound
  after PlayPort died - which presents as "the panel closed itself" or "port
  already in use" on the next launch.
- Accounts with the **user** role see and control only their own servers and
  sites (admins see everything). Newly created resources are stamped with
  their creator; database drops are permission-checked per owner.

### Per-user permissions (who can touch what)

Three roles, and a per-resource grant layered on top of them:

- **admin** does everything, including users and panel settings; **moderator**
  manages every server and site (any owner), their files, backups and databases,
  but cannot manage users or panel settings; **user** sees and controls only what
  they create.
- Ownership stays the strong tie: an owner has every capability on their own
  resource, and an admin can hand somebody else's resource to a second account
  **without moving ownership**. That is a *grant*, and it is scoped to one named
  instance or website.
- Four capabilities, deliberately coarse: **view** (see it, its logs and its
  console), **start/stop** (control it), **edit** (settings, backups, schedules,
  certificates), **files** (file manager, uploads, plugin installs). They imply
  each other downward - files implies start/stop implies view - and nothing
  implies files, because file access is the one that can become code execution.
- Enforcement is one decision point per route, derived from the action, so a newly
  added sub-route is covered by construction and an unknown action falls back to
  the safe answer. The same files route checks file permission whether it is
  reached from the Files tab, a zip import or a plugin install.
- The interface is told what each caller may do (`perms` on every resource) and
  hides the tabs and buttons that would only come back 403, including the
  "shared with you" tag on resources the caller does not own. That is convenience,
  never the boundary: the server re-checks every request.
- Grants only accept a resource that exists, and a row with nothing ticked is
  dropped rather than stored, so the list can never claim access that is not real.
  Deleting the resource stops the grant resolving instead of leaving a dead entry.

### Cloudflare tunnels (public access without opening ports)

Everything in PlayPort listens on loopback by default - that's safe, and it's
what makes tunneling clean: `cloudflared` on the same machine connects to
those local ports and Cloudflare's edge delivers them publicly.

- **Install**: Settings → *Cloudflare tunnels* → *Install cloudflared*
  (downloads the official Windows binary into the data root, ~60 MB).
- **Quick tunnel (per site)**: open a site → *Public access* panel → *Start
  quick tunnel*. Within seconds the panel shows a live
  `https://<random>.trycloudflare.com` URL - temporary, no account, no DNS.
  Anyone with the URL can reach the site until you stop it or close the panel.
  Websites, the panel, and even a future game port all work the same way.
- **Named tunnel (stable hostnames)**: Settings → *Generate named-tunnel
  config* writes `config.yml` into the data root routing every enabled site
  that has a domain set to its local port. One-time terminal setup
  (`cloudflared tunnel login` → `tunnel create playport` → `route dns`), then
  `cloudflared tunnel --config config.yml run playport`.
- Tunnels are stopped automatically when the exe exits, so nothing is left
  publicly reachable after you close the panel.

### playit.gg (the agent, installed and run by the panel)

cloudflared fronts HTTP; playit.gg fronts **raw TCP and UDP**, which is what a
game port needs. The panel downloads the agent for you (~5 MB, their signed
Windows build) from Settings → *Components*, or from the Install button on the
Dashboard's health board, and starts and stops it with one button each.

One thing is still a human's job: the **secret key** the agent connects with.
Generate it with playit's setup wizard (the panel links straight to it) and
paste it into the panel once - it is stored beside the agent in the data root
and never sent back to the browser. Then create the tunnel on
dashboard.playit.gg and point it at the address the panel shows you (`127.0.0.1:`
plus the port, printed on a site's Public access card and on a game server's
Overview, e.g. 25565). No open router ports needed. The same works for the panel
itself if you ever want it reachable remotely (put something in front of it - its
auth is not a firewall).

A machine that already has playit set up by hand keeps working: the panel runs
the agent with no arguments then, so its own stored setup is what it uses. And it
will not start an agent it knows cannot serve anything - with no key it says so
and points at the wizard instead of leaving a process that waits forever.

### Local addresses & self-signed HTTPS

Site listings and the site detail banner show both the loopback URL and the
machine's LAN IPv4 (auto-detected), so you can click a working link from
another device on the same network. HTTPS sites with a **self-signed** cert
show `https://<lan-ip>:<tls-port>/` with an explicit note that the browser
warning is expected - no certificate is installed anywhere, it's purely for
local testing.

### Minecraft Java runtime (installed for you, from Mojang's own data)

Minecraft needs Java, and the requirement moves: it went 8 > 17 > 21, and 26.x
needs 25. PlayPort does not carry a table of that, because a table is wrong the
day after a release.

- **The requirement is read from Mojang.** Every version's metadata document
  publishes `javaVersion.majorVersion` (`26.2` says 25, `1.21.4` says 21,
  `1.12.2` says 8), and the panel reads it and caches it in the data root. So a
  Minecraft version released after this build still gets the right runtime, and
  the cache means the picker, the create flow and the start path all work with no
  internet at all. A rule derived from the version number answers only when that
  metadata is unreachable, and the interface says which of the two it used
  rather than presenting a guess as fact.
- **The Java version is chosen with the runtime, not after it.** Selecting a
  Minecraft version in the picker shows what it needs (`Java 25 for Minecraft
  26.2 - will be installed automatically, from Mojang's version metadata`).
  Creating the server downloads that runtime while the server jar downloads, and
  the create response reports it. There is no Settings detour for the normal
  case, and the picker defaults to the newest *release* rather than whatever
  snapshot happens to be first in Mojang's list.
- **Start installs what is missing and then starts.** Asking to start a server
  whose runtime is absent kicks off the download and starts the server by itself
  the moment it lands, so pressing Start once is enough even on a machine with no
  Java at all (the console narrates it: `This server needs Java 8 (from Mojang's
  version metadata for Minecraft 1.12.2). Downloading it automatically...`).
- **Upgrades happen on their own.** The panel re-reads the manifest hourly and
  installs a newer runtime when a managed server now needs one, which is how a
  panel that shipped for Java 21 keeps running servers through the move to 25
  without anyone editing anything.
- **Runtimes:** Temurin JRE 8, 17, 21 and 25 (~45 MB each), installed under the
  data root. The number Mojang gives is rounded *up* to the smallest runtime the
  panel installs - Minecraft 1.17 asks for 16, and rounding that down would pick
  Java 8, which cannot run it.

Settings still shows which Java a server requires, where that number came from,
the resolved `java.exe`, one-click **Install Java** buttons per runtime, a
**Re-check from Mojang** button, and the per-server pin for a modded or legacy
distribution that needs a specific build. A custom `java.exe` path and detected
system installs still win where you set them. Resolution order: instance
override → chosen/pinned runtime → panel default → common install paths
(`Program Files\Java`, Adoptium, Microsoft, Zulu, Corretto, JAVA_HOME) → PATH.
A missing Java now installs itself rather than failing with a cryptic Win32
error.

### Backups you choose the contents of

A zip of a whole server folder is mostly regenerable files, and a nightly
archive of caches and libraries is the reason people turn backups off. The
**Backups** tab of a server now opens with a plan: six categories - player
data, server settings, world, plugins & mods, logs & crash reports, and
everything - each showing **what it would actually take**, measured from the
disk, with three one-click starting points (Smallest, Standard, Everything).

```
Player data      99.6 KB  . 2 files     inventories, XP, stats, advancements
Server settings  59.8 KB  . 2 files     server.properties, ops/whitelist, configs
World             4.1 MB  . 3 files     the map, every dimension
Plugins and mods  1.5 MB  . 2 files     the jars and their folders
Logs and crash reports                   console history, crash reports
Everything       14.9 MB  . 9 files     the whole folder
```

Extra paths can be added by hand (`myworld/`, `notes.txt`), and the selection
is remembered on the server, so a scheduled backup and the button agree.
A schedule can override it ("players and settings only" runs nightly while a
weekly one takes everything), and a path that no longer exists is named in the
plan and in the server log rather than silently missing from every archive.

Each archive carries a small manifest of what it holds, which the list shows
back to you in plain words ("player data, server settings"), and restoring it
only writes the files it contains - anything outside the archive is left alone.
Retention is counted **per kind** of backup, so an hourly player snapshot can
no longer evict the weekly full one.

The numbers are measured, not guessed: the plan walks the folder's metadata
once (nothing is read), and the archive walk uses the same rules, so the size
shown is the size it takes.

### Backups that also leave the machine

A backup sitting on the same disk as the server it protects is the failure mode
that actually catches people, so the Backups tab can copy each archive to a
**destination** as well:

| Destination | What it is for |
| --- | --- |
| **Folder or share** | A second disk, a USB drive, or a UNC path such as `\\nas\backups`. |
| **S3-compatible bucket** | Cloudflare R2, Backblaze B2, Wasabi, MinIO, Supabase, Filebase or AWS. Signed with SigV4 by the panel itself, no SDK. |
| **Public file host** | A no-account upload (gofile) for handing one archive to somebody. The link is public, it expires on the host's terms, and it cannot be listed, pruned or read back. |

Destinations are admin-only, because they hold credentials and decide where a
customer's world ends up. Which servers copy to which destination is per-server
and lives with that server's backup plan, so the same checkbox the operator
already uses for contents also decides where it goes. "Test" proves a
destination before it is relied on, and the row keeps the last success and last
failure so a destination that has been failing is visible rather than assumed.

Retention applies to copies the same as to local archives: the same per-kind
count prunes the destination too, so a nightly small archive cannot evict the
weekly full one anywhere.

**Downloading.** Every row has Download, and it does not matter whether the
archive is on this machine: if it is only on a destination the panel fetches it
first and then serves it, so a world can be recovered from a bucket through a
browser. Restoring is still there, but downloading is the safe option - you get
the file and nothing touches the server folder. The **Backups on other
machines** table lists what a destination actually holds, with per-file
Download and Delete, and marks the ones that are also here.

### Closing the exe stops your servers

Quitting PlayPort (typing `exit`, Ctrl+C, or closing the console window)
gracefully stops every running game server - Minecraft gets the `stop`
command so the world saves, everything else is given a brief grace period and
then force-stopped. A native console-close handler covers the window ✕ too;
your worlds are never left running orphaned.

### Activity & one-click retries

Every long-running operation - installs, updates, Java downloads, MariaDB
setup, website builds, template catalog refreshes, and whole-network
start/stop - is registered in a central job registry and shown on the
**Activity** page (sidebar). The nav badge counts in-flight + failed work.
Failed jobs that the panel knows how to redo show a **Retry** button
(install/update retry uses the instance's *current* version, so fixing the
version in Settings and hitting Retry just works).

### One screen of truth: system health

The **Dashboard** opens with a **System health** panel that checks every part the
panel runs in one pass and gives each a verdict: the panel itself, the data
volume (with free space and your own warning line), MariaDB, mail, PHP,
SteamCMD, the Java runtimes that are installed, tunnels (cloudflared quick
tunnels and a running playit.gg agent), certificates, whether every server has a
recent backup, servers that are crashed or looping, and background work that
finished with an error. Anything not working carries the next step in words, not
just a red dot: *"MariaDB is installed but not running - start it from the
Databases page"*. The four verdicts are `ok`, `warn` (fine now, will bite later,
such as a certificate inside its renewal window or a backup older than a week),
`fail` (broken now) and `off` (deliberately not set up, so nothing is wrong).
Old, unset features are counted separately so a fresh install does not look like
a broken one. It is staff-only, since it reports on the machine rather than on
one tenant's corner of it.

### Search everything (Ctrl+K)

The sidebar has a search box (or press **Ctrl+K** anywhere). One query covers
game servers, websites, databases, mail domains and mailboxes, users, backup
archives and **server console history**, grouped by kind and one click away from
the destination page. Two rules make it trustworthy rather than clever: it never
returns something you could not open anyway (every hit goes through the same
permission check the real page uses, so it cannot leak another tenant's server
names), and it never reads files from disk. Console hits come from the lines
already held in memory, which is why a search answers instantly instead of
walking every world folder.

### Copy a server in one click

Any server you can edit has a **Copy** button. It duplicates the configuration
and the whole server folder (world, settings, plugins and mods), then moves the
copy onto its own port so both can run at once. Archives and old console logs are
left behind on purpose, a stale `session.lock` is skipped, the copy starts
stopped and with no crash history carried over, and its `server.properties`,
`velocity.toml` or `start.bat` is retargeted to the new port. It runs as an
Activity job with progress, because a large world takes a while. The port move
goes through a dedicated path in the game-settings writer: `server-port` is a
*managed* key there (the panel derives it from the instance port), so the normal
settings route deliberately refuses to touch it, which is exactly why the first
version of this feature produced a copy that died with "address already in use".

### Saved console commands

A server's console has a **save typed command** button: name a command once
(`save-all`, `whitelist add Steve`) and it becomes a one-click chip on the
console, stored on that server. Empty commands and pasted multi-line blobs are
refused by name rather than saved as a broken button, sending to a stopped
server is refused (there is nothing to write to), and the list is capped at 30.

### Storage accounting and alerts

**Settings** has a **Storage** panel and an **Alerts** panel. Storage totals the
data root - game servers, websites, backups, Java runtimes, the database,
SteamCMD - with the volume's free space, a breakdown of the largest folders and
a thirty-second cache so opening the screen does not walk tens of thousands of
files. Alerts push a webhook (Discord/Slack-compatible JSON) and/or email when a
server crashes, auto-restart gives up, an off-machine backup copy fails, or the
data volume crosses your threshold. The same event is held back for a
configurable window (10 minutes by default) because a crash loop would otherwise
send the same line every few seconds; **0 means tell me every time**. Messages
are captured on the Email page when mail is in capture mode, so the wiring can be
proven without anything leaving the machine.

### Live network health & player counts

Each network card on the Game Servers page shows live state, refreshed every
5 seconds while you are looking at it:

- **`N/M backends healthy`** - how many backend servers are actually serving,
  not just "started". A backend that is running but does not answer a status
  ping is shown with an amber dot rather than a misleading green one.
- **Per-backend chips** - name, `players/max`, type and port, and how long the
  status ping took (`local` when under a millisecond on the same machine).
- **Total players** for the network, read from the proxy, which is authoritative
  - a player sitting in limbo or switching servers counts there but not in any
  single backend.

The counts come from the Minecraft server-list protocol (the same handshake the
game client uses), not from console scraping, so Vanilla, Paper and Velocity are
all covered with no plugins. Limbo servers have no player list and do not answer
status pings, so they are reported as healthy-but-countless rather than "down".
Stopped servers are never pinged (that would burn a timeout per poll), and
results are cached for a few seconds so aggressive dashboard polling stays cheap.

### Phone and small-screen layout

The panel is usable from a phone on the same LAN (`http://<lan-ip>:<port>/`):
single-column cards, a horizontally scrolling pill nav, sub-menu tabs that
stick under the app bar, stacked form rows, and modals that become full-width
sheets. Wide tables scroll inside their own container instead of forcing the
whole page sideways, so there is never a page-level horizontal scrollbar.

Inside the server picker the category rail becomes a horizontally scrolling chip
row on a phone, so the template tiles get the full width (two columns instead of
the one column a 148px rail left behind on a 450px sheet).

### Minecraft networks: one-button start/stop

Network cards on the Game Servers page have a single **Start network** /
**Stop network** button. Start brings up backends first (limbo → hub → games,
waiting for each to become live), then the proxy; stop shuts the proxy down
first and then the backends in reverse. Progress streams into Activity, and a
failed start (e.g. missing Java) is retryable with one click after the
underlying problem is fixed.

- Instance types are code-switchable today (vanilla / paper / modpack / steam / manual);
  the installer + runtime already treat every type through the same engine
  (download → jar/start command → console), so more games are data-entry:
  point the installer at a template like CubeCoders' or Pterodactyl's egg DB
  (a JSON "how to install + how to run" document) and reuse the whole engine.
  The Steam catalog itself is just a list of App IDs - add entries in `Steam.cs`.
- SteamCMD self-updates itself on first run (~43 MB client update). Valve now
  requires an owning account for most dedi content, so anonymous installs only
  work for genuinely free servers.
- FTP/WebDAV file access and an ADS-style multi-machine setup are the natural
  next modules. Let's Encrypt certificates are renewed automatically: sites
  with HTTPS + a LE certificate and the "Renew automatically" toggle get
  re-issued inside the configured renewal window (default: 30 days before
  expiry), checked by a scheduler and rate-limited to one attempt per six
  hours. Self-signed and uploaded PFX certificates are never replaced.
  HTTP-01 still requires the site's HTTP port to be 80 (or a reverse proxy
  forwarding `/.well-known/acme-challenge/`).

## Licensing and commercial use

PlayPort itself is original work: the HTTP/HTTPS server, the WebSocket console,
the SMTP service and DKIM signer, the DNS resolver, the ACME client, the PHP
FastCGI pool, the MariaDB manager and the job-object sandboxing are all written
for this project. There is no vendored third-party source and the executable
embeds no third-party binaries or fonts.

What it *does* do is fetch other people's software at run time, on the machine
that asked for it, so nothing third-party is redistributed inside the product:

| Fetched at run time | Where from | Licence |
| --- | --- | --- |
| Paper, Velocity, Vanilla jars, modpacks, plugins | PaperMC, Mojang, Modrinth | MIT / Mojang terms / per-plugin |
| NanoLimbo (limbo server) | `Nan1t/NanoLimbo` releases | GPL-3.0 |
| Temurin JRE (Java 21/25) | Adoptium | GPLv2 + classpath exception |
| MariaDB (portable zip) | MariaDB upstream | GPLv2 |
| PHP (FastCGI) | windows.php.net | PHP licence (BSD-style) |
| SteamCMD | Valve | Valve's SteamCMD terms (proprietary) |
| `cloudflared` | Cloudflare releases | Apache-2.0 |
| Game templates | `CubeCoders/AMPTemplates` | MIT |
| Plugin/modpack catalogs | Modrinth API v2 | public API, User-Agent + rate limits |
| Game names from Steam | `store.steampowered.com` appdetails | undocumented storefront endpoint |

Why that is sellable: downloading a GPL or proprietary program to a customer's
own machine and running it as a **separate process** is aggregation, not
linking, so it does not relicense PlayPort. The obligations only attach to
software *you distribute*. The practical rules that follow from it:

- Never bundle these into an installer without revisiting this: if you ship
  NanoLimbo or MariaDB inside a package you owe their source (or a written
offer), and SteamCMD may only be redistributed under Valve's terms.
- Keep the fetched components named and unmodified. Do not rebrand a
downloaded jar, do not ship a patched build, and do not imply the upstream
project endorses the product.
- The Steam storefront call is a convenience (a game's display name). It has no
licence grant and no stability promise, so the catalog carries its own names
and the call is only a refinement - treat a failure as normal, not an error.
- The Minecraft EULA governs *running* a Minecraft server, exactly as it does
for AMP. Nothing here implies Mojang or Valve approval, and that should be
said plainly in any store page.
- Marketing copy is the remaining exposure: "works like AMP" is a comparison,
while shipping AMP's name, artwork or template files as your own is not.

## The brand mark

The mark is a game controller whose middle is a server rack: one closed shell,
lime on the left of the centre line and violet on the right, with the rack's
three bays, the D-pad and the four buttons drawn on top.

It lives in `brandgen.js` as a single geometry source that is written in two
forms, so the copies can never drift apart:

| file | what it is | used by |
| --- | --- | --- |
| `web/brand.svg` | the mark on a dark tile | the favicon |
| `<symbol id="plogo">` in `web/index.html` | the same drawing, inlined | boot screen, sign-in card, sidebar |

The inlined copy takes its colours from `var(--accent)` and `var(--violet)`, so
it follows the theme; it carries literal fallbacks because a page that does not
load `app.css` (any standalone page) would otherwise draw it in nothing at all.

```bash
node brandgen.js            # rewrite web/brand.svg and web/index.html
node brandgen.js --check    # also write web/_mark.html to look at it
```

Edit the geometry there, never in `web/brand.svg` or inside `index.html`.

Sizes in `app.css` are ordinary CSS sizes (the mark is a vector drawing, not a
pixel grid), currently `56x28` in the sidebar and `224x112` on the sign-in card.
Those two happen to be exact multiples of the 2:1 artwork, which keeps it sharp.

## Tests

`bash smoke.sh` launches the exe and runs an end-to-end pass over auth, the
REST API, the Steam module (catalog + a real SteamCMD bootstrap + app_update
failure path), the Modrinth modpack catalog, a manual server lifecycle with
live console capture, file manager, schedules, static site hosting, the
MariaDB API surface, owner fields, the mail/DKIM path, the readiness preflight,
the per-resource permission model (including the negative cases), the
hostile-input regressions, the Java requirement path (Mojang-driven answers,
the 1.17 rounding case, the Java 8 `1.8.0` numbering, and the cache), andthe selective backup path: the measured plan, the persisted selection, a path
traversal being dropped from the extra paths, a partial archive containing
exactly the chosen categories and nothing else, its manifest, the listing's
plain-word contents, and a restore that leaves files the archive does not
contain untouched. It also covers the operator quality-of-life pass: the game
settings schema (groups, a duplicated key resolving the way Java resolves it, a
bad value refused by name with the rest of the batch applied, the escaping the
server itself uses), the player API (whitelist state, address bans, an
impossible name refused, kicking refused while stopped, whitelist on writing
the property), a partial settings update keeping the start executable,the crash-loop limit and the restart warning being part of the schedule, the
system-health report (a verdict, every subsystem listed, a next step on each
line, and a login required), panel-wide search (a hit by server name, a route on
every result, the short-query and no-hit cases, and the permission filter being
part of the implementation), the copy-a-server plumbing, the serving of the new
asset, and the alert window round-tripping and clamping.
`PASS=471 FAIL=0` is green (2026-09-28, run against `dist/PlayPort.exe` - the shipping
build - through `PP_SMOKE_BIN`; see `RELEASE.md`. The `PASS=456` this line carried an
hour earlier was the same suite against the same kind of build, and it had already grown
15 checks: a count in prose goes stale the moment somebody adds a check, which is why
`RELEASE.md` says to re-quote the number in the same breath as the run).

`bash coretest.sh` is the suite for the bundled core plugin actually reaching a
server, described under *the plugin installer* above. It exists because every other
plugin test could pass while the jar never left the exe. `PASS=367 FAIL=0`
(2026-09-28, against `dist/PlayPort.exe` itself through `PP_CORE_EXE` as well as
the test build; the `PASS=76` this line used to carry was from before the suite grew
its network, template and teardown sections).

Each plugin suite is self-contained on purpose, and two were not: `run.sh` now clears
`panel-settings.txt` and `pack.txt` between runs, because a model definition, a familiar
or a leftover profile name from one suite silently changed what the next one measured -
a "survival" left in `pack.txt` turned the factions module off for the factions suite,
which then reported a working module as missing its commands. A runner that needs those
files writes them and sets `PP_KEEP_PANEL_SETTINGS=1`.

`bash pkg/livetest/profilerun.sh` is the plugin-side half of the same question: it
boots one Paper server per scenario (no config at all, a panel marker, a single
profile file, an operator override, and switching at runtime) and reads the choice
back through rcon, so the precedence order is verified rather than documented.

Three suites verify the quality-of-life surfaces against a live panel, because
none of them can be proven by grepping sources:

- `bash opslivetest.sh` - the per-server Overview feed, saved console commands
  (including the empty, multi-line and stopped-server refusals), storage
  accounting and the alert settings surviving a panel restart.
  `PASS=30 FAIL=0`.
- `bash alertlivetest.sh` - the alert pipeline end to end. It runs a tiny local
  webhook receiver, then makes a real server crash (a manual server whose start
executable is `cmd.exe /c exit 7`) and counts deliveries: one crash sends one
  alert naming the server, a second crash inside the window is held back, and
  with the window set to 0 every crash is reported. `PASS=10 FAIL=0`.
- `bash morelivetest.sh` - copying a server and searching. A server with a real
  world, plugin, stale lock, old log and old archive is copied; the test asserts
  the world is byte-identical, the lock and logs and archives are left behind,
  `server-port` and `query.port` moved with the copy while the rest of the file
  survived, and the original kept its own port. Then search finds the server,
  does not index file contents, reads back console history, refuses a
  one-character query, and hides another tenant's server from a plain user.
  `PASS=31 FAIL=0`.

- `bash harness/live/brainlivetest.sh` - the brain's compression, over fixture notes in a temporary data
  root, through a new `--brain-context QUERY` mode. A long note whose opening paragraph is
  context and whose answer is one line in the middle: the line survives, the history
  paragraph and the long tail do not, a heading arrives as a label rather than `##`, and the
  whole block is smaller than the note it came from. Also pinned: the ceiling is a ceiling, a
  smaller ceiling keeps fewer blocks while never dropping the best one, an inflection still
  matches (`compress` finds `compression`) while `use` no longer finds `because`, a short note
  is untouched, an empty store is not an error, and a question nothing answers says how much
  was searched. `PASS=24 FAIL=0`.
- `bash harness/live/feedlivetest.sh` - the bot that reads the log before the model does, over fixture
  logs, through a new `--feed FILE` mode. The fixture is the window that made it exist (a
  banner, a plugin list, a `sun.misc.Unsafe` warning, a lag monitor, the panel's own echoed
  commentary, and a crash): the exception survives, the call-site frame survives, and the
  banner, the plugin list, the misleading warning and the panel's own words do not. Also
  pinned: a quiet boot hands over nothing and says so in the text the model receives, a
  two-deep cause chain keeps both exceptions' frames while folding the `java.base` ones and
  says how many were folded, and an empty file is not an error. `PASS=27 FAIL=0`.

Three suites cover the panel's own AI, all offline apart from the model they drive:

- `bash harness/live/ruleslivetest.sh` - the rule engine, over fixture logs, through a new
  `--diagnose FILE` mode. A healthy boot produces nothing; a crash the rules know is still
  named; and a crash they do not know stays unknown. That last one is the point: a Paper
  line is `[12:01:03] [Server thread/ERROR]: ...`, and a rule like `Server .* does not
  exist` used to match that line through the thread tag, so a crash no rule had ever seen
  was filed as understood by a rule that never read it - which silently made the whole
  model half of the diagnosis unreachable. `PASS=9 FAIL=0`.
- `bash harness/live/ailivetest.sh` - the panel using the model on itself, against a real runtime and a
  real model. A crash nothing matches is worked out by itself; the verdict lands in the
  queue the person is looking at; it is written into the brain under a deterministic key;
  the same crash a second time costs no model call even after the cache file is deleted;
  the console of the crashed server says the panel read it; and the switch that turns the
  automatic pass off is honoured. `PASS=28 FAIL=0` (or `SKIP` on a machine with no engine).
- `bash harness/live/weblivetest.sh` - looking things up, end to end, with no internet at all. Two stubs
  stand in for the outside world (`tools/stub_search.py`, `tools/stub_ollama.py`), so the
  suite proves that the model's search request really does cause a lookup, that the answer
  really does use it, that the lookup is recorded in the panel's log and feed, that the
  hourly ceiling is a real limit - and that a page address pointing at this machine, a
  private range, or anything that is not http/https is refused before a socket is opened.
  It also pins the worlds a server is made of: the preset list in the create form comes from
  the bundled plugin's own `config.yml` (and the page carries no preset list of its own); a
  create naming worlds really stores them; a seed that is not a number is refused by name in
  the new server's console while the good rows beside it are kept; the world view refuses the
  same row with the same words; and the diagnosis carries the folder's state. `PASS=45 FAIL=0`.
- `bash harness/live/helplivetest.sh` - the help box, against the same stub runtime, because the part
  worth proving is not that a model can talk. It proves the model is handed this machine's
  own notes and says how many were relevant; that a page the model **invents** is dropped
  rather than followed (the stub is made to name one on purpose); that keeping an answer
  makes it a brain entry a search and any agent find; that the same question asked again is
  answered from that note; and that with the panel AI switched off the box still answers
  from its own notes instead of showing an error. `PASS=31 FAIL=0`.
- `bash harness/live/tierlivetest.sh` - which model answers, and on which machine. The decisions are proved
  offline first (`--tier-plan` on a described machine: 91% busy, the other machine asleep,
  nothing loaded), because that situation cannot be arranged on a real computer. Then a real
  panel, a real stub machine and a stub runtime prove the rest end to end: a routine question
  is answered here and the other machine's log does not grow; a hard question on a busy machine
  goes to the other machine and carries the key, the weight and its own name; a machine that is
  asleep is woken by a magic packet (the stub does not even open its port until the packet
  arrives, so "it was woken" is measured); a machine that refuses is a fallback, not a failure;
  `peer_serve` off refuses other MACHINES while an ordinary agent key still works; publishing
  refuses while there is no key and while cloudflared is missing, and never claims an address it
  did not get; and a help answer whose JSON leaves out an optional key is still an answer.
  `PASS=64 FAIL=0`. It refuses to start if one of its ports is already held, because a stray
  stub from an earlier run answers every check aimed at that port and the suite then measures
  something that is not the panel - which is exactly what happened here once.
- `bash harness/live/pairlivetest.sh` - pairing two machines with one code, which is the one part of the
  link feature a person has to get right, so it is measured with two real panels and two stub
  runtimes rather than argued. A code is made and read back (its length, its alphabet, the
  address it carries, and the machine admitting that address only answers on itself); a code
  rewritten to be the wrong one is refused with the word *wrong* and the real one survives;
  garbage is refused as *not a pairing code*; the real ticket links both machines, mints a key
  nobody copied, and names the link after the machine that paired; the code is then spent, and
the same ticket again is refused as already used, leaving exactly one link behind; a code
thrown away says the machine *stopped pairing* rather than reading as a wrong code; a lending
machine with `peer_serve` off still pairs and carries that warning to the person who pasted
the code; and the link that comes out answers a hard question with the other machine's runtime,
proved by which of the two stub logs grew. `PASS=45 FAIL=0`.
- `bash harness/live/portslivetest.sh` - the three listeners, with a key made in the panel: the panel port
  refuses to serve a completion, the two program ports want a key, and a revoked or read-only
  key is refused on the right side. `PASS=25 FAIL=0`.

`bash ensure-test-exe.sh` builds `dist/PlayPort-test.exe` and proves it can
actually run before any suite uses it. This machine's code-integrity policy
intermittently refuses a fresh binary, and a suite that silently tests a stale
or blocked one reports nonsense ("unknown endpoint" against a tree that is
green), which is how the retry loop ended up in one place instead of five.

`bash qlivetest.sh` verifies those four features against a live panel rather
than grepping sources: a real `server.properties` with a comment, an escaped
value, a key from a plugin and a duplicated key is read and rewritten (and the
comment, the unknown key and the escaping survive); a name is whitelisted, opped
and banned while stopped (the ban's UUID is compared to an independently
computed offline UUID) and undone again; the same actions go through the console
once the server is running; a restart schedule announces itself and is then
cancelled before it fires; and a server that dies at once is restarted twice and
then given up on at exactly the third failure. `PASS=58 FAIL=0` is green.

The MariaDB path is additionally verified live (manual one-off): a fresh data
root installs MariaDB 11.4 from the portable zip, `db/issue` provisions
`wp_<site>_<hex>` with working credentials (table writes succeed), the user
is confirmed isolated to its own database, `DELETE /api/db/<name>` drops it,
and a hard `taskkill /F` of the panel kills `mariadbd` via the job object.
Note the smoke suite asserts only the API surface - a full DB round-trip
needs the ~90 MB download, which is not assumed in CI.

`bash livetest.sh` exercises the newer features live: the helper bot, folder
import, ZIP import, site preview, Vanilla versions newest-first, and a full
**real Minecraft Paper boot** including the automatic Temurin JRE download
(~45 MB, needs a few minutes). `LIVE PASS=17 FAIL=0` is green.

For a live Steam install of a real game (needs a few minutes + disk):
`bash steamtest.sh 480` (tiny free test app) - or any App ID, e.g.
`bash steamtest.sh 740` for Counter-Strike 2.

For the web stack: `bash webtest.sh` proves PHP end-to-end (real download of
`php-cgi`, GET/POST handling) and a self-signed HTTPS site (cert generation +
SAN check via `openssl`). `bash acmetest.sh` runs the real ACME v2 flow
against **Let's Encrypt staging** (account creation, new order, http-01
challenge) - validation correctly fails without a public DNS record, which
still proves the whole client works.
