# PROXY-PROBE-1 — the app behind an HTTPS proxy, tested end to end

**2026-10-04, branch `docs/proxy-probe`.** No product code changed; no fingerprint can move (one
document and this report). The result is a tested proxy example in
[DEPLOYMENT.md](../../docs/DEPLOYMENT.md#behind-a-reverse-proxy--a-tested-example-caddy).

## The set-up

| part | what |
| --- | --- |
| the app | the image built from master `9d5f1ccb` (`server/Dockerfile`), production mode |
| the app's settings | `NODE_ENV=production`, `RA_BIND_ADDRESS=127.0.0.1`, `RA_PUBLIC_ORIGIN=https://127.0.0.1:8443`, a fresh session secret and bootstrap token; `RA_COOKIE_SECURE` **unset** |
| the proxy | Caddy 2.11.6 (`caddy:2-alpine`) with **internal TLS**: site `127.0.0.1:8443`, `tls internal`, `reverse_proxy 127.0.0.1:4000` |
| the wiring | Caddy ran in **the app container's network namespace** (`--network container:…`). So `RA_BIND_ADDRESS=127.0.0.1` meant exactly what it means on a host install: the proxy reaches the app on 127.0.0.1, and nothing else can. Only the proxy's port was published, and only on the host's 127.0.0.1. |
| the client | a node script, verifying TLS against Caddy's own root certificate (`NODE_EXTRA_CA_CERTS`), never skipping verification |

## What was proved, through the proxy

| step | answer |
| --- | --- |
| `GET /api/health` | 200 |
| `GET /` — the app | 200, and the page carries `https://127.0.0.1:8443` (the injected `RA_PUBLIC_ORIGIN`) |
| first admin (`POST /api/auth/setup`, bootstrap token) | 201 |
| sign-in | 200 |
| the cookie | `__Host-ra.sid=…; Path=/; Expires=…; HttpOnly; **Secure**; SameSite=Lax` |
| its lifetime | **30.00 days** — the session length is unchanged |
| `GET /api/auth/me` with the cookie | 200, the admin |
| store one race | 201, key `WJRDCF` |
| read it back by short key | 200, `WJRDCF`, the same names, the same id |
| logout | 200 |
| the old cookie after logout | **401** |

**The bind, from inside the app container:** `http://127.0.0.1:4000` → 200; the container's own
address `http://172.17.0.2:4000` → **refused**. The published ports were `8443/tcp ->
127.0.0.1:8443` and nothing else.

## Found on the way

1. **A bare IP address and TLS do not mix by default.** Node sends no server name (SNI) for an IP
   address, so Caddy had no certificate to pick and ended the handshake (`tlsv1 alert internal
   error`). `default_sni 127.0.0.1` in Caddy's global options fixed it. A browser on a real domain
   never meets this; it is written into the guide as a note for anyone testing against an IP.
2. **`DEPLOYMENT.md` advised `RA_COOKIE_SECURE=auto` behind a proxy**, while what works, and what
   was tested, is leaving it unset (on in production). The Notes bullet now points at the tested
   section and says `auto` was not part of the test.
3. **The guide says `RA_BIND_ADDRESS=127.0.0.1` cannot be used inside a container.** That holds for
   a published container port. It does work when the proxy shares the container's network, as
   here. The guide's sentence is not wrong for the case it describes, so it was left as it is.

## A mistake in the first run, recorded

The first version of the script also asked `http://127.0.0.1:4000/api/health` **from the host**, to
show the app's port was closed. It answered 200, but the answer came from **the owner's own
development API**, which listens on 4000 on this machine, not from the probe. That was one read of
the health endpoint, and nothing else was sent to it. The check was removed, and the bind is proved
from inside the container instead, as above.

## Removed afterwards

Both containers (`docker rm -f -v`), the app image and the Caddy image. No volume was created: the
count was 5 before and 5 after. The Caddy configuration, root certificate and script stayed in this
session's scratch folder, `C:\tmp\vod\proxy`. Docker's build cache from the image build was **not**
pruned, because pruning it would also clear cache that is not this probe's.
