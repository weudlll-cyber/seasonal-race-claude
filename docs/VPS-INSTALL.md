# Installing RaceArena on one server — the one command

**Owns:** installing and running RaceArena on a single rented server (a VPS) with one command, and
the `racearena` helper that runs it afterwards. The other ways to install — a plain `node` install,
your own Docker setup — and every setting are [DEPLOYMENT.md](DEPLOYMENT.md)'s.

**Decided on 2026-10-07:** the game goes online on the owner's own VPS (Contabo); he installs it
himself; the install is ONE command that fetches everything from GitHub. Docker is used inside it;
nobody has to handle Docker by hand.

## Before you start

- **A server** running **Ubuntu 22.04, Ubuntu 24.04 or Debian 12**, freshly set up, that you can sign
  in to with SSH. Any other system is refused with a message.
- **A domain name** (for example `races.example.com`) with an **A record pointing at the server's IP
  address**. The installer checks this and stops, explaining what to set, if it does not point there
  yet.
- **An e-mail address**, for the certificate's notices and for alerts.
- Optional: the settings of an **SMTP server** (host, port, user name, password, sender address), if
  you want alerts by e-mail. Without them, alerts go to the server's system journal.

## The command

Signed in to the server:

```sh
curl -fsSL https://raw.githubusercontent.com/weudlll-cyber/seasonal-race-claude/<ref>/deploy/install.sh -o install.sh && sudo bash install.sh
```

`<ref>` is the version: a release tag such as `v1.0.0`, or a branch. Give the same to the installer
with `--ref <ref>`. Without `--ref` it installs the newest **release tag** (`v<major>.<minor>` or
`v<major>.<minor>.<patch>`); **while no release tag exists it stops and says so**, naming `--ref`.

`sudo bash install.sh --dry-run --ref <ref>` prints every action in order and changes nothing.

## What it asks

1. **The domain** visitors will type.
2. **An e-mail address.**
3. **The first admin's user name and password.** The password is asked twice and shown nowhere. It is
   **never written** to disk, to a log or to the shell history: it goes from memory straight to the
   server's own setup route.
4. **SMTP for alert e-mails — optional;** press Enter to skip.

Each answer is checked and asked again if it is not valid. The answers, without any password, are
kept in `/etc/racearena/install.conf`, so **running the command again never asks them again**.

## What it does

| | |
| --- | --- |
| checks | run as root, on a supported system |
| DNS | the domain must point at this server; otherwise it explains what to set at the domain provider and stops |
| installs | **Docker Engine and its compose plugin** from Docker's own repository; **ufw**, letting in only 22 (SSH), 80 and 443 — SSH is allowed **first**, so your session never drops; **unattended-upgrades** for security updates; **fail2ban**, which bans an address for an hour after five failed SSH sign-ins within ten minutes |
| lays out | `/opt/racearena` the program (a git checkout) · `/var/lib/racearena` **the data** · `/var/backups/racearena` **the backups** — both readable by the app's own account only · `/etc/racearena/racearena.env` the settings (readable by root only), with a generated session secret and a one-time setup token |
| starts | two containers: the app, and **Caddy** in front of it, which obtains and renews the **HTTPS certificate** by itself. Only Caddy is reachable from outside (80, 443); the app is not |
| first admin | created with the one-time token, which is then **removed** from the settings file; sign-in is checked over `https://<your domain>` |
| schedules | a **backup every day** (the last 14 days are kept) and a **status check every 10 minutes**. When the check fails: an e-mail if SMTP was given, otherwise an error in the system journal that `racearena status` shows. The end of the run says which of the two is active |

**It never changes the SSH configuration.** At the end it prints the one command that does, guided:
`sudo racearena harden-ssh --user <you>`. That switches off password and root sign-in over SSH —
but only after it has seen you sign in **with a key** in a second session (below). Until you run it,
fail2ban is what stands between the internet and a password guesser.

**Running it again** on an installed server repairs or confirms: each step it finished is recorded in
`/etc/racearena/install.state`, the settings and the session secret are kept, and the program is
moved to another version only by `racearena update`.

## The `racearena` command

| | |
| --- | --- |
| `racearena status` | is it healthy? The app, free disk, the data directory, the newest backup, both containers, https, and the alerts of the last day |
| `racearena logs [app\|caddy] [-f]` | the logs (each rotates at 10 MB, five files) |
| `racearena backup` | a backup now |
| `racearena restore <archive>` | put the data back from a backup: the app stops, the current data is **moved aside and kept**, the backup is restored, the app starts and is checked |
| `racearena update [ref]` | another version: **a backup first**, then the new version is built, its migrations run, it starts and is checked. **If it is not healthy within two minutes, it goes back by itself** to the previous version and to that backup, and says so |
| `racearena rollback` | back to the version before the last update and to the backup taken just before it (the newer data is moved aside, not deleted) |
| `racearena version` | what runs here, the version before it, and where things are |
| `racearena harden-ssh --user <name>` | switches off SSH passwords and root sign-in, **proving first** that `<name>` (a non-root user who can use sudo) signs in with a key: it prints the plan and a one-time code; you sign in as `<name>` with your key in a **second** terminal and run `sudo racearena harden-ssh --confirm <code>` there. It refuses when that session did not use a key, and checks the result with `sshd -t` and the effective settings before reloading SSH. `--dry-run` stops after the checks |
| `racearena uninstall [--purge-data]` | removes RaceArena: **a final backup first** (if it fails, nothing is removed), then you type the domain to confirm. The containers, the timers, the fail2ban jail, the program and the settings go; **the data and the backups are kept**. `--purge-data` deletes them too, after asking a second time |

`racearena <command> --help` explains each one. Backups, restores, migrations and the status check
are the project's own tools ([DEPLOYMENT.md](DEPLOYMENT.md)), run inside the app's container — the
server needs no other software.

★ **Copy the backups off the server too** — to another machine, or to storage you rent. A backup on the
same disk is lost together with the disk.

**Running the server day to day** — health, backups, updates, accounts, security, what to do when
something goes wrong — is in the [operator guide](OPERATOR-GUIDE.md).

## Inside Seasonal Entertainment (website mode)

*(WEBSITE-EMBED-1 pieces 5a, 5b and 5c, 2026-11-11, on branch `feat/website-embedding`; not merged
until the rehearsal on the real website.)* The same command installs RaceArena **inside** the Seasonal
Entertainment website, on the website's own server: under `/games/race`, behind the website's proxy,
with the website's accounts (sign-in: [AUTH.md](AUTH.md) §10; settings:
[ENVIRONMENT.md](ENVIRONMENT.md), *Website mode*). It follows the website's own layout, as Seasonal
Bingo Royale and Seasonal Mini Games do.

**Which install.** When the server carries the website's markers — `/etc/seasonal/site-local-port`,
`/etc/seasonal/games-sync-token` and the folder `/etc/seasonal/routes/` — the installer asks first
whether to install inside it (Enter = yes). Without them there is no question and everything above is
exactly as it was. `--mode standalone|website` decides without asking. The mode is kept in
`/etc/racearena/mode`; `racearena update` keeps it.

**First, the website's record**, `/etc/seasonal/install.conf`, written by the website's installer
(root only, no secrets). It is read line by line — **never sourced, never printed** — for four keys:

| key | what the race takes from it |
| --- | --- |
| `RACE` | must be `yes`: the owner enabled the race in the website's installer. Anything else **stops before any change**, with the instruction to run the website's installer again with `--race` |
| `SITE_DOMAIN` | the race's public address, `https://<SITE_DOMAIN>` (`--site-origin <url>` only overrides it) |
| `MODE` | `nginx` or `caddy` — used first, then cross-checked against what runs: the website's Caddy (compose project `seasonal-site`, service `caddy`) or nginx on ports 80/443. A disagreement stops |
| `INSTALL_DIR` | the website's checkout; in Caddy mode the race's route file goes into its `deploy/site/routes` |

**What it asks:** only **the team** the website's hosts run races in (Enter = *Seasonal
Entertainment*). No domain, no certificate e-mail, no first admin.

**What it finds by itself** (`deploy/install.sh` → `website_detect`), and the flag when it cannot:

| | how | flag |
| --- | --- | --- |
| the website's app | the container of compose project `seasonal-site`, service `site` | — (it must run) |
| the website's network | `seasonal-site_default` when the site container is on it, else its only network | `--site-network <name>` when it is on several |
| the account feed | `http://site:3800` over that network (the race's app joins it) | — |
| the website's port (nginx) | `/etc/seasonal/site-local-port` — the authorize subrequest goes to `127.0.0.1:<that port>` | — |

**The race's own port and subnet**, fixed beside the other games — **Bingo 3900 and
`172.30.249.0/24`, Mini Games 3920 and `172.30.250.0/24`, the race 3940 and `172.30.251.0/24`.** Either
in use stops the install, naming `--port <n>` / `--subnet <cidr>`; a re-run keeps the values the first
install recorded (`/etc/racearena/website.conf`).

**What it does:**

| | |
| --- | --- |
| Docker | installed the same way as above **only if it is missing**. No firewall rule and no fail2ban: the server is the website's |
| lays out | the same folders as above, and `/etc/racearena/website/proxy-secret` — generated once, readable by the app's account only (0400), **never printed** |
| the sync token | the website's `games-sync-token` (root-only) is copied for the app's account (0400) and taken again at every `racearena start` and `update`, so a renewed token reaches the race |
| starts | **the app only** — no Caddy of the race, nothing on 80 or 443 — on its own network (`172.30.251.0/24`) and the website's. **nginx mode:** published on `127.0.0.1:3940`; the race's own subnet alone is the trusted proxy, **never the website's network** (it carries the feed only). **Caddy mode:** not published; the website's Caddy reaches it on the website's network as `racearena:4000`, so that network's subnets are the trusted proxy (as for Bingo) |
| the route | `racearena route install` writes the race's file with `deploy/website-route.sh`, **root's, 0600** (it carries the proxy secret — Bingo's pattern too): **nginx** `/etc/seasonal/routes/race.conf` (the website includes `/etc/seasonal/routes/*.conf`), checked with `nginx -t`; **Caddy** `<INSTALL_DIR>/deploy/site/routes/race.caddy` (mounted read-only into the website's Caddy as `/etc/caddy/routes`, imported as `/etc/caddy/routes/*.caddy`) — after checking that the running Caddy has that mount — checked with `caddy validate` in its container. Then the proxy is reloaded. A refused check puts the previous file back (or removes the new one), reloads, and stops with the reason. **No file of the website is ever edited** |
| schedules | the same daily backup and status check as above; **backups stay the race's own** |

What the route file does on every request, and how it is proven behind both real proxies:
[reports/night/MORNING-WEBSITE-EMBED-1.md](../reports/night/MORNING-WEBSITE-EMBED-1.md), *Piece 5a* and
*Piece 5c*.

**The `racearena` command in website mode:** `status` names the mode and the route file's state
(present, owner-only, and what this version writes) instead of https; `route [install|remove|status]`
manages the route file; `uninstall` takes out **only** the race's route file (then reloads the
website's proxy), the race's containers and its own network — it only leaves the website's network —
and the race's settings; **the data and the backups are kept**, as above. `logs caddy` and
`harden-ssh` are the standalone install's.

## If it stops

- **"does not point at this server yet"** — set the A record as the message says, wait, and run the
  same command again. It continues where it stopped.
- **"run it as root"** — start it with `sudo`.
- **"this system is …"** — the server runs an unsupported system; reinstall it with Ubuntu 22.04,
  Ubuntu 24.04 or Debian 12.
- **"no release tag exists yet"** — add `--ref <tag or branch>`.
- **"sign-in over https did not work within two minutes"** — usually the certificate could not be
  obtained: the domain must point at the server and ports 80 and 443 must be reachable. `racearena logs
  caddy` says why. Then run the command again.
- **Anything else** — run it again; it repairs or confirms what is done. `racearena status` and
  `racearena logs` show the state.

## What was tested where

- **Tested on a local Docker (VPS-INSTALL-1, 2026-10-07)**, exactly as the installer starts the stack,
  with Caddy's own test certificate instead of a public one: see
  [reports/release/VPS-INSTALL-1.md](../reports/release/VPS-INSTALL-1.md).
- **The emergency drill, on the same local Docker (2026-10-18):** a backup copied off one install,
  that install removed with `--purge-data`, a new install made, the archive put into its
  `/var/backups/racearena` and `racearena restore <archive>` run — the old accounts and races came
  back. On a real loss, that is the way back: install afresh, copy the archive in, restore.
- **Tested only on the real server, at the first install:** the system check, the Docker install, ufw,
  unattended-upgrades, the DNS check, the real certificate, the systemd timers and the alert e-mails.
- **Website mode (2026-11-11):** the route file behind real nginx and Caddy (`deploy/test/route-test.sh`),
  and the whole install in a throwaway Ubuntu 24.04 machine with systemd and its own Docker, with FAKE
  website markers and the stand-in (`scripts/website-standin.mjs --site`) as the website, one proxy at
  a time (`deploy/test/e2e-website.sh`). **Not yet on the real website**: that rehearsal is the
  owner's call, when the website is ready.
- **Website mode in the website's real layout (piece 5c, 2026-11-11):** the record `/etc/seasonal/install.conf`,
  compose project `seasonal-site`, `race.conf` / `race.caddy`, port 3940 and subnet 172.30.251.0/24 —
  `deploy/test/website-install-unit.sh`, `route-test.sh` and `e2e-website.sh`.
