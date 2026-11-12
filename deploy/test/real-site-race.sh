#!/usr/bin/env bash
# ============================================================
# File:        real-site-race.sh
# Path:        deploy/test/real-site-race.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 6 (2026-11-11), the rehearsal
# Description: Inside the rehearsal's server: the REAL website's accounts and the race's API, by curl,
#              through https://example.org with the test's Pebble root — what a website admin and
#              the website's members do in ./real-site.sh. The website side is driven the way Seasonal
#              Bingo Royale's ops/test/real-site-admin.sh drives it (read-only reference): the
#              website's own pre-login, login and registration with the key its client derives from a
#              password (computed in the site container, with the site's own crypto), the test admin's
#              2FA set up on its first login, and the admin's user actions — "may host" for the race
#              (POST /api/admin/users/<id>/game-host {game: "race"}), lock, unlock, delete. The race side
#              is the race's own routes under /games/race, with the member's website session in the
#              same cookie jar (the website's proxy asks the website who they are). Cookie jars and
#              the admin's TOTP secret stay in /etc/seasonal-test/race (mode 700). Test only.
#              WEBSITE-EXTRAS-1: `page` reads any page of the site with a member's jar (headers to a
#              file the caller names), and `open-rounds-check` reads the race's open-rounds list as
#              the website's server would (no cookie, through the website's proxy) and runs it
#              through the website's OWN checker (its server/src/games/openRoundsContract.js, in the
#              site container), printing the ids it accepts.
#
# Usage: race-admin.sh <command> [args]   (TEST_ADMIN_PASSWORD in the environment for the admin)
# ============================================================
set -euo pipefail

SITE=https://example.org
RACE=$SITE/games/race
DIR=/etc/seasonal-test/race
ROOT_CA=/etc/seasonal-test/pebble-root.pem
install -d -m 700 "$DIR"

# json PATH: a field of the JSON on stdin (a.b nested, a.0 an index), empty when missing.
json() {
  python3 -I -c '
import json, sys
v = json.load(sys.stdin)
for k in sys.argv[1].split("."):
    v = v[int(k)] if isinstance(v, list) else (v or {}).get(k)
print("" if v is None else (json.dumps(v) if isinstance(v, (dict, list)) else v))' "$1"
}

# The site's own crypto and TOTP, in its container (as the website's checks and Bingo's do).
in_site() { docker exec -i -w /app seasonal-site-site-1 node --input-type=module -e "$@"; }
new_salt() { in_site "import { newSalt } from '@seasonal-entertainment/shared/crypto.js'; console.log(await newSalt());"; }
auth_key() {
  in_site "import { deriveAccountKeys } from '@seasonal-entertainment/shared/crypto.js';
    let password = ''; for await (const chunk of process.stdin) password += chunk;
    console.log((await deriveAccountKeys(password, process.argv[1])).authKey);" "$1"
}
totp() {
  in_site "import { codeForStep, stepAt } from '/app/server/src/twofa/totp.js';
    console.log(codeForStep(process.argv[1], stepAt(Date.now())));" "$(cat "$DIR/admin-totp")"
}

# site JAR METHOD PATH [JSON]: the website's API as its pages call it.
site() {
  local data=()
  [[ -z ${4:-} ]] || data=(--data "$4")
  curl -sS --max-time 30 --cacert "$ROOT_CA" -b "$1" -c "$1" -X "$2" -H 'Content-Type: application/json' \
    -H "Origin: $SITE" "${data[@]}" "$SITE/api$3"
}

login() { # login NAME PASSWORD → a fresh website session in $DIR/NAME.jar
  local jar=$DIR/$1.jar salt key answer
  rm -f "$jar"
  salt=$(site "$jar" POST /auth/prelogin "{\"username\":\"$1\"}" | json salt)
  key=$(printf '%s' "$2" | auth_key "$salt")
  answer=$(site "$jar" POST /auth/login "{\"username\":\"$1\",\"authKey\":\"$key\"}")
  if [[ $(json twoFactorRequired <<<"$answer") == True ]]; then
    answer=$(site "$jar" POST /2fa/login "{\"code\":\"$(totp)\"}")
  fi
  [[ $(json ok <<<"$answer") == True ]] || { echo "login $1 failed: $answer" >&2; exit 1; }
  AUTH_KEY=$key
}

# The test admin: 2FA set up on the first login (every staff action needs it); an open session is
# kept, since a TOTP code is taken once and two logins in one 30-second step would fail.
admin_login() {
  local secret answer
  [[ $(site "$DIR/admin.jar" GET /auth/session 2>/dev/null | json user.username) != admin ]] || return 0
  login admin "${TEST_ADMIN_PASSWORD:?the test admin password}"
  [[ ! -s $DIR/admin-totp ]] || return 0
  secret=$(site "$DIR/admin.jar" POST /2fa/setup "{\"authKey\":\"$AUTH_KEY\"}" | json secret)
  (umask 077 && echo "$secret" >"$DIR/admin-totp")
  answer=$(site "$DIR/admin.jar" POST /2fa/enable "{\"code\":\"$(totp)\"}")
  [[ $(json ok <<<"$answer") == True ]] || { echo "2FA enable failed: $answer" >&2; exit 1; }
}

register() { # register NAME PASSWORD → the member's account, signed in
  local salt key answer
  salt=$(new_salt)
  key=$(printf '%s' "$2" | auth_key "$salt")
  answer=$(site "$DIR/$1.jar" POST /auth/register \
    "{\"username\":\"$1\",\"email\":\"$1@example.org\",\"salt\":\"$salt\",\"authKey\":\"$key\",\"ageConfirmed\":true}")
  [[ $(json ok <<<"$answer") == True ]] || { echo "register $1 failed: $answer" >&2; exit 1; }
}

user_id() {
  admin_login
  site "$DIR/admin.jar" GET "/admin/users?q=$1" | python3 -I -c '
import json, sys
print(next(u["id"] for u in json.load(sys.stdin)["users"] if u["username"] == sys.argv[1]))' "$1"
}

admin_action() { # admin_action NAME METHOD SUFFIX [JSON] — must answer ok
  local id answer
  admin_login
  id=$(user_id "$1")
  answer=$(site "$DIR/admin.jar" "$2" "/admin/users/$id$3" "${4:-}")
  [[ $(json ok <<<"$answer") == True ]] || { echo "admin $2 $3 on $1 failed: $answer" >&2; exit 1; }
}

# race NAME METHOD PATH [JSON] [extra curl args…]: the race's API with NAME's jar (the race's own
# session cookie and the website's); prints the body, then the status on its own last line.
race() {
  local jar=$DIR/$1.jar method=$2 path=$3 data=()
  shift 3
  if [[ $# -gt 0 && -n ${1:-} ]]; then data=(--data "$1"); fi
  [[ $# -gt 0 ]] && shift
  curl -sS --max-time 60 --cacert "$ROOT_CA" -b "$jar" -c "$jar" -X "$method" -H 'Content-Type: application/json' \
    -H "Origin: $SITE" "${data[@]}" "$@" -w '\n%{http_code}' "$RACE$path"
}

# page NAME PATH [extra curl args…]: a page of the site (not the API) with NAME's jar; prints the
# body, then the status on its own last line.
page() {
  local jar=$DIR/$1.jar path=$2
  shift 2
  curl -sS --max-time 60 --cacert "$ROOT_CA" -b "$jar" -c "$jar" "$@" -w '\n%{http_code}' "$SITE$path"
}

# open_rounds_check: the race's list, read without a cookie through the website's proxy, judged by
# the website's own parseOpenRounds; prints one accepted round id per line.
open_rounds_check() {
  curl -sS --max-time 30 --cacert "$ROOT_CA" "$RACE/api/public/open-rounds" |
    in_site "import { parseOpenRounds } from '/app/server/src/games/openRoundsContract.js';
      let body = ''; for await (const chunk of process.stdin) body += chunk;
      for (const r of parseOpenRounds(body, process.argv[1])) console.log(r.id);" "$RACE/api/public/open-rounds"
}

# race_signin NAME [extra curl args…]: the race's sign-in route, the website session in the jar;
# prints the status and where it sends the browser.
race_signin() {
  local jar=$DIR/$1.jar
  shift
  curl -sS -o /dev/null --cacert "$ROOT_CA" -b "$jar" -c "$jar" -H "Origin: $SITE" "$@" \
    -w '%{http_code} %{redirect_url}' "$RACE/auth/website"
}

command=${1:?command}
shift
case $command in
  admin-login) admin_login ;;
  register) register "$1" "$2" ;;
  login) login "$1" "$2" ;;
  user-id) user_id "$1" ;;
  host) admin_action "$1" POST /game-host "{\"game\":\"race\",\"value\":$2}" ;;
  lock) admin_action "$1" POST /lock "{\"locked\":$2}" ;;
  delete) admin_action "$1" DELETE '' ;;
  forget) rm -f "$DIR/$1.jar" ;;
  signin) race_signin "$@" ;;
  race) race "$@" ;;
  page) page "$@" ;;
  open-rounds-check) open_rounds_check ;;
  *) echo "unknown command $command" >&2; exit 2 ;;
esac
