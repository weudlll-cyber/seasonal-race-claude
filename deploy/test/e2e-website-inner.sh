#!/usr/bin/env bash
# ============================================================
# File:        e2e-website-inner.sh
# Path:        deploy/test/e2e-website-inner.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 5b (2026-11-11)
# Description: The website-mode install end to end, run INSIDE the throwaway Ubuntu 24.04 machine that
#              deploy/test/e2e-website.sh starts (systemd, its own Docker). It plays the website's
#              server: FAKE website markers (/etc/seasonal), the website itself as a container
#              answering as "site" (scripts/website-standin.mjs --site), and its proxy — nginx on the
#              host or Caddy in a container, ONE per run — whose configuration includes the routes
#              folder. Then the REAL install.sh, as a server's operator would run it, and the checks:
#              install, a member signs in through the proxy, status, backup, update keeps the mode,
#              uninstall leaves the fake website's files byte-identical.
#
# Usage (inside the machine): bash e2e-website-inner.sh nginx|caddy <refA> <refB>
#   /src/repo.git   a bare copy of the repository holding both refs (the install clones it)
#   /e2e            deploy/ of the version under test (install.sh is run from here)
# ============================================================
set -uo pipefail

VARIANT="$1" REF_A="$2" REF_B="$3"
NODE_IMAGE=node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1   # the app's own base
CADDY_IMAGE=caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f        # 2.11.7
SITE_ORIGIN=http://seasonal.test
RESULTS=/root/results.txt
: >"$RESULTS"
pass() { printf 'PASS  %s\n' "$*" | tee -a "$RESULTS"; }
fail() { printf 'FAIL  %s\n' "$*" | tee -a "$RESULTS"; }
check() { local name="$1"; shift; if "$@" >>/root/checks.log 2>&1; then pass "$name"; else fail "$name"; fi; }

until docker info >/dev/null 2>&1; do sleep 1; done

echo "── the fake website ($VARIANT)"
mkdir -p /etc/seasonal/routes /etc/seasonal-site
printf '3800\n' >/etc/seasonal/site-local-port
# The website's sync token: root-only, one for all games. Generated for this run; never printed.
( umask 077; openssl rand -hex 32 >/etc/seasonal/games-sync-token )
git -C /src/repo.git show "$REF_A:scripts/website-standin.mjs" >/etc/seasonal-site/website-standin.mjs
docker network create seasonal_site >/dev/null
docker run -d --name site --network seasonal_site --network-alias site -p 127.0.0.1:3800:3800 \
  -v /etc/seasonal-site:/s:ro -v /etc/seasonal/games-sync-token:/run/token:ro "$NODE_IMAGE" \
  node /s/website-standin.mjs --site --port=3800 --host=0.0.0.0 --token-file=/run/token >/dev/null
if [[ "$VARIANT" == nginx ]]; then
  rm -f /etc/nginx/sites-enabled/default
  cat >/etc/nginx/sites-enabled/seasonal <<'EOF'
server {
    listen 80 default_server;
    server_name seasonal.test;
    include /etc/seasonal/routes/*.conf;
    location / { proxy_pass http://127.0.0.1:3800; proxy_set_header Host $host; }
}
EOF
  systemctl enable --now nginx >/dev/null 2>&1
  systemctl reload nginx
else
  cat >/etc/seasonal-site/Caddyfile <<'EOF'
{
	auto_https off
}
:80 {
	import /etc/seasonal/routes/*.caddy
	handle {
		reverse_proxy site:3800
	}
}
EOF
  docker run -d --name seasonal-caddy --network seasonal_site -p 80:80 \
    -v /etc/seasonal/routes:/etc/seasonal/routes:ro -v /etc/seasonal-site/Caddyfile:/etc/caddy/Caddyfile:ro \
    "$CADDY_IMAGE" >/dev/null
fi
sleep 3
fingerprint() { find /etc/seasonal /etc/seasonal-site /etc/nginx -type f -print0 2>/dev/null | sort -z | xargs -0 sha256sum; }
fingerprint >/root/website-before.sha
check "the fake website answers through its proxy" bash -c "curl -fsS http://127.0.0.1/ | grep -q 'Website stand-in'"

echo "── install.sh: the mode is offered (the markers are here), the team is the default"
# Enter twice: "inside Seasonal Entertainment? [Y/n]" and the team.
printf '\n\n' | RA_INSTALL_REPO_URL=/src/repo.git bash /e2e/install.sh --ref "$REF_A" --site-origin "$SITE_ORIGIN" >/root/install.log 2>&1
check "install.sh exits 0" test $? -eq 0
tail -n 14 /root/install.log | tee -a "$RESULTS"
check "the mode is stored: website" grep -qx website /etc/racearena/mode
check "the route file is in the website's routes folder, 0600" bash -c "ls /etc/seasonal/routes/racearena.* && [ \"\$(stat -c %a /etc/seasonal/routes/racearena.*)\" = 600 ]"
check "the proxy secret is 0400 and the app's own" bash -c "[ \"\$(stat -c '%a %u' /etc/racearena/website/proxy-secret)\" = '400 1000' ]"
check "the sync token copy is 0400 and the app's own" bash -c "[ \"\$(stat -c '%a %u' /etc/racearena/website/sync-token)\" = '400 1000' ]"
check "no Caddy of the race runs" bash -c "[ -z \"\$(docker ps -q --filter label=com.docker.compose.project=racearena --filter label=com.docker.compose.service=caddy)\" ]"
check "the race binds neither 80 nor 443" bash -c "! docker ps --filter label=com.docker.compose.project=racearena --format '{{.Ports}}' | grep -qE ':(80|443)->'"
if [[ "$VARIANT" == nginx ]]; then
  check "nginx mode: the app is published on 127.0.0.1 only" bash -c "docker ps --filter label=com.docker.compose.project=racearena --format '{{.Ports}}' | grep -qE '^127\.0\.0\.1:39[0-9]{2}->4000/tcp$'"
else
  check "Caddy mode: the app publishes no port, the website's Caddy joined the race's network" bash -c "[ -z \"\$(docker port racearena-app-1)\" ] && docker network inspect -f '{{range .Containers}}{{.Name}} {{end}}' racearena_default | grep -qw seasonal-caddy"
fi
check "the trusted proxy is the race's own subnet" grep -qx 'RA_WEBSITE_TRUSTED_PROXIES=172.30.250.0/24' /etc/racearena/racearena.env
check "no secret in the install's output" bash -c "! grep -qF \"\$(cat /etc/racearena/website/proxy-secret)\" /root/install.log && ! grep -qF \"\$(cat /etc/seasonal/games-sync-token)\" /root/install.log"

# A member signs in THROUGH THE PROXY: the website's page sets its cookie, the route asks the
# website who it is, the race signs them in.
signin_as() {
  rm -f /root/jar
  curl -fsS -c /root/jar -b /root/jar -L -o /dev/null "http://127.0.0.1/_standin/as/$1" &&
    curl -fsS -b /root/jar http://127.0.0.1/games/race/api/auth/me
}
echo "── a member signs in through the proxy"
check "a member signs in through the proxy (Mia Member, a player)" bash -c "$(declare -f signin_as); signin_as member | grep -q '\"displayName\":\"Mia Member\"'"
check "a host signs in through the proxy (an operator of the team)" bash -c "$(declare -f signin_as); signin_as host | grep -q '\"role\":\"operator\"'"
check "the race's app is reached under /games/race/ and nowhere else" bash -c "curl -fsS http://127.0.0.1/games/race/api/health | grep -q '\"status\":\"ok\"' && ! curl -fsS http://127.0.0.1/api/health 2>/dev/null | grep -q '\"status\":\"ok\"'"

echo "── status"
racearena status >/root/status.log 2>&1
check "racearena status exits 0" test $? -eq 0
check "status names the mode and the route file's state" bash -c "grep -q 'website mode' /root/status.log && grep -q 'route file: .* current' /root/status.log"

echo "── backup"
check "racearena backup" racearena backup
check "the archive exists" bash -c "ls /var/backups/racearena/racearena-backup-*.tar"

echo "── update keeps the mode"
check "racearena update $REF_B" racearena update "$REF_B"
check "the mode is still website" grep -qx website /etc/racearena/mode
check "the route file is still current after the update" racearena route status
check "a member still signs in after the update" bash -c "$(declare -f signin_as); signin_as member | grep -q '\"displayName\":\"Mia Member\"'"
check "update did not start a Caddy of the race" bash -c "[ -z \"\$(docker ps -q --filter label=com.docker.compose.project=racearena --filter label=com.docker.compose.service=caddy)\" ]"

echo "── uninstall leaves the website as it was"
printf 'seasonal.test\n' | racearena uninstall >/root/uninstall.log 2>&1
check "racearena uninstall exits 0" test $? -eq 0
fingerprint >/root/website-after.sha
check "every file of the fake website is byte-identical (route file gone)" cmp /root/website-before.sha /root/website-after.sha
check "no container of the race is left" bash -c "[ -z \"\$(docker ps -aq --filter label=com.docker.compose.project=racearena)\" ]"
check "the website still answers through its proxy" bash -c "curl -fsS http://127.0.0.1/ | grep -q 'Website stand-in'"
check "the race's path no longer reaches anything of the race" bash -c "! curl -fsS http://127.0.0.1/games/race/api/health 2>/dev/null | grep -q '\"status\":\"ok\"'"
check "the data and the backups are KEPT" bash -c "[ -d /var/lib/racearena ] && ls /var/backups/racearena/racearena-backup-*.tar"

echo
echo "summary $VARIANT: $(grep -c '^PASS' "$RESULTS") passed, $(grep -c '^FAIL' "$RESULTS") failed"
