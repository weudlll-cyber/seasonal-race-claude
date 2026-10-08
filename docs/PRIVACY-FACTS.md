# RaceArena — privacy facts

**Owns:** the facts about personal data in a RaceArena installation — what is stored, where, for how
long, who can read it, what is logged and what leaves the machine — for someone who must answer
privacy questions about an install.

**This is a technical inventory, not legal advice.** Whether an installation's use of this data is
lawful, and what its operator must tell the people whose names are entered, is for the operator to
decide.

**Source.** The measured inventory of the release audit,
[AUDIT-1/A12-privacy.md](../reports/release/AUDIT-1/A12-privacy.md), and its sections A11 and A12 in
[AUDIT-1.md](../reports/release/AUDIT-1.md), established by reading every place the server writes into
its data folder, every value it puts into a session, and every line it logs. **Stated against `master`
at `290e6db3` (2026-10-09).** One fact below was found in the client code while writing this page and
is marked as such. Where this page and the code disagree, the code is right.

## In short

- **Whose data:** the race directors who have accounts, and the **players whose names are typed into
  races and player groups**. Players have no account and never sign in.
- **Where:** in one data folder on the server, and in the browser of each person who uses the app.
- **Nothing goes to any third party** — no analytics, no external fonts or scripts, no outbound call
  from the server.
- ★ **Player names in stored races are kept forever, and there is no way in the app to remove them.**
- ★ **Backups contain everything, including the password hashes, and nothing deletes old backups**
  (except on the unmerged VPS install, see below).

## What is stored, where, for how long, and who can read it

| data | personal data in it | where | kept for | who can read it |
| --- | --- | --- | --- | --- |
| user accounts | user name, team, role, a bcrypt password hash, a session counter | `users.json` in the data folder, owner-only file | until an admin deletes the account | admins, through the account management; whoever can read the data folder on the host |
| sessions | the user id and the session counter only — **no IP address, no browser details** | `sessions.sqlite` in the data folder | 30 days, removed when they expire | the host account |
| session cookie | an opaque session id | the visitor's browser (`ra.sid`, or `__Host-ra.sid` over HTTPS); not readable by page scripts | 30 days | that browser |
| stored races | **player names** (the roster), finishing order and times, the team that ran the race (not the user name) | `races.sqlite` in the data folder | **forever** — the database refuses changes to a stored race, and no route deletes one | every signed-in user of that team |
| race history in the browser | player names, results, seed | the browser's local storage (`racearena:raceHistory`) | until that browser's storage is cleared | that browser |
| last signed-in user *(found in the client code for this page; not in the audit's table)* | the user name and role | the browser's local storage (`racearena:lastUser`), written by `client/src/contexts/AuthContext.jsx` | removed at sign-out and when the server says the session is gone | that browser |
| player groups | **player names** | `player-groups/` in the data folder | until deleted | **every signed-in user** — groups are shared by the whole installation, not per team |
| brands, racer types, tracks | organisation names, logos and pictures an operator uploads | `brands/`, `brand-logos/`, `racers/`, `racer-sprites/`, `tracks/`, `backgrounds/`, `tracks-backups/` | until deleted; `tracks-backups/` keeps the newest 20 copies of each track | every signed-in user |
| admin recovery log | the time and the recovered user name — never a password or hash | `recover-admin-audit.log` in the data folder | forever (it is only appended to) | the host account |
| server log | user names and user ids in warning lines (see below) | the server's output: on Docker, the container log, rotated at 10 MB, five files; on a plain Node install, wherever its process manager keeps output | until rotated out | whoever can read the logs on the host (on Docker: root and the `docker` group) |
| backups | **everything above that lives in the data folder**, including the password hashes | `racearena-backup-<time>.tar`, owner-only file, wherever the operator writes it | **until someone deletes it** | the host account, and anyone with access to wherever copies are kept |

"The data folder" is the one directory a RaceArena server keeps everything in; where it is on each
install path is in the operator guide, `docs/OPERATOR-GUIDE.md`, section 1.

## What is logged

- **Never logged:** passwords, the setup token, the session secret, any other secret, request bodies,
  and **IP addresses** — in `server/src` and `server/utils` there is no line that writes one. A failed
  setup-token check names no token. To keep request bodies out, error answers with a 4xx status are
  not logged at all.
- **Logged:** user names and user ids in warning lines — a rejected race, a wrong current password on
  a password change, a user without a team. Start-up lines about the install's configuration.
- **Nothing is logged per request**, so there is no access log of who opened which page.
- **A reverse proxy is outside the app.** On a plain Node or Docker install, whether an access log with
  IP addresses exists depends on the proxy the operator puts in front. On the VPS install (branch
  `feat/vps-install`, **not merged**), Caddy's configuration has no `log` directive, so it writes no
  access log — only its own start-up and certificate messages.

## What leaves the machine

**Nothing, today.** The app loads no external script, font or analytics (the font is shipped with the
app), and the server makes no outbound network call. Nothing is sent anywhere unless the operator
copies it — a backup moved to another machine is the operator's own transfer.

★ **When the admin status box is merged** (planned on branch `feat/admin-status-box`), it will be the
**first outbound call**: to GitHub, to read the project's release tags, and it is planned to carry no
data from the installation. **That branch was not at the origin repository on 2026-10-09**, so this is
the plan recorded in the audit, not a checked fact; check it again when it is merged.

## Removing a person's data

| data | how |
| --- | --- |
| an account | an admin deletes it in the Dev Screen, *Accounts and system → Race directors* (the last admin cannot be deleted) |
| a name in a player group | edit or delete the group in the Dev Screen |
| a name in a stored race | **not possible in the app.** Stored races cannot be changed, and no route deletes one. The only way would be editing `races.sqlite` directly, which the project neither documents nor tests |
| a name in a browser's race history | clear that browser's site data |
| a name in a backup | delete the backup; an archive cannot be edited |

★ **Retention is a decision the owner has left open**: the row *AUDIT-1 A12 · retention* in
[BACKLOG.md](BACKLOG.md) PART ONE, covering player names in stored races and backup archives. Stored races are kept forever **by design**:
it was decided on 2026-10-08 that the race store keeps every race. If an event needs names removed
later, the honest options today are not entering real names, or not using the stored-race history for
that event.

## Backups

- A backup is **one archive of the whole data folder**: accounts with password hashes, sessions,
  every stored race, every player group and every upload.
- Archives and their checksum files are readable by their owner only.
- **On a plain Node or Docker install nothing ever deletes an archive.** Every backup taken is a
  full copy of everyone's data until someone removes it.
- On the VPS install (branch `feat/vps-install`, **not merged**), the daily backup deletes archives
  older than 14 days **on that server**. Copies taken off the server are not touched.
- A copy of a backup on another machine carries the same data and needs the same care.
