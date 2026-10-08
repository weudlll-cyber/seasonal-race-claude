# AUDIT-1 A10 — resilience (measured on throwaway data, master `e164bb68`)

Tools: `tools/a10-store.mjs` (the race store under a lock, integrity, query plans),
`tools/a10-corrupt.mjs` (damaged files at boot, a real server on ports 4711+),
`tools/a10-diskfull.mjs` (a real container whose `/app/data` is a 90 MB tmpfs, port 4720),
and `docker stop` timing on the image. No owner data and no owner port was touched.

| id | scenario | what happened (measured) | verdict |
|---|---|---|---|
| A10-01 | `docker stop` | node runs as PID 1 (`docker-entrypoint.sh` execs it) with **no SIGTERM handler**; the container is SIGKILLed — exit **137** — instead of closing. In-flight requests are cut; stored data stays consistent (JSON writes are rename-atomic, SQLite is journalled). | SECURITY-FIX (availability): handle SIGTERM/SIGINT — stop accepting, finish in-flight, close the databases, exit 0, with a bounded fallback |
| A10-02 | another connection holds `races.sqlite` (e.g. a backup) | journal_mode **delete**, busy_timeout **5000 ms**: a race save **waits 6.9 s and fails SQLITE_BUSY**, and because better-sqlite3 is synchronous the **whole server is blocked** for that time. Released: the same save takes 20 ms. | NEEDS-OWNER: WAL mode removes most reader/writer blocking but changes the files on disk (`-wal`/`-shm`), and the owner's live data folder is inside OneDrive |
| A10-03 | integrity after 501 stored races | `integrity_check` **ok**, `foreign_key_check` **[]** | OK |
| A10-04 | query plans | every read uses an index; the history page and period evaluation add a temp B-tree for the `id` tiebreak only | OK (LEAVE) |
| A10-05 | `users.json` not JSON | server **starts**, `/api/health` **200 ok**; login **500**; every signed-in route **500** (HTML on master, JSON after A5M-08). The status check would report a healthy server nobody can sign in to. | NEEDS-OWNER: make `/api/health` (or the status check) read the stores; the VPS update/rollback reads health, so what it reports is a decision |
| A10-06 | `races.sqlite` not a database | starts, health ok; only `/api/races` fails (500); tracks and the rest work | OK, contained (health blind, see A10-05) |
| A10-07 | `sessions.sqlite` not a database | server **refuses to start**: `SqliteError: file is not a database`, exit 1. Sessions are disposable (losing them signs everyone out), yet one damaged file takes the whole install down. | NEEDS-OWNER: move a damaged sessions file aside and start with a fresh one (an automatic discard is a policy) |
| A10-08 | one track file not JSON | starts; `[tracks] Failed to load city-circuit.json`; the other nine served | OK |
| A10-09 | data folder full | reads keep working; **every write 500s, including sign-in** (it writes a session); a failed track write leaves the record intact; after space is freed the same write succeeds. Health says ok throughout (the VPS status timer watches free disk separately). | OK (recovers by itself); the HTML error page is closed by A5M-08 |

Client side (server down / restart / network drop / two tabs) is recorded separately in
`A10-client.md`, measured in a browser after piece C.
