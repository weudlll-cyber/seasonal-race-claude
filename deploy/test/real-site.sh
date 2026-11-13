#!/usr/bin/env bash
# ============================================================
# File:        real-site.sh
# Path:        deploy/test/real-site.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 6 (2026-11-11), the rehearsal
# Description: The race installed into the REAL Seasonal Entertainment website, in nginx or own-Caddy
#              mode — as Seasonal Bingo Royale's ops/test/real-site.sh rehearses it (read-only
#              reference): the website is cloned at the given ref (it must contain da618e7, website
#              PR #64), its OWN end-to-end harness is reused as a library (deploy/test/run.sh without
#              its last line: a systemd Ubuntu 24.04 server with its own Docker, Pebble for the
#              certificate, the test DNS, its expect-driven installer, its checks) to install the real
#              website with RACE=yes. Then, in that server: the race's install.sh in website mode from
#              this repository's committed tree (a bare copy, never pushed), and the brief's six
#              proofs, driven through https://example.org the way Bingo's rehearsal drives the
#              website (./real-site-race.sh): (1) roles, (2) joining, (3) "may host" removed, locked,
#              unlocked, (4) deleted, (5) cookie and forged headers, (6) ports, update, backup,
#              status, uninstall with the website byte-identical; and WEBSITE-EXTRAS-1's two: (7) a
#              registration marked "Show on the website" in the race's open-rounds list and accepted by
#              the website's own checker, an unmarked one not; (8) the website chat framed on the
#              join page — the race's CSP allowing it, the website's embed answering a member and
#              allowing the frame. Prints PASS / FAIL / NOT DRIVEN per
#              check and the website SHA. Everything it made carries the website harness's label and
#              is removed at the end. KEEP=1 keeps it; RESUME=1 then reuses that server and its
#              website for a quicker try of the race part (as Bingo's rehearsal; the final pass is fresh).
#              The server is capped (--cpus 6 --memory 8g) once it runs. Test only.
#
# Usage: [KEEP=1] [RESUME=1] bash deploy/test/real-site.sh nginx|caddy [<website ref, default master>]
# ============================================================
set -euo pipefail

MODE=${1:?nginx or caddy}
WEB_REF=${2:-master}
[[ $MODE == nginx || $MODE == caddy ]] || { echo "the mode is nginx or caddy" >&2; exit 2; }
RACE_REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
SCRATCH=${RA_REHEARSAL_DIR:-/c/tmp/ra-rehearsal}
WEB="$SCRATCH/web-$MODE"
mkdir -p "$SCRATCH"
rm -rf "$WEB"
git clone -q https://github.com/weudlll-cyber/seasonal-entertainment.git "$WEB"
git -C "$WEB" checkout -q "$WEB_REF"
WEB_SHA=$(git -C "$WEB" rev-parse HEAD)
git -C "$WEB" merge-base --is-ancestor da618e7 HEAD || { echo "STOP: website $WEB_SHA does not contain da618e7" >&2; exit 1; }
RACE_SHA=$(git -C "$RACE_REPO" rev-parse HEAD)
# The race's committed tree as a bundle, copied into the server (never a link into this checkout).
git -C "$RACE_REPO" bundle create "$SCRATCH/race-$MODE.bundle" HEAD >/dev/null 2>&1
export MSYS_NO_PATHCONV=1
sed '$d' "$WEB/deploy/test/run.sh" >"$WEB/deploy/test/run-lib.sh"
# shellcheck source=/dev/null
source "$WEB/deploy/test/run-lib.sh"
trap 'cleanup; rm -rf "$WEB"' EXIT
# The website harness makes a new test admin password each time it is loaded; a kept server keeps the
# one it was installed with, so KEEP=1 writes it to a 0600 scratch file and RESUME=1 reads it back.
# Test-only, never printed; the scratch folder goes with the rehearsal's cleanup.
PW_FILE="$SCRATCH/admin-pw-$MODE"
if [[ "${RESUME:-0}" == 1 ]]; then
  [[ -s "$PW_FILE" ]] || { echo "RESUME=1 needs the kept server's admin password file ($PW_FILE); run with KEEP=1 first" >&2; exit 1; }
  TEST_ADMIN_PASSWORD="$(cat "$PW_FILE")"; export TEST_ADMIN_PASSWORD
elif [[ "${KEEP:-0}" == 1 ]]; then
  (umask 077; printf '%s' "$TEST_ADMIN_PASSWORD" >"$PW_FILE")
fi
FAILED=0
ok() { local what=$1; shift; if "$@"; then say "PASS $what"; else say "FAIL $what"; FAILED=1; fi; }
not_driven() { say "NOT DRIVEN $1"; }
ra() { docker exec -i -e TEST_ADMIN_PASSWORD "$SERVER" bash /etc/seasonal-test/race-admin.sh "$@"; }
body() { sed '$d'; }       # race's output without its status line
status() { tail -n 1; }    # race's status line
DOMAIN=example.org

website_checks() {
  check health || FAILED=1
  check admin || FAILED=1
  check modes || FAILED=1
  check status "$MODE" || FAILED=1
  [[ $MODE == caddy ]] || { check other || FAILED=1; }
}

# What the website is: its checkout's commit and state, its proxy configuration, its record and
# markers, and when its app started — everything but the race's own route file.
website_print() {
  on_server bash -c 'set -o pipefail; {
    git -C /opt/seasonal-entertainment rev-parse HEAD
    git -C /opt/seasonal-entertainment status --porcelain | grep -v "deploy/site/routes/race\." || true
    find /etc/nginx /opt/seasonal-entertainment/deploy/site /etc/seasonal -type f -not -name "race.*" 2>/dev/null | sort | xargs -r sha256sum
    docker inspect -f "{{.State.StartedAt}}" seasonal-site-site-1
  } | sha256sum'
}

website_install() {
  say "=== real website $WEB_SHA ($WEB_REF), mode $MODE; race $RACE_SHA"
  infrastructure
  docker update --cpus 1 --memory 512m --memory-swap 512m seasonal-install-test-dns seasonal-install-test-pebble >/dev/null
  start_server 24.04
  docker update --cpus 6 --memory 8g --memory-swap 8g "$SERVER" >/dev/null
  [[ $MODE == caddy ]] || on_server /etc/seasonal-test/prepare-nginx.sh | tee -a "$RESULTS"
  answers "" no no no ""
  on_server sh -c 'echo RACE=yes >>/etc/seasonal-test/answers'
  run_installer --answers /etc/seasonal-test/answers --yes
  website_checks
  [[ $FAILED == 0 ]] || { say "STOP: the website's own checks failed before the race install"; exit 1; }
}

race_copy() {
  docker cp "$(host_path "$SCRATCH/race-$MODE.bundle")" "$SERVER:/root/race.bundle" >/dev/null
  on_server bash -c "git clone -q --bare /root/race.bundle /root/race.git && git -C /root/race.git branch -f rehearsal-a $RACE_SHA &&
    git clone -q /root/race.git /root/race-b && cd /root/race-b && git checkout -q -b rehearsal-b $RACE_SHA &&
    printf '\nrehearsal: B = A + one line (throwaway, never pushed)\n' >>docs/OPEN.md &&
    git -c user.name=r -c user.email=r@example.org commit -qam 'rehearsal B' && git push -q origin rehearsal-b &&
    git -C /root/race.git show $RACE_SHA:deploy/install.sh >/root/race-install.sh &&
    git -C /root/race.git show $RACE_SHA:deploy/test/real-site-race.sh >/etc/seasonal-test/race-admin.sh &&
    git -C /root/race.git show $RACE_SHA:deploy/test/real-site-record.mjs >/etc/seasonal-test/race-record.mjs &&
    apt-get install -y -qq tcpdump >/dev/null 2>&1"
  REF_B=$(on_server git -C /root/race.git rev-parse rehearsal-b)
}

race_install() {
  say "--- the race's install.sh in website mode: the mode offered, the team the default"
  local rc=0
  on_server bash -c "printf '\n\n' | RA_INSTALL_REPO_URL=/root/race.git bash /root/race-install.sh --ref $RACE_SHA >/root/race-install.log 2>&1" || rc=$?
  on_server tail -n 16 /root/race-install.log | sed 's/^/    /' | tee -a "$RESULTS"
  ok "the race's install.sh exits 0" test "$rc" = 0
  ok "the origin is https://$DOMAIN, from the website's record" on_server grep -qx "RA_PUBLIC_ORIGIN=https://$DOMAIN" /etc/racearena/racearena.env
  ok "no secret in the race install's output" on_server bash -c '! grep -qF "$(cat /etc/racearena/website/proxy-secret)" /root/race-install.log && ! grep -qF "$(cat /etc/seasonal/games-sync-token)" /root/race-install.log'
}

# wait_for <seconds> <command…>: until the command succeeds; prints how long it took.
wait_for() {
  local limit=$1 t=0
  shift
  until "$@" >/dev/null 2>&1; do ((t += 5)); ((t <= limit)) || { echo "not within ${limit}s"; return 1; }; sleep 5; done
  echo "${t}s"
}
me_status() { ra race "$1" GET /api/auth/me | status; }
is_signed_out() { [[ "$(me_status "$1")" == 401 ]]; }
registration_empty() { [[ "$(entry_count "$1")" == 0 ]]; }
entry_count() { ra race "$HUGO" GET "/api/registrations/$1" | body | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["entries"]))'; }
# WEBSITE-EXTRAS-1 helpers for proofs 7 and 8.
lacks() { ! grep -qF -- "$1" <<<"$2"; }                      # lacks NEEDLE TEXT
has_all() { local t=$1 p; shift; for p; do grep -qF -- "$p" <<<"$t" || return 1; done; }
accepted_only() { grep -qx -- "$1" <<<"$3" && ! grep -qx -- "$2" <<<"$3"; }   # YES NO LINES
off_the_list() { [[ $1 == 200 ]] && lacks "$2" "$3"; }      # STATUS CODE LIST
csp_of() { on_server grep -i '^content-security-policy:' "$1" || true; }   # a saved header file
embed_allows_frame() { [[ $1 == 200 ]] && grep -qF "frame-ancestors 'self'" <<<"$2"; }
round_shape_ok() { # PAGE CODE DOMAIN NAME: the eight fields, the join link, the title, no name
  python3 -I -c '
import json, sys
page = json.loads(sys.argv[1])
keys = {"id", "title", "kind", "startsAt", "signupClosesAt", "players", "maxPlayers", "joinUrl"}
assert page["version"] == 1 and page["rounds"], page
for r in page["rounds"]:
    assert set(r) == keys, r
m = [r for r in page["rounds"] if r["id"] == sys.argv[2]][0]
assert m["joinUrl"] == "https://" + sys.argv[3] + "/games/race/join/" + sys.argv[2], m
assert m["title"].startswith("Rehearsal Cup — ") and m["kind"] == "Seasonal Race", m
assert sys.argv[4] not in sys.argv[1]
' "$@"
}

proofs() {
  # The test accounts. The website allows 5 registrations an hour from one address, so a retry on a
  # kept server (RESUME=1) signs in the accounts of the run that made them (kept, test-only, 0600)
  # instead of registering new ones.
  local accounts="$SCRATCH/accounts-$MODE" suffix
  local pw_hugo pw_mia pw_nina reg anyone track code acode id mia_id out key cid took
  ra admin-login
  if [[ "${RESUME:-0}" == 1 && -s "$accounts" ]]; then
    read -r suffix pw_hugo pw_mia pw_nina <"$accounts"
    HUGO=hugo-$suffix MIA=mia-$suffix NINA=nina-$suffix
    ra login $HUGO "$pw_hugo"
    ra login $MIA "$pw_mia"
    ra login $NINA "$pw_nina"
  else
    suffix=$(openssl rand -hex 3)
    pw_hugo=$(openssl rand -hex 12) pw_mia=$(openssl rand -hex 12) pw_nina=$(openssl rand -hex 12)
    HUGO=hugo-$suffix MIA=mia-$suffix NINA=nina-$suffix
    if [[ "${KEEP:-0}" == 1 ]]; then (umask 077; echo "$suffix $pw_hugo $pw_mia $pw_nina" >"$accounts"); fi
    ra register $HUGO "$pw_hugo"
    ra register $MIA "$pw_mia"
    ra register $NINA "$pw_nina"
  fi

  say "--- proof 1: who is what in the race"
  ra host $HUGO true
  # The grant is itself a "rights" change: the feed brings it within its interval (60 s) and ends any
  # race session made before it is applied, as for Bingo; the host signs in after it.
  sleep 75
  ra signin $HUGO >/dev/null
  out=$(ra race $HUGO GET /api/auth/me | body)
  ok "1a a member with \"May host\" for the race is a race operator in the team" grep -q '"role":"operator".*"team":"Seasonal Entertainment"' <<<"$out"
  ra signin admin >/dev/null
  ok "1b a website admin is a race admin" grep -q '"role":"admin"' <<<"$(ra race admin GET /api/auth/me | body)"
  ra signin $NINA >/dev/null
  ok "1c a member without it has no director screen (no director session)" test "$(me_status $NINA)" = 401

  say "--- proof 2: joining"
  track=$(ra race $HUGO GET /api/tracks | body | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
  out=$(ra race $HUGO POST /api/registrations "{\"trackId\":\"$track\",\"capacity\":4,\"closesAt\":\"$(date -u -d '+2 hour' +%Y-%m-%dT%H:%M:%SZ)\",\"websiteAccess\":\"members\"}" | body)
  reg=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$out")
  code=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])' <<<"$out")
  ra signin $MIA >/dev/null
  ok "2a a member joins a members-only registration" test "$(ra race $MIA POST "/api/join/$code" '{}' | status)" = 201
  ok "2b ... exactly once (a second join is refused)" test "$(ra race $MIA POST "/api/join/$code" '{}' | status)" = 409
  ok "2c the director sees the entry as from the website" grep -q '"source":"website"' <<<"$(ra race $HUGO GET "/api/registrations/$reg" | body)"
  ra forget guest
  ra signin guest >/dev/null
  ok "2d a guest cannot join it" test "$(ra race guest POST "/api/join/$code" '{"name":"Walk In"}' | status)" = 403
  acode=$(ra race $HUGO POST /api/registrations "{\"trackId\":\"$track\",\"capacity\":4,\"closesAt\":\"$(date -u -d '+2 hour' +%Y-%m-%dT%H:%M:%SZ)\",\"websiteAccess\":\"anyone\"}" | body | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])')
  ok "2e \"Anyone with the link\" accepts a guest's name" test "$(ra race guest POST "/api/join/$acode" '{"name":"Walk In"}' | status)" = 201

  say "--- proof 7: open registrations on the website (WEBSITE-EXTRAS-1 7a)"
  local closes mreg mcode ucode rounds accepted st chat_status
  closes=$(date -u -d '+2 hour' +%Y-%m-%dT%H:%M:%SZ)
  out=$(ra race $HUGO POST /api/registrations "{\"trackId\":\"$track\",\"capacity\":5,\"eventName\":\"Rehearsal Cup\",\"closesAt\":\"$closes\",\"showOnWebsite\":true}" | body)
  mreg=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$out")
  mcode=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])' <<<"$out")
  ucode=$(ra race $HUGO POST /api/registrations "{\"trackId\":\"$track\",\"capacity\":5,\"closesAt\":\"$closes\"}" | body | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])')
  ra forget nobody
  rounds=$(ra race nobody GET /api/public/open-rounds | body)
  ok "7a the marked registration is in the race's list, read with no session through the website's proxy" grep -qF "\"$mcode\"" <<<"$rounds"
  ok "7b ... the unmarked one is not" lacks "$ucode" "$rounds"
  ok "7c ... exactly the website's eight fields, kind Seasonal Race, the join link on https://$DOMAIN, no player name" round_shape_ok "$rounds" "$mcode" "$DOMAIN" "$MIA"
  accepted=$(ra open-rounds-check)
  ok "7d the website's OWN checker (its openRoundsContract.js) accepts the marked round and not the unmarked" accepted_only "$mcode" "$ucode" "$accepted"
  st=$(ra race $HUGO POST "/api/registrations/$mreg/website" '{"show":false}' | status)
  ok "7e unticking takes it off the list" off_the_list "$st" "$mcode" "$(ra race nobody GET /api/public/open-rounds | body)"
  not_driven "7f the website's own poll and its home and games page showing it: its guarded fetch takes public addresses only (its server/src/previews/safeFetch.js:59-63, ipPolicy.js:16) and this harness's server is 10.77.0.10 (its deploy/test/run.sh:87); 7a-7d read what that poll reads and judge it with the website's own checker"

  say "--- proof 8: the website chat on the join page (WEBSITE-EXTRAS-1 7b)"
  ra race $MIA GET "/join/$code" '' -D /root/join-headers.txt >/dev/null
  ok "8a a signed-in member's join page: the race's CSP has frame-src 'self' and frame-ancestors 'none'" has_all "$(csp_of /root/join-headers.txt)" "frame-src 'self'" "frame-ancestors 'none'"
  ok "8b the race's built page frames /embed/chat?room=race&theme=auto (in its bundle)" on_server docker exec racearena-app-1 sh -c 'grep -rqF "/embed/chat?room=race&theme=auto" "$RA_CLIENT_DIST"'
  chat_status=$(ra page $MIA '/embed/chat?room=race&theme=auto' -D /root/chat-headers.txt | status)
  ok "8c the website's embed answers the member ($chat_status) and lets the same site frame it (frame-ancestors 'self')" embed_allows_frame "$chat_status" "$(csp_of /root/chat-headers.txt)"
  not_driven "8d a browser drawing the frame inside the join page and the chat showing the room to the member (no browser in this rehearsal; client tests JoinPage.website and WebsiteChat render it)"

  say "--- proof 5: the website cookie and forged headers"
  # What really arrives at the race's container: its own traffic, captured in its network namespace.
  on_server bash -c 'pid=$(docker inspect -f "{{.State.Pid}}" racearena-app-1); (nsenter -t "$pid" -n timeout 25 tcpdump -A -s0 -i any "tcp dst port 4000" >/root/race-wire.txt 2>/dev/null &) ; sleep 3'
  ra race $MIA GET /api/health >/dev/null
  ra signin $MIA >/dev/null
  ra race $MIA GET "/api/join/$code" >/dev/null
  sleep 25
  ok "5a the race's container received the requests (the capture is not empty)" on_server grep -q "GET /games/race/" /root/race-wire.txt
  ok "5b ... and never the website's cookie (se.sid / __Host-se.sid)" on_server bash -c '! grep -qiE "(^|[; ])(__Host-)?se\.sid=" /root/race-wire.txt'
  ok "5c ... while the race's own session cookie did arrive" on_server grep -q "ra.sid=" /root/race-wire.txt
  ok "5d forged X-Acting-* and X-Ra-Proxy-Secret on a race path change nothing" test "$(ra race $NINA GET /api/auth/me '' -H 'X-Acting-User-Id: 1' -H 'X-Acting-User-Roles: admin' -H 'X-Acting-User-Can-Host: true' -H 'X-Ra-Proxy-Secret: forged' | status)" = 401
  ra forget forger
  ra signin forger -H 'X-Acting-User-Id: 1' -H 'X-Acting-User: Admin' -H 'X-Acting-User-Roles: admin' -H 'X-Acting-User-Can-Host: true' -H 'X-Ra-Proxy-Secret: forged' >/dev/null
  ok "5e ... and on the sign-in route (a visitor without a website session stays a guest)" test "$(me_status forger)" = 401

  say "--- proof 4 (first half): a finished race with Mia in it"
  mia_id=$(ra user-id $MIA)
  on_server bash -c "docker exec -i -e NAMES='[\"$MIA\",\"Bot A\",\"Bot B\",\"Bot C\"]' -e WEBSITE_RACERS='[{\"index\":0,\"websiteUserId\":\"$mia_id\"}]' racearena-app-1 node --input-type=module - </etc/seasonal-test/race-record.mjs >/root/race.json"
  out=$(ra race $HUGO POST /api/races '' --data @/root/race.json | body)
  key=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["shortKey"])' <<<"$out")
  cid=$(on_server python3 -c 'import json; print(json.load(open("/root/race.json"))["clientRaceId"])')
  ok "4a the finished race is stored ($key)" test -n "$key"

  say "--- proof 3: \"May host\" removed, locked, unlocked — within the feed interval (60 s)"
  ra host $HUGO false
  took=$(wait_for 150 is_signed_out $HUGO) && ok "3a removing \"May host\" ends the race session ($took)" true || ok "3a removing \"May host\" ends the race session ($took)" false
  ra host $HUGO true
  sleep 75
  ra signin $HUGO >/dev/null
  ok "3b ... and the next sign-in is an operator again" test "$(me_status $HUGO)" = 200
  ra lock $HUGO true
  took=$(wait_for 150 is_signed_out $HUGO) && ok "3c locking ends the race session ($took)" true || ok "3c locking ends the race session ($took)" false
  ra signin $HUGO >/dev/null
  ok "3d ... and a sign-in while locked gets no director session" test "$(me_status $HUGO)" = 401
  ra lock $HUGO false
  sleep 70
  ra login $HUGO "$pw_hugo"
  ra signin $HUGO >/dev/null
  ok "3e unlocking lets them in again" test "$(me_status $HUGO)" = 200

  say "--- proof 4 (second half): Mia deleted"
  ok "4b before: Mia is in the open registration" test "$(entry_count "$reg")" = 1
  ra delete $MIA
  took=$(wait_for 150 registration_empty "$reg") && ok "4c deleting her removes her from the open registration ($took)" true ||
    ok "4c deleting her removes her from the open registration ($took)" false
  ok "4d the finished race names her index for \"Deleted player\"" grep -q "\"$cid\":\[0\]" <<<"$(ra race $HUGO GET "/api/races/deleted-racers?clientRaceIds=$cid" | body)"
  ok "4e ... and still verifies identically" grep -q '"identical":true' <<<"$(ra race admin POST "/api/races/$key/verify" '{}' | body)"
  not_driven "4f the result screen and the race history DRAWING \"Deleted player\" (no browser in this rehearsal; the screens read the answer of 4d — client tests ResultScreen.website and RaceHistory)"
}

operations() {
  say "--- proof 6: ports, update, backup, status, uninstall"
  ok "6a nothing of the race binds 80/443" on_server bash -c '! docker ps --filter label=com.docker.compose.project=racearena --format "{{.Ports}}" | grep -qE ":(80|443)->"'
  ok "6b racearena backup" on_server racearena backup
  ok "6c racearena status" on_server racearena status
  ok "6d racearena update (B)" on_server racearena update "$REF_B"
  ok "6e the mode is still website" on_server grep -qx website /etc/racearena/mode
  ok "6f the route file is still current" on_server racearena route status
  ok "6g the website is unchanged by the race (except its route file)" test "$(website_print)" = "$WEBSITE_PRINT"
  ok "6h racearena uninstall" on_server bash -c "printf '$DOMAIN\n' | racearena uninstall >/root/race-uninstall.log 2>&1"
  ok "6i the race's route file is gone" on_server bash -c '[ ! -e /etc/seasonal/routes/race.conf ] && [ ! -e /opt/seasonal-entertainment/deploy/site/routes/race.caddy ]'
  ok "6j every website file byte-identical after the uninstall" test "$(website_print)" = "$WEBSITE_PRINT"
  website_checks
}

if [[ "${RESUME:-0}" == 1 ]]; then
  say "=== resuming on the kept server (website $WEB_SHA, mode $MODE; race $RACE_SHA)"
  on_server bash -c "rm -rf /root/race.git /root/race-b /root/race.bundle"
else
  website_install
fi
WEBSITE_PRINT=$(website_print)
race_copy
race_install
proofs
operations
say "website: $WEB_SHA ($WEB_REF); race: $RACE_SHA; mode $MODE; results: $RESULTS"
if [[ $FAILED == 1 ]]; then say "rehearsal ($MODE): FAILED"; exit 1; fi
say "rehearsal ($MODE): all checks passed"
