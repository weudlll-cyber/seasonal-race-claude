#!/usr/bin/env bash
# ============================================================
# File:        e2e-local.sh
# Path:        deploy/test/e2e-local.sh
# Project:     RaceArena — VPS-INSTALL-1 (2026-10-07)
# Description: The production stack end to end on a local Docker, started EXACTLY as install.sh
#              starts it — the same three settings files written the same way, then the same
#              `racearena` commands (start, first-admin, verify-signin, backup, restore, update) —
#              with two differences a machine without a public name needs: Caddy signs for itself
#              (`tls internal`, as PROXY-PROBE-1 did) and the name is `racearena.test`.
#
# Usage: bash e2e-local.sh <e2eRoot> <repoClone> <refA> <refB> <refC>
#   <repoClone>  a git repository holding the three refs; it becomes the checkout's `origin`
#   <refA>       the version installed first
#   <refB>       a newer one whose update must run a migration (a test migration, `e2e-test-1`)
#   <refC>       a version whose app can never become healthy — its update must roll back by itself
# Run from Git Bash with Docker; it publishes 80 and 443 on this machine, so both must be free.
# Everything it creates is under <e2eRoot> or carries the compose project name `racearena`.
# ============================================================
set -uo pipefail

E2E="$1" CLONE="$2" REF_A="$3" REF_B="$4" REF_C="$5"
# Windows form (pwd -W) under Git Bash: node is a Windows program and, with path conversion off
# (MSYS_NO_PATHCONV below), would read /c/tmp/… as C:c	mp….
HERE="$(cd "$(dirname "$0")" && { pwd -W 2>/dev/null || pwd; })"
DOMAIN=racearena.test
ADMIN=e2e-admin
# A test-only password, held in memory and piped; never written to disk.
ADMIN_PW="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))")"

export RA_HOME="$E2E/home" RA_ETC="$E2E/etc" RA_DATA="$E2E/data" RA_BACKUPS="$E2E/backups"
export MSYS_NO_PATHCONV=1
mkdir -p "$E2E"
RESULTS="$E2E/results.txt"
: >"$RESULTS"

pass() { printf 'PASS  %s\n' "$*" | tee -a "$RESULTS"; }
fail() { printf 'FAIL  %s\n' "$*" | tee -a "$RESULTS"; }
check() { local name="$1"; shift; if "$@"; then pass "$name"; else fail "$name"; fi; }
ca_file() { docker exec racearena-caddy-1 cat /data/caddy/pki/authorities/local/root.crt >"$E2E/caddy-root.crt" 2>/dev/null; echo "$E2E/caddy-root.crt"; }
visitor() { node "$HERE/e2e-check.mjs" "$DOMAIN" "$(ca_file)" "$@"; }

# ── the layout install.sh step 5 makes, written the way it writes it ─────────────────────────────
mkdir -p "$RA_ETC/state" "$RA_DATA" "$RA_BACKUPS"
git clone --quiet "$CLONE" "$RA_HOME"
git -C "$RA_HOME" checkout --quiet --detach "$REF_A"
{
  printf 'RA_PUBLIC_ORIGIN=https://%s\n' "$DOMAIN"
  printf 'RA_SESSION_SECRET=%s\n' "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  printf 'RA_BOOTSTRAP_TOKEN=%s\n' "$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
} >"$RA_ETC/racearena.env"
sed -e "s|{{DOMAIN}}|$DOMAIN|" -e "s|{{EMAIL}}|e2e@$DOMAIN|" -e 's|{{TLS_LINE}}|tls internal|' \
  "$RA_HOME/deploy/Caddyfile.template" >"$RA_ETC/Caddyfile"
printf 'RA_DATA_HOST=%s\nRA_BACKUP_HOST=%s\nRA_ENV_FILE=%s\nRA_CADDYFILE=%s\n' \
  "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/racearena.env" "$RA_ETC/Caddyfile" >"$RA_ETC/compose.env"
# install.sh installs racearena to /usr/local/bin, a COPY: the checkout changes under it during an
# update, and bash reads a script while it runs it. The test runs a copy for the same reason.
mkdir -p "$E2E/bin"
cp "$RA_HOME/deploy/racearena" "$E2E/bin/racearena"
RACEARENA=(bash "$E2E/bin/racearena")

echo "── install.sh step 6: start, first admin, sign-in over https"
check "racearena start: both services up and healthy" "${RACEARENA[@]}" start
check "first admin created through racearena first-admin" bash -c "printf '%s\n' '$ADMIN_PW' | ${RACEARENA[*]} first-admin --user $ADMIN"
check "the one-time token is removed from the settings file" bash -c "! grep -q '^RA_BOOTSTRAP_TOKEN=' '$RA_ETC/racearena.env'"
check "setup is refused once the admin exists" visitor setup-refused
check "racearena verify-signin works through https" bash -c "printf '%s\n' '$ADMIN_PW' | ${RACEARENA[*]} verify-signin --user $ADMIN"
check "a visitor's sign-in sets a Secure cookie" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' cookie $ADMIN"

echo "── only 80 and 443 are published"
docker ps --filter label=com.docker.compose.project=racearena --format '{{.Names}}: {{.Ports}}' | tee -a "$RESULTS"
check "the app publishes no host port" bash -c "[ -z \"\$(docker port racearena-app-1)\" ]"
check "caddy publishes exactly 80 and 443" bash -c "[ \"\$(docker port racearena-caddy-1 | sed 's/ ->.*//' | sort -u | tr '\n' ' ')\" = '443/tcp 80/tcp ' ]"

echo "── a race stored and read back"
KEY="$(printf '%s\n' "$ADMIN_PW" | visitor store-race "$ADMIN")"
check "a race is stored over https ($KEY)" test -n "$KEY"
check "the race reads back" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' read-race $ADMIN $KEY"

echo "── backup → delete the data → restore"
check "racearena backup" "${RACEARENA[@]}" backup
ARCHIVE="$(cat "$RA_ETC/state/last-backup")"
docker stop racearena-app-1 >/dev/null
find "$RA_DATA" -mindepth 1 -delete
check "the data directory is empty (deleted)" bash -c "[ -z \"\$(ls -A '$RA_DATA')\" ]"
check "racearena restore $ARCHIVE" "${RACEARENA[@]}" restore "$ARCHIVE"
check "the race is back after the restore" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' read-race $ADMIN $KEY"
check "the admin is back after the restore" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' signin $ADMIN"

echo "── racearena update A → B runs B's migration"
check "the ledger does not hold e2e-test-1 before the update" bash -c "! grep -q e2e-test-1 '$RA_DATA/migrations.json' 2>/dev/null"
check "racearena update $REF_B" "${RACEARENA[@]}" update "$REF_B"
check "the ledger holds e2e-test-1 after the update" grep -q e2e-test-1 "$RA_DATA/migrations.json"
check "the migration's own marker file exists" test -f "$RA_DATA/e2e-test-1.marker"
check "the race survives the update" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' read-race $ADMIN $KEY"

echo "── racearena update B → C (an app that never becomes healthy) rolls back by itself"
B_SHA="$(git -C "$RA_HOME" rev-parse HEAD)"
"${RACEARENA[@]}" update "$REF_C" >"$E2E/update-c.log" 2>&1
UPD_RC=$?
tail -n 6 "$E2E/update-c.log" | tee -a "$RESULTS"
check "the failed update exits non-zero" test "$UPD_RC" -ne 0
check "it says it rolled back" grep -q "ROLLED BACK" "$E2E/update-c.log"
check "the checkout is back on B" test "$(git -C "$RA_HOME" rev-parse HEAD)" = "$B_SHA"
check "the app is healthy again on B" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' read-race $ADMIN $KEY"

echo "── restarts"
docker restart racearena-app-1 racearena-caddy-1 >/dev/null
sleep 40
check "after docker restart, the app is healthy" bash -c "[ \"\$(docker inspect -f '{{.State.Health.Status}}' racearena-app-1)\" = healthy ]"
check "after docker restart, https answers" bash -c "printf '%s\n' '$ADMIN_PW' | node '$HERE/e2e-check.mjs' $DOMAIN '$(ca_file)' signin $ADMIN"
docker kill -s KILL racearena-app-1 >/dev/null
sleep 45
docker inspect -f 'after a SIGKILL of the app: status={{.State.Status}} restarts={{.RestartCount}} health={{if .State.Health}}{{.State.Health.Status}}{{end}}' racearena-app-1 | tee -a "$RESULTS"

echo "── log rotation"
for c in racearena-app-1 racearena-caddy-1; do
  docker inspect -f "$c: {{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}" "$c" | tee -a "$RESULTS"
  check "$c rotates its log at 10m × 5" bash -c "docker inspect -f '{{json .HostConfig.LogConfig}}' $c | grep -q '\"max-file\":\"5\"' && docker inspect -f '{{json .HostConfig.LogConfig}}' $c | grep -q '\"max-size\":\"10m\"'"
done

echo
echo "summary: $(grep -c '^PASS' "$RESULTS") passed, $(grep -c '^FAIL' "$RESULTS") failed — $RESULTS"
