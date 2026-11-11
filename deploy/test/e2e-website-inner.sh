#!/usr/bin/env bash
# ============================================================
# File:        e2e-website-inner.sh
# Path:        deploy/test/e2e-website-inner.sh
# Project:     RaceArena — WEBSITE-EMBED-1 pieces 5b and 5c (2026-11-11)
# Description: The website-mode install end to end, run INSIDE the throwaway Ubuntu 24.04 machine that
#              deploy/test/e2e-website.sh starts (systemd, its own Docker). It plays the website's
#              server in the website's REAL layout (piece 5c; the website facts of 2026-11-11 and the
#              way Bingo's ops/test/website-vps.sh lays it out): the record /etc/seasonal/install.conf
#              (MODE, SITE_DOMAIN, INSTALL_DIR, RACE; root only), the routes folder and the sync token,
#              the website as the compose project "seasonal-site" in /srv/site/deploy/site — its
#              service "site" being the stand-in (scripts/website-standin.mjs --site) — and its proxy:
#              host nginx including /etc/seasonal/routes/*.conf, or the project's own Caddy importing
#              /etc/caddy/routes/*.caddy (its deploy/site/routes mounted read-only). ONE proxy per run.
#              Then the REAL install.sh, as a server's operator would run it, and the checks: RACE=no
#              stops before any change, a taken subnet is refused, install, sign-in through the proxy,
#              backup, status, update keeps the mode, uninstall leaves the website byte-identical.
#
# Usage (inside the machine): bash e2e-website-inner.sh nginx|caddy <refA> <refB>
#   /src/repo.git   a bare copy of the repository holding both refs (the install clones it)
#   /e2e            deploy/ of the version under test (install.sh is run from here)
# ============================================================
set -uo pipefail

VARIANT="$1" REF_A="$2" REF_B="$3"
NODE_IMAGE=node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1   # the app's own base
CADDY_IMAGE=caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f        # 2.11.7
SITE_DIR=/srv/site
RESULTS=/root/results.txt
: >"$RESULTS"
pass() { printf 'PASS  %s\n' "$*" | tee -a "$RESULTS"; }
# FAIL-FAST by default: the first failed check ends the run (the machine is left as it is, for a look
# inside — e2e-website.sh keeps it with RA_E2E_KEEP=1). RA_E2E_ALL=1 runs every check regardless.
fail() {
  printf 'FAIL  %s\n' "$*" | tee -a "$RESULTS"
  if [[ "${RA_E2E_ALL:-0}" != 1 ]]; then
    echo "stopped at the first failure (RA_E2E_ALL=1 runs every check); the last log lines:"
    tail -n 8 /root/checks.log
    exit 1
  fi
}
check() { local name="$1"; shift; if "$@" >>/root/checks.log 2>&1; then pass "$name"; else fail "$name"; fi; }

until docker info >/dev/null 2>&1; do sleep 1; done

echo "── the fake website ($VARIANT), in its real layout"
mkdir -p /etc/seasonal/routes "$SITE_DIR/deploy/site/routes" "$SITE_DIR/standin"
chmod 755 /etc/seasonal/routes
printf '3801\n' >/etc/seasonal/site-local-port
# The website's sync token: root-only, one for all games. Generated for this run; never printed.
( umask 077; openssl rand -hex 32 >/etc/seasonal/games-sync-token )
git -C /src/repo.git show "$REF_A:scripts/website-standin.mjs" >"$SITE_DIR/standin/website-standin.mjs"
# The website's record, as its installer writes it (kv_set lines, 0600, no secrets). RACE=no first.
record() {
  ( umask 077; printf 'MODE=%s\nSITE_DOMAIN=seasonal.test\nINSTALL_DIR=%s\nRACE=%s\n' "$VARIANT" "$SITE_DIR" "$1" >/etc/seasonal/install.conf )
}
record no
PUBLISH="ports: ['127.0.0.1:3801:3800']"
[[ "$VARIANT" == caddy ]] && PUBLISH=''
cat >"$SITE_DIR/deploy/site/docker-compose.yml" <<EOF
name: seasonal-site
services:
  site:
    image: $NODE_IMAGE
    volumes: ['$SITE_DIR/standin:/s:ro', '/etc/seasonal/games-sync-token:/run/token:ro']
    command: ['node', '/s/website-standin.mjs', '--site', '--port=3800', '--host=0.0.0.0', '--token-file=/run/token']
    $PUBLISH
EOF
# The website is https, as the real one is: the race's session cookie is Secure, and the app sets
# it only on a request the proxy says came over https.
if [[ "$VARIANT" == nginx ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj /CN=seasonal.test \
    -keyout "$SITE_DIR/key.pem" -out "$SITE_DIR/cert.pem" >/dev/null 2>&1
  rm -f /etc/nginx/sites-enabled/default
  cat >/etc/nginx/sites-enabled/seasonal <<EOF
server {
    listen 443 ssl default_server;
    server_name seasonal.test;
    ssl_certificate $SITE_DIR/cert.pem;
    ssl_certificate_key $SITE_DIR/key.pem;
    include /etc/seasonal/routes/*.conf;
    location / { proxy_pass http://127.0.0.1:3801; proxy_set_header Host \$host; }
}
EOF
  nginx -t >>/root/checks.log 2>&1   # the website proxy's own verdict, for the log
  systemctl enable --now nginx >/dev/null 2>&1
  systemctl reload nginx
else
  # This website runs its own Caddy, not nginx: the machine's nginx is stopped and masked.
  systemctl mask --now nginx >/dev/null 2>&1
  cat >"$SITE_DIR/deploy/site/Caddyfile" <<'EOF'
{$SITE_DOMAIN} {
	tls internal
	import /etc/caddy/routes/*.caddy
	handle {
		reverse_proxy site:3800
	}
}
EOF
  cat >>"$SITE_DIR/deploy/site/docker-compose.yml" <<EOF
  caddy:
    image: $CADDY_IMAGE
    environment: { SITE_DOMAIN: seasonal.test }
    ports: ['443:443']
    volumes: ['./Caddyfile:/etc/caddy/Caddyfile:ro', './routes:/etc/caddy/routes:ro']
EOF
  touch "$SITE_DIR/deploy/site/routes/empty.caddy"
fi
( cd "$SITE_DIR/deploy/site" && docker compose up -d --quiet-pull >>/root/checks.log 2>&1 )
sleep 4
fingerprint() { find /etc/seasonal /etc/nginx "$SITE_DIR" -type f -print0 2>/dev/null | sort -z | xargs -0 sha256sum; }
check "the fake website answers through its proxy" bash -c "curl -k --resolve seasonal.test:443:127.0.0.1 -fsS https://seasonal.test/ | grep -q 'Website stand-in'"
if [[ "$VARIANT" == caddy ]]; then
  check "the website's proxy is its own Caddy (compose project seasonal-site), and no nginx runs" bash -c "[ -n \"\$(docker ps -q --filter label=com.docker.compose.project=seasonal-site --filter label=com.docker.compose.service=caddy)\" ] && ! systemctl is-active --quiet nginx"
fi

INSTALL=(env RA_INSTALL_REPO_URL=/src/repo.git bash /e2e/install.sh --ref "$REF_A")
echo "── RACE=no: the installer stops before anything changes"
printf '\n\n' | "${INSTALL[@]}" >/root/install-no.log 2>&1
check "RACE=no stops the install with the instruction to enable the race" bash -c "grep -q 'RACE is not yes' /root/install-no.log && grep -q -- '--race' /root/install-no.log"
check "... before any change (no /opt/racearena, no /etc/racearena, no route file)" bash -c "[ ! -e /opt/racearena ] && [ ! -e /etc/racearena ] && [ -z \"\$(ls /etc/seasonal/routes)\" ]"
record yes
fingerprint >/root/website-before.sha

echo "── a taken subnet is refused (another game's network on 172.30.251.0/24)"
docker network create --subnet 172.30.251.0/24 e2e-other-game >/dev/null
printf '\n\n' | "${INSTALL[@]}" >/root/install-subnet.log 2>&1
check "the race's subnet in use is refused, naming --subnet" bash -c "grep -q '172.30.251.0/24 is already used' /root/install-subnet.log && grep -q -- '--subnet' /root/install-subnet.log"
docker network rm e2e-other-game >/dev/null
check "... before the checkout or the settings" bash -c "[ ! -e /opt/racearena ] && [ ! -e /etc/racearena/racearena.env ]"

echo "── install.sh: the mode is offered (the markers are here), the team is the default"
# Enter twice: "inside Seasonal Entertainment? [Y/n]" and the team. No origin given: SITE_DOMAIN.
printf '\n\n' | "${INSTALL[@]}" >/root/install.log 2>&1
check "install.sh exits 0" test $? -eq 0
tail -n 14 /root/install.log | tee -a "$RESULTS"
check "the mode is stored: website" grep -qx website /etc/racearena/mode
check "the origin is https://<SITE_DOMAIN> from the website's record" grep -qx 'RA_PUBLIC_ORIGIN=https://seasonal.test' /etc/racearena/racearena.env
if [[ "$VARIANT" == nginx ]]; then ROUTE=/etc/seasonal/routes/race.conf; else ROUTE="$SITE_DIR/deploy/site/routes/race.caddy"; fi
check "the route file is $ROUTE, root's, 0600" bash -c "[ \"\$(stat -c '%a %U' $ROUTE)\" = '600 root' ]"
check "the proxy secret is 0400 and the app's own" bash -c "[ \"\$(stat -c '%a %u' /etc/racearena/website/proxy-secret)\" = '400 1000' ]"
check "the sync token copy is 0400 and the app's own" bash -c "[ \"\$(stat -c '%a %u' /etc/racearena/website/sync-token)\" = '400 1000' ]"
check "no Caddy of the race runs" bash -c "[ -z \"\$(docker ps -q --filter label=com.docker.compose.project=racearena --filter label=com.docker.compose.service=caddy)\" ]"
check "the race binds neither 80 nor 443" bash -c "! docker ps --filter label=com.docker.compose.project=racearena --format '{{.Ports}}' | grep -qE ':(80|443)->'"
check "the race's own network has its fixed subnet 172.30.251.0/24" bash -c "docker network inspect -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}' racearena_default | grep -qx 172.30.251.0/24"
check "the race's app joined the website's network seasonal-site_default (the feed at site:3800)" bash -c "docker inspect -f '{{range \$n, \$_ := .NetworkSettings.Networks}}{{\$n}} {{end}}' racearena-app-1 | grep -qw seasonal-site_default"
if [[ "$VARIANT" == nginx ]]; then
  check "nginx mode: the app is published on 127.0.0.1:3940 only" bash -c "[ \"\$(docker ps --filter label=com.docker.compose.project=racearena --format '{{.Ports}}')\" = '127.0.0.1:3940->4000/tcp' ]"
  check "nginx mode: only the race's own subnet is trusted, never the website's network" grep -qx 'RA_WEBSITE_TRUSTED_PROXIES=172.30.251.0/24' /etc/racearena/racearena.env
else
  check "Caddy mode: the app publishes no port" bash -c "[ -z \"\$(docker port racearena-app-1)\" ]"
  check "Caddy mode: the website's network is the trusted proxy" bash -c "grep -qx \"RA_WEBSITE_TRUSTED_PROXIES=\$(docker network inspect -f '{{range .IPAM.Config}}{{.Subnet}} {{end}}' seasonal-site_default | xargs | tr ' ' ',')\" /etc/racearena/racearena.env"
fi
check "no secret in the install's output" bash -c "! grep -qF \"\$(cat /etc/racearena/website/proxy-secret)\" /root/install.log && ! grep -qF \"\$(cat /etc/seasonal/games-sync-token)\" /root/install.log"

# Signing in THROUGH THE PROXY: the website's page sets its cookie, the route asks the website who it
# is, the race signs them in. Prints the race's session cookie (name=value) for the next request; the
# value is never written to a log.
SITE=(curl -k --resolve seasonal.test:443:127.0.0.1)
signin_as() {
  rm -f /root/jar
  "${SITE[@]}" -fsS -c /root/jar -o /dev/null "https://seasonal.test/_standin/as/$1" || return 1
  "${SITE[@]}" -sS -b /root/jar -D - -o /dev/null https://seasonal.test/games/race/auth/website |
    grep -i '^set-cookie:' | grep -oE '[A-Za-z_-]*ra.sid=[^;]+' | head -n 1
}
# A HOST is a director of the team: /api/auth/me names them, as an operator.
host_signs_in() {
  local sid
  sid="$(signin_as host)" && [[ -n "$sid" ]] || return 1
  "${SITE[@]}" -fsS -H "Cookie: $sid" https://seasonal.test/games/race/api/auth/me |
    grep -q '"role":"operator".*"displayName":"Hugo Host"'
}
# A MEMBER is a player, not a director (piece 3a): they have no /me. What shows they are signed in is
# the join page — a host opens a registration, and the member's view of it is "Join as Mia Member".
member_signs_in() {
  local host sid track code
  host="$(signin_as host)" && [[ -n "$host" ]] || return 1
  track="$("${SITE[@]}" -fsS -H "Cookie: $host" https://seasonal.test/games/race/api/tracks | grep -oE '"id":"[^"]+"' | head -n 1 | cut -d'"' -f4)"
  code="$("${SITE[@]}" -fsS -H "Cookie: $host" -H 'Origin: https://seasonal.test' -H 'Content-Type: application/json' \
    -d "{\"trackId\":\"$track\",\"capacity\":4,\"closesAt\":\"$(date -u -d '+30 min' +%Y-%m-%dT%H:%M:%SZ)\"}" \
    https://seasonal.test/games/race/api/registrations | grep -oE '"code":"[^"]+"' | cut -d'"' -f4)"
  [[ -n "$code" ]] || return 1
  sid="$(signin_as member)" && [[ -n "$sid" ]] || return 1
  "${SITE[@]}" -fsS -H "Cookie: $sid" "https://seasonal.test/games/race/api/join/$code" | grep -q '"member":{"displayName":"Mia Member"}'
}
echo "── signing in through the proxy"
check "a host signs in through the proxy (an operator of the team)" host_signs_in
check "a member signs in through the proxy (the join page knows Mia Member)" member_signs_in
check "the race's app is reached under /games/race/ and nowhere else" bash -c "curl -k --resolve seasonal.test:443:127.0.0.1 -fsS https://seasonal.test/games/race/api/health | grep -q '\"status\":\"ok\"' && ! curl -k --resolve seasonal.test:443:127.0.0.1 -fsS https://seasonal.test/api/health 2>/dev/null | grep -q '\"status\":\"ok\"'"

echo "── backup"
check "racearena backup" racearena backup
check "the archive exists" bash -c "ls /var/backups/racearena/racearena-backup-*.tar"

# Status after the first backup: its check needs a recent one, as on a running server.
echo "── status"
racearena status >/root/status.log 2>&1
check "racearena status exits 0" test $? -eq 0
check "status names the mode and the route file's state" bash -c "grep -q 'website mode' /root/status.log && grep -q 'route file: .* current' /root/status.log"

echo "── update keeps the mode"
check "racearena update $REF_B" racearena update "$REF_B"
check "the mode is still website" grep -qx website /etc/racearena/mode
check "the route file is still current after the update" racearena route status
check "a member still signs in after the update" member_signs_in
check "update did not start a Caddy of the race" bash -c "[ -z \"\$(docker ps -q --filter label=com.docker.compose.project=racearena --filter label=com.docker.compose.service=caddy)\" ]"

echo "── uninstall leaves the website as it was"
printf 'seasonal.test\n' | racearena uninstall >/root/uninstall.log 2>&1
check "racearena uninstall exits 0" test $? -eq 0
fingerprint >/root/website-after.sha
check "every file of the fake website is byte-identical (route file gone)" cmp /root/website-before.sha /root/website-after.sha
check "no container of the race is left" bash -c "[ -z \"\$(docker ps -aq --filter label=com.docker.compose.project=racearena)\" ]"
check "the website still answers through its proxy" bash -c "curl -k --resolve seasonal.test:443:127.0.0.1 -fsS https://seasonal.test/ | grep -q 'Website stand-in'"
check "the race's path no longer reaches anything of the race" bash -c "! curl -k --resolve seasonal.test:443:127.0.0.1 -fsS https://seasonal.test/games/race/api/health 2>/dev/null | grep -q '\"status\":\"ok\"'"
check "the data and the backups are KEPT" bash -c "[ -d /var/lib/racearena ] && ls /var/backups/racearena/racearena-backup-*.tar"

echo
echo "summary $VARIANT: $(grep -c '^PASS' "$RESULTS") passed, $(grep -c '^FAIL' "$RESULTS") failed"
