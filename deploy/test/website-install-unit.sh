#!/usr/bin/env bash
# ============================================================
# File:        website-install-unit.sh
# Path:        deploy/test/website-install-unit.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 5c (2026-11-11)
# Description: install.sh's website-mode decisions, in seconds and without a server: the script's
#              functions are loaded (everything but its last line, `main "$@"`), docker and ss are
#              stubbed, and each case runs in its own subshell. It covers what piece 5c changed:
#                2. the website's record /etc/seasonal/install.conf — RACE=yes required, SITE_DOMAIN
#                   gives the origin (--site-origin only an override), MODE cross-checked against
#                   what runs, read WITHOUT sourcing and never printed;
#                3. the website's container "site" of compose project seasonal-site and its
#                   network (seasonal-site_default, else its only one, else --site-network); that
#                   network trusted in Caddy mode only;
#                4. the race's fixed port 3940 and subnet 172.30.251.0/24, refused when taken, a
#                   re-run's values kept, flags overriding;
#                5. the route file's place: race.conf in /etc/seasonal/routes, race.caddy in
#                   <INSTALL_DIR>/deploy/site/routes.
#              The whole install, behind real proxies, is deploy/test/e2e-website.sh.
#
# Usage: bash website-install-unit.sh [install.sh]   (a sabotage run passes a changed copy)
# ============================================================
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
INSTALL="${1:-$HERE/../install.sh}"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
FAILS=0 COUNT=0
pass() { COUNT=$((COUNT + 1)); printf 'PASS  %s\n' "$*"; }
fail() { COUNT=$((COUNT + 1)); FAILS=$((FAILS + 1)); printf 'FAIL  %s\n' "$*"; }

# One case: a fresh copy of the script's functions, the stubs, a fake /etc/seasonal; the body runs
# in a subshell and prints what it decided; `die` ends that subshell only.
case_run() { # case_run <body>  → stdout+stderr of the body, and its exit status
  (
    set +e
    # shellcheck disable=SC1090
    source <(sed '$d' "$INSTALL")
    set +e
    SEASONAL="$T/seasonal" RA_ETC="$T/etc" CONF="$T/etc/install.conf"
    mkdir -p "$SEASONAL/routes" "$RA_ETC"
    printf '3801\n' >"$SEASONAL/site-local-port"
    declare -gA STUB_NET=() # network id → "name subnets…"
    docker() {
      case "$*" in
        *service=caddy*) printf '%s\n' "${STUB_CADDY:-}" ;;
        *service=site*) printf '%s\n' "${STUB_SITE:-}" ;;
        "ps --filter label=com.docker.compose.project=racearena"*) : ;;
        "inspect -f"*) printf '%s\n' "${STUB_CTR_NETWORKS:-}" ;;
        "network ls -q") printf '%s\n' "${!STUB_NET[@]}" ;;
        "network inspect -f {{.Name}}"*) printf '%s\n' "${STUB_NET[${*: -1}]}" ;;
        "network inspect -f {{range .IPAM.Config}}"*) printf '%s\n' "${STUB_SITE_SUBNETS:-}" ;;
        *) printf 'unexpected docker %s\n' "$*" >&2; return 1 ;;
      esac
    }
    ss() {
      case "$*" in
        *"sport = :80 or"*) [[ "${STUB_NGINX:-0}" == 1 ]] && echo 'LISTEN 0 511 0.0.0.0:80 0.0.0.0:* users:(("nginx",pid=1,fd=6))' ;;
        *"sport = :${STUB_BUSY_PORT:-none}"*) echo "LISTEN 0 511 127.0.0.1:$STUB_BUSY_PORT 0.0.0.0:*" ;;
      esac
      return 0
    }
    eval "$1"
  ) 2>&1
}
record() { printf '%s\n' "$@" >"$T/seasonal/install.conf"; chmod 600 "$T/seasonal/install.conf"; }
expect() { # expect <name> <output> <pattern> [want-exit] [got-exit]
  if [[ "$2" =~ $3 ]]; then pass "$1"; else fail "$1 — got: $(tail -n 2 <<<"$2" | tr '\n' ' ')"; fi
}
mkdir -p "$T/seasonal"

echo "── 2 · the website's record (/etc/seasonal/install.conf)"
record MODE=nginx SITE_DOMAIN=seasonal.example INSTALL_DIR=/srv/site RACE=no
out="$(case_run 'website_record; echo "REACHED"')"
expect "RACE=no stops with the instruction to enable the race, before anything" "$out" 'RACE is not yes.*--race'
[[ "$out" != *REACHED* ]] && pass "... and nothing after it runs" || fail "... and nothing after it runs"
record MODE=nginx SITE_DOMAIN=seasonal.example INSTALL_DIR=/srv/site
out="$(case_run 'website_record; echo REACHED')"
expect "no RACE line stops the same way" "$out" 'RACE is not yes'
record MODE=nginx SITE_DOMAIN=seasonal.example INSTALL_DIR=/srv/site RACE=yes
out="$(case_run 'website_record; echo "ORIGIN=$SITE_ORIGIN MODE=$SITE_MODE DIR=$SITE_DIR"')"
expect "SITE_DOMAIN gives the origin https://<SITE_DOMAIN>; MODE and INSTALL_DIR are read" "$out" 'ORIGIN=https://seasonal.example MODE=nginx DIR=/srv/site'
out="$(case_run 'SITE_ORIGIN=https://other.example; website_record; echo "ORIGIN=$SITE_ORIGIN"')"
expect "--site-origin is an override" "$out" 'ORIGIN=https://other.example'
record MODE=nginx SITE_DOMAIN=seasonal.example RACE=yes "ADMIN_EMAIL=never-printed@example.org" "X=\$(touch $T/sourced)" 'RACE=yes'
out="$(case_run 'website_record; website_summary >/dev/null; echo done')"
[[ ! -e "$T/sourced" ]] && pass "the record is never sourced (a command in it does not run)" || fail "the record is never sourced (a command in it does not run)"
[[ "$out" != *never-printed* ]] && pass "... and nothing of it is printed" || fail "... and nothing of it is printed"
record MODE=caddy SITE_DOMAIN=seasonal.example INSTALL_DIR=/srv/site RACE=yes
out="$(case_run 'STUB_NGINX=1 STUB_SITE=seasonal-site-site-1; website_record; website_detect; echo REACHED')"
expect "MODE=caddy on a server where nginx holds 80/443 stops (the cross-check)" "$out" 'recorded caddy mode.*looks like nginx'
record MODE=nginx SITE_DOMAIN=seasonal.example RACE=yes
out="$(case_run 'STUB_CADDY=seasonal-site-caddy-1 STUB_SITE=seasonal-site-site-1; website_record; website_detect; echo REACHED')"
expect "MODE=nginx where the website's Caddy runs stops too" "$out" 'recorded nginx mode.*looks like caddy'

echo "── 3 · the website's container and network"
record MODE=nginx SITE_DOMAIN=seasonal.example RACE=yes
out="$(case_run 'STUB_NGINX=1 STUB_SITE=seasonal-site-site-1 STUB_CTR_NETWORKS="other seasonal-site_default "; website_record; website_detect; echo "NET=$SITE_NETWORK"')"
expect "the site container's seasonal-site_default is chosen" "$out" 'NET=seasonal-site_default'
out="$(case_run 'STUB_NGINX=1 STUB_SITE=seasonal-site-site-1 STUB_CTR_NETWORKS="only_net "; website_record; website_detect; echo "NET=$SITE_NETWORK"')"
expect "else its only network" "$out" 'NET=only_net'
out="$(case_run 'STUB_NGINX=1 STUB_SITE=seasonal-site-site-1 STUB_CTR_NETWORKS="a b "; website_record; website_detect; echo REACHED')"
expect "several networks and none named: stop, naming --site-network" "$out" '--site-network'
out="$(case_run 'STUB_NGINX=1 STUB_SITE=seasonal-site-site-1 STUB_CTR_NETWORKS="a b "; SITE_NETWORK=b; website_record; website_detect; echo "NET=$SITE_NETWORK"')"
expect "--site-network picks one of them" "$out" 'NET=b'
out="$(case_run 'STUB_NGINX=1; website_record; website_detect; echo REACHED')"
expect "no container \"site\" of seasonal-site: stop" "$out" 'container "site".*not running'
out="$(case_run 'STUB_NGINX=1 STUB_SITE=s STUB_CTR_NETWORKS="seasonal-site_default " STUB_SITE_SUBNETS="172.18.0.0/16 "; website_record; website_detect; website_port_and_subnet; website_trust; echo "TRUSTED=$TRUSTED"')"
expect "nginx mode trusts the race's own subnet, never the website's network" "$out" 'TRUSTED=172\.30\.251\.0/24$'
record MODE=caddy SITE_DOMAIN=seasonal.example INSTALL_DIR=/srv/site RACE=yes
out="$(case_run 'STUB_CADDY=c STUB_SITE=s STUB_CTR_NETWORKS="seasonal-site_default " STUB_SITE_SUBNETS="172.18.0.0/16 fd00::/64 "; website_record; website_detect; website_port_and_subnet; website_trust; echo "TRUSTED=$TRUSTED"')"
expect "Caddy mode trusts every subnet of the website's network (its Caddy reaches the race there)" "$out" 'TRUSTED=172\.18\.0\.0/16,fd00::/64$'

echo "── 4 · the race's port and subnet"
record MODE=nginx SITE_DOMAIN=seasonal.example RACE=yes
out="$(case_run 'SITE_MODE=nginx; website_port_and_subnet; echo "PORT=$PORT SUBNET=$SUBNET"')"
expect "the defaults: 3940 and 172.30.251.0/24" "$out" 'PORT=3940 SUBNET=172\.30\.251\.0/24'
out="$(case_run 'SITE_MODE=nginx STUB_BUSY_PORT=3940; website_port_and_subnet; echo REACHED')"
expect "port 3940 in use: stop, naming --port" "$out" 'port 3940 is in use.*--port'
out="$(case_run 'SITE_MODE=nginx; STUB_NET[n1]="minigames 172.30.251.0/24 "; website_port_and_subnet; echo REACHED')"
expect "the subnet in use by another network: stop, naming --subnet" "$out" "172\.30\.251\.0/24 is already used by the Docker network 'minigames'.*--subnet"
out="$(case_run 'SITE_MODE=nginx; STUB_NET[n1]="racearena_default 172.30.251.0/24 "; website_port_and_subnet; echo "SUBNET=$SUBNET"')"
expect "the race's own network on it is not a conflict (a re-run)" "$out" 'SUBNET=172\.30\.251\.0/24'
out="$(case_run 'SITE_MODE=nginx; printf "LOCAL_PORT=3955\nSUBNET=172.30.252.0/24\n" >"$RA_ETC/website.conf"; website_port_and_subnet; echo "PORT=$PORT SUBNET=$SUBNET"')"
expect "a re-run keeps the recorded port and subnet" "$out" 'PORT=3955 SUBNET=172\.30\.252\.0/24'
out="$(case_run 'SITE_MODE=nginx PORT=3960; printf "LOCAL_PORT=3955\n" >"$RA_ETC/website.conf"; website_port_and_subnet; echo "PORT=$PORT"')"
expect "--port overrides the recorded one" "$out" 'PORT=3960'

echo "── 5 · the route file's place"
out="$(case_run 'PROXY=nginx PORT=3940 SITE_PORT=3801; website_routes; echo "$ROUTES_DIR/$ROUTE_FILE $RACE_UPSTREAM $AUTH_UPSTREAM"')"
expect "nginx: /etc/seasonal/routes/race.conf, the race on 127.0.0.1:3940, authorize on the site-local-port" "$out" '/seasonal/routes/race\.conf 127\.0\.0\.1:3940 127\.0\.0\.1:3801'
out="$(case_run 'PROXY=caddy SITE_DIR=/srv/site PROXY_CONTAINER=c; website_routes; echo "$ROUTES_DIR/$ROUTE_FILE $RACE_UPSTREAM $AUTH_UPSTREAM"')"
expect "Caddy: <INSTALL_DIR>/deploy/site/routes/race.caddy, the race as racearena:4000, authorize at site:3800" "$out" '^/srv/site/deploy/site/routes/race\.caddy racearena:4000 site:3800'
out="$(case_run 'PROXY=caddy SITE_DIR=""; website_routes; echo REACHED')"
expect "Caddy without INSTALL_DIR in the record: stop" "$out" 'no INSTALL_DIR'

echo "summary: $((COUNT - FAILS)) passed, $FAILS failed"
exit $((FAILS > 0))
