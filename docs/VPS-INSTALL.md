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
| installs | **Docker Engine and its compose plugin** from Docker's own repository; **ufw**, letting in only 22 (SSH), 80 and 443 — SSH is allowed **first**, so your session never drops; **unattended-upgrades** for security updates |
| lays out | `/opt/racearena` the program (a git checkout) · `/var/lib/racearena` **the data** · `/var/backups/racearena` **the backups** · `/etc/racearena/racearena.env` the settings (readable by root only), with a generated session secret and a one-time setup token |
| starts | two containers: the app, and **Caddy** in front of it, which obtains and renews the **HTTPS certificate** by itself. Only Caddy is reachable from outside (80, 443); the app is not |
| first admin | created with the one-time token, which is then **removed** from the settings file; sign-in is checked over `https://<your domain>` |
| schedules | a **backup every day** (the last 14 days are kept) and a **status check every 10 minutes**. When the check fails: an e-mail if SMTP was given, otherwise an error in the system journal that `racearena status` shows. The end of the run says which of the two is active |

**It never changes the SSH configuration.** The recommended steps are printed at the end; do them
yourself, while signed in, and test a second sign-in before closing the first.

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

`racearena <command> --help` explains each one. Backups, restores, migrations and the status check
are the project's own tools ([DEPLOYMENT.md](DEPLOYMENT.md)), run inside the app's container — the
server needs no other software.

★ **Copy the backups off the server too** — to another machine, or to storage you rent. A backup on the
same disk is lost together with the disk.

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
- **Tested only on the real server, at the first install:** the system check, the Docker install, ufw,
  unattended-upgrades, the DNS check, the real certificate, the systemd timers and the alert e-mails.
