#!/usr/bin/env bash
# ============================================================
# File:        route-test.sh
# Path:        deploy/test/route-test.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 5a (2026-11-11)
# Description: The race's route file (deploy/website-route.sh) inside a REAL proxy — the official
#              nginx or Caddy image, pinned — in front of a fake website and a fake race
#              (deploy/test/route-fakes.mjs), proven from the visitor's side (deploy/test/route-check.mjs):
#              the website cookie never reaches the race but does reach the authorize call; client-sent
#              identity and secret headers are cleared on every path; the secret is only on the
#              sign-in; nothing outside /games/race/ reaches the race; and a broken route file is
#              rolled back to the previous file (the proxy keeps serving the website). In the website's
#              REAL layout (piece 5c): race.conf in /etc/seasonal/routes for nginx; race.caddy in the
#              folder the website's Caddy mounts as /etc/caddy/routes, that mount checked first.
#
# Usage: bash route-test.sh nginx|caddy <workDir> [generator]
#   ONE variant per run — never both at once. [generator] defaults to deploy/website-route.sh; a
#   sabotage run passes a changed copy. Everything it starts is named ra-rt-* and removed at the end,
#   the network too; every container is capped (--cpus 1, --memory 256m). Ports, on 127.0.0.1 only:
#   18480 the proxy, 18481 the fake website, 18482 the fake race (the last two for inspection).
# ============================================================
set -uo pipefail

VARIANT="$1" WORK="$2"
HERE="$(cd "$(dirname "$0")" && { pwd -W 2>/dev/null || pwd; })"
GEN="${3:-$HERE/../website-route.sh}"
export MSYS_NO_PATHCONV=1

NGINX_IMAGE=nginx@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10   # 1.27.5-alpine
CADDY_IMAGE=caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f   # 2.11.7, the production pin
NODE_IMAGE=node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
CAP=(--cpus 1 --memory 256m)
NET=ra-rt-net

mkdir -p "$WORK/routes"
WORK_W="$(cd "$WORK" && { pwd -W 2>/dev/null || pwd; })"
rm -f "$WORK/routes/"*
# The race's proxy secret for this run: generated, 0600, never printed.
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" >"$WORK/secret"
chmod 600 "$WORK/secret"

cleanup() {
  docker rm -f ra-rt-proxy ra-rt-site ra-rt-race >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
}
cleanup
trap cleanup EXIT

docker network create "$NET" >/dev/null
for role in site race; do
  port=18481; [[ $role == race ]] && port=18482
  inner=3800; [[ $role == race ]] && inner=4000
  docker run -d --name "ra-rt-$role" --network "$NET" "${CAP[@]}" -p "127.0.0.1:$port:$inner" \
    -v "$HERE/route-fakes.mjs:/fakes.mjs:ro" "$NODE_IMAGE" node /fakes.mjs "$role" >/dev/null
done

# The website's own configuration — standing in for the real one, in its real layout (piece 5c): nginx
# includes /etc/seasonal/routes/*.conf in its server block; the website's Caddy imports
# /etc/caddy/routes/*.caddy (its deploy/site/routes mounted read-only there). Everything else it
# serves itself ("website").
if [[ "$VARIANT" == nginx ]]; then
  cat >"$WORK/proxy.conf" <<'EOF'
events {}
http {
  server {
    listen 8080;
    include /etc/seasonal/routes/*.conf;
    location / { return 200 "website\n"; }
  }
}
EOF
  docker run -d --name ra-rt-proxy --network "$NET" "${CAP[@]}" -p 127.0.0.1:18480:8080 \
    -v "$WORK_W/proxy.conf:/etc/nginx/nginx.conf:ro" -v "$WORK_W/routes:/etc/seasonal/routes:ro" \
    "$NGINX_IMAGE" >/dev/null
  ROUTE_ARGS=(--proxy nginx --race ra-rt-race:4000 --auth ra-rt-site:3800 --exec "docker exec ra-rt-proxy")
  FILE=race.conf
else
  cat >"$WORK/proxy.conf" <<'EOF'
{
	admin localhost:2019
	auto_https off
}
:8080 {
	import /etc/caddy/routes/*.caddy
	handle {
		respond "website" 200
	}
}
EOF
  docker run -d --name ra-rt-proxy --network "$NET" "${CAP[@]}" -p 127.0.0.1:18480:8080 \
    -v "$WORK_W/proxy.conf:/etc/caddy/Caddyfile:ro" -v "$WORK_W/routes:/etc/caddy/routes:ro" \
    "$CADDY_IMAGE" >/dev/null
  ROUTE_ARGS=(--proxy caddy --race ra-rt-race:4000 --auth ra-rt-site:3800 --caddy-container ra-rt-proxy)
  FILE=race.caddy
fi
sleep 3

FAILS=0
pass() { printf 'PASS  %s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*"; FAILS=$((FAILS + 1)); }
answer() { node -e "require('http').get('http://127.0.0.1:18480$1',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d.trim()))})"; }

echo "── $VARIANT: install the route file (check, reload)"
if bash "$GEN" install "${ROUTE_ARGS[@]}" --secret-file "$WORK/secret" --routes-dir "$WORK/routes"; then
  pass "the route file $FILE is installed and the $VARIANT check passes"
else
  fail "the route file $FILE is installed and the $VARIANT check passes"
fi
sleep 2

echo "── $VARIANT: the proofs, from the visitor's side"
node "$HERE/route-check.mjs" 18480 18482 18481 "$WORK_W/secret" || FAILS=$((FAILS + 1))

echo "── $VARIANT: a broken route file is rolled back to the one that worked"
# The generator's own install step, with a configuration the proxy's check refuses: an upstream that
# does not exist (nginx resolves it at the check; Caddy refuses the unknown directive appended).
GOOD="$(sha256sum "$WORK/routes/$FILE" | cut -d' ' -f1)"
if [[ "$VARIANT" == nginx ]]; then BAD=(--proxy nginx --race no-such-host.invalid:4000 --auth ra-rt-site:3800 --exec "docker exec ra-rt-proxy")
else BAD=(--proxy caddy --race "ra-rt-race:4000" --auth "ra-rt-site:3800 { no_such_directive }" --caddy-container ra-rt-proxy); fi
if bash "$GEN" install "${BAD[@]}" --secret-file "$WORK/secret" --routes-dir "$WORK/routes" 2>"$WORK/bad.log"; then
  fail "a broken route file is refused (the install exits non-zero)"
else
  pass "a broken route file is refused (the install exits non-zero)"
fi
if [[ "$(sha256sum "$WORK/routes/$FILE" | cut -d' ' -f1)" == "$GOOD" && "$(ls "$WORK/routes")" == "$FILE" ]]; then
  pass "the previous route file is back, byte for byte, and nothing else is left"
else
  fail "the previous route file is back, byte for byte, and nothing else is left ($(ls "$WORK/routes" | tr '\n' ' '))"
fi
if [[ "$(answer /)" == website && "$(answer /games/race/x)" == *'"path":"/games/race/x"'* ]]; then
  pass "after the rollback the website is served and the race still reached"
else
  fail "after the rollback the website is served and the race still reached"
fi
if ! grep -q "$(cat "$WORK/secret")" "$WORK/bad.log"; then pass "the refusal does not print the secret"; else fail "the refusal does not print the secret"; fi

if [[ "$VARIANT" == caddy ]]; then
  echo "── caddy: a Caddy without the routes folder mounted is refused before anything is written"
  # The fake website's container stands in for a website Caddy from before /etc/caddy/routes.
  mkdir -p "$WORK/other"
  if bash "$GEN" install --proxy caddy --race ra-rt-race:4000 --auth ra-rt-site:3800 --caddy-container ra-rt-site \
    --secret-file "$WORK/secret" --routes-dir "$WORK/other" 2>"$WORK/mount.log"; then
    fail "the missing /etc/caddy/routes mount is refused"
  elif grep -q "/etc/caddy/routes" "$WORK/mount.log" && [[ -z "$(ls -A "$WORK/other")" ]]; then
    pass "the missing /etc/caddy/routes mount is refused, nothing written"
  else
    fail "the missing /etc/caddy/routes mount is refused, nothing written"
  fi
fi

echo "── $VARIANT: remove"
bash "$GEN" remove "${ROUTE_ARGS[@]}" --routes-dir "$WORK/routes" >/dev/null
if [[ -z "$(ls -A "$WORK/routes")" && "$(answer /games/race/x)" == website ]]; then
  pass "remove takes the file out and the race is no longer reached"
else
  fail "remove takes the file out and the race is no longer reached"
fi

echo "summary $VARIANT: $FAILS failed"
exit $((FAILS > 0))
