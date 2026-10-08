# AUDIT-1 A12 — privacy inventory (what personal data the app holds, where, for how long)

Established by reading every `join(DATA_ROOT, …)` in `server/src` and `server/utils`, every
`req.session.* =` assignment, and every server log line (A11). Facts only; not legal advice.

| data | personal data in it | where | written by | kept for | who can read it |
|---|---|---|---|---|---|
| user accounts | username, team, role, bcrypt hash (cost 12), session epoch | `users.json` (0600) | setup, admin user management, own password change | until the admin deletes the account | admins through `/api/users`; the host account that owns the data folder |
| sessions | user id and session epoch only (no IP, no user agent) plus the cookie's expiry | `sessions.sqlite` | sign-in | 30 days (`maxAge`), swept on expiry | the host account |
| session cookie | an opaque session id | the browser (`ra.sid`, HttpOnly, SameSite=Lax, Secure in production) | sign-in | 30 days | the browser |
| stored races | **player names** (the roster), finish order and times, team, the signed-in user's team (not the username) | `races.sqlite` | the result screen, `POST /api/races` | forever: rows are immutable by trigger; no delete route | every signed-in user of that team |
| race history in the browser | player names, results, seed | the browser's `localStorage` (`racearena:raceHistory`) | the result screen | until the browser's storage is cleared | that browser |
| player groups | **player names** | `player-groups/*.json` | Dev Screen | until deleted | every signed-in user (not team-scoped) |
| brands, racers, tracks | organisation names, logos, images an operator uploads | `brands/`, `brand-logos/`, `racers/`, `racer-sprites/`, `tracks/`, `backgrounds/`, `tracks-backups/` (newest 20 per track) | Dev Screen | until deleted | every signed-in user |
| recover-admin audit log | timestamp and the recovered username (never a password or hash) | `recover-admin-audit.log` | `scripts/recover-admin` | forever (append-only) | the host account |
| server log | usernames and user ids in warning lines (rejected race, wrong current password, user without a team); no passwords, tokens, secrets, request bodies or IP addresses | container stdout (docker json-file, 10 MB x 5 rotation) | the server | until rotated out | whoever can read Docker logs (root / docker group) |
| reverse-proxy log (VPS stack) | **none**: `deploy/Caddyfile.template` has no `log` directive, and Caddy writes no access log without one — only its own runtime and certificate messages | Caddy's stdout | Caddy | rotated with the container log | root / docker group |
| backups | everything above that lives in the data folder, including the password hashes | `racearena-backup-*.tar` (0600 after AUDIT-1 A5M-05) | `npm run backup`, the backup timer | until deleted (no retention on archives) | the host account |

Observations, for the owner (NEEDS-OWNER, not defects):
- **Player names are stored forever in `races.sqlite`**, by design (immutable race rows). There is no
  way to remove one person's name from stored races. Whether that is acceptable for the events the
  install will run is the owner's call; docs/PRIVACY-FACTS.md (piece F) states it plainly.
- **Backup archives have no retention.** Each holds a full copy of the accounts and every race.
- Nothing is sent to any third party: the client loads no external script, font or analytics, and
  the server makes no outbound call (the release check in piece D2 will be the first, to GitHub).
