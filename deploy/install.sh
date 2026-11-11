#!/usr/bin/env bash
# ============================================================
# File:        install.sh
# Path:        deploy/install.sh
# Project:     RaceArena — VPS-INSTALL-1 (2026-10-07)
# Description: ONE command that installs RaceArena on a fresh Ubuntu 22.04/24.04 or Debian 12
#              server, from GitHub, behind Caddy with a real certificate:
#
#   curl -fsSL https://raw.githubusercontent.com/weudlll-cyber/seasonal-race-claude/<ref>/deploy/install.sh -o install.sh && sudo bash install.sh
#
#   Options:  --ref <tag|branch|commit>   the version to install (default: the newest release tag,
#                                         v<major>.<minor>[.<patch>]; with none, it stops and says so)
#             --dry-run                   print every action in order and change nothing
#             --mode standalone|website   which install (default: "inside Seasonal Entertainment"
#                                         is offered when this server carries the website's
#                                         markers; otherwise standalone, with no question)
#             --site-origin <url>         website mode: overrides https://<SITE_DOMAIN> from the
#                                         website's record (/etc/seasonal/install.conf)
#             --team <name>               website mode: the team (default "Seasonal Entertainment")
#             --port <n>                  website mode, nginx: the app's port on 127.0.0.1 (default 3940)
#             --subnet <cidr>             website mode: the race's network (default 172.30.251.0/24)
#             --site-network <name>       website mode: the website's network to join, when its
#                                         container "site" is on several
#             --help
#
# WHAT IT DOES, in this order (each step is recorded in /etc/racearena/install.state, so a re-run
# continues where an earlier run stopped and confirms what is already done):
#    1. checks: run as root, on a supported system
#    2. asks: domain, e-mail, first admin (name; password hidden, twice), optional SMTP for alerts.
#       Answers are kept in /etc/racearena/install.conf (600) — the PASSWORDS are never written
#       anywhere: the admin's goes from memory straight to the server's setup route.
#    3. DNS: the domain must already point at this server, or it explains what to set and stops
#    4. installs Docker Engine + compose (Docker's own apt repository), ufw (22, 80, 443 only;
#       22 is allowed FIRST so SSH never drops), unattended-upgrades for security updates
#   4b. installs fail2ban with an SSH jail (deploy/fail2ban/racearena-sshd.local: 5 tries, 1 hour)
#    5. lays out /opt/racearena (the checkout), /var/lib/racearena (data), /var/backups/racearena,
#       /etc/racearena (settings, 600)
#    6. starts the stack, creates the first admin, removes the one-time token, checks sign-in over
#       https — through `racearena`, the helper this installs to /usr/local/bin
#    7. schedules a daily backup (14 days kept) and a status check every 10 minutes (systemd)
#
# WEBSITE MODE (WEBSITE-EMBED-1 piece 5b, 2026-11-11) installs RaceArena INSIDE Seasonal
# Entertainment on the website's own server, under /games/race and the website's accounts. It asks no
# domain, no certificate e-mail and no first admin — only the team. It reads the website's record
# (/etc/seasonal/install.conf: RACE=yes required, MODE cross-checked, SITE_DOMAIN, INSTALL_DIR —
# piece 5c) and then: takes the race's fixed port and subnet (3940, 172.30.251.0/24; refused when
# taken), generates the proxy secret (0400, never printed), gives the race a
# copy of the website's sync token (refreshed at every start and update), writes the settings, starts
# the app WITHOUT the race's own Caddy and without 80/443, and puts the race's route file in the
# website's proxy (deploy/website-route.sh). No firewall or fail2ban change: the server is the
# website's. Every step is website_*; the standalone steps above are not changed by it.
#
# IT NEVER TOUCHES THE SSH CONFIGURATION. The guided hardening (`racearena harden-ssh`) is printed
# at the end as a next step and is never run from here: it must be run by a person who has a second
# session open, because it is the one step that can lock the server's owner out.
# The stack itself — compose file, Caddy, the tools — is deploy/racearena's; see its header.
# ============================================================
set -euo pipefail

# RA_INSTALL_REPO_URL exists for the installer test only (a local copy of the repository); on a
# server nothing sets it.
REPO_URL="${RA_INSTALL_REPO_URL:-https://github.com/weudlll-cyber/seasonal-race-claude.git}"
RA_HOME=/opt/racearena
RA_ETC=/etc/racearena
RA_DATA=/var/lib/racearena
RA_BACKUPS=/var/backups/racearena
CONF="$RA_ETC/install.conf"
STATE="$RA_ETC/install.state"
APP_UID=1000

DRY_RUN=0
REF=""
MODE="" SITE_ORIGIN="" TEAM="" SUBNET="" PORT="" SITE_NETWORK=""
# The website's markers (the website facts of 2026-11-11, docs/VPS-INSTALL.md "Inside Seasonal
# Entertainment"): its install is recognised by them, and the race only ever writes in routes/.
SEASONAL=/etc/seasonal
DEFAULT_TEAM="Seasonal Entertainment"
# The race's own port and subnet beside the other games (Bingo 3900 and 172.30.249.0/24, Mini Games
# 3920 and 172.30.250.0/24; piece 5c, the website facts of 2026-11-11).
DEFAULT_PORT=3940
DEFAULT_SUBNET=172.30.251.0/24
BASE_PATH=/games/race

say() { printf '%s\n' "$*"; }
step() { printf '\n── %s\n' "$*"; }
die() { printf '\ninstall.sh: %s\n' "$*" >&2; exit 1; }

# Every action that changes the machine goes through `run`, so --dry-run prints exactly what a real
# run would do, in order.
run() {
  if ((DRY_RUN)); then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}
# Writes a file from standard input with a mode; in a dry run, says what would be written.
write_file() {
  local path="$1" mode="$2"
  if ((DRY_RUN)); then
    printf '[dry-run] write %s (mode %s)\n' "$path" "$mode"
    cat >/dev/null
  else
    install -m "$mode" /dev/stdin "$path"
  fi
}

# Where the deploy/ files come from: the checkout on a real run; beside this script in a dry run,
# which changes nothing and so has no checkout.
deploy_dir() {
  if ((DRY_RUN)); then dirname "$0"; else echo "$RA_HOME/deploy"; fi
}
# A random value of <n> hex characters; a dry run only names it.
secret_hex() {
  if ((DRY_RUN)); then echo "<$1 random hex characters>"; else openssl rand -hex $(($1 / 2)); fi
}

done_step() { [[ -f "$STATE" ]] && grep -qx "$1" "$STATE"; }
mark_done() { ((DRY_RUN)) || printf '%s\n' "$1" >>"$STATE"; }

usage() { sed -n '/^#   curl/,/^#             --help/p' "$0" | sed 's/^# \{0,1\}//'; }

parse_args() {
  while (($#)); do
    case "$1" in
      --ref) REF="${2:-}"; [[ -n "$REF" ]] || die "--ref needs a tag, branch or commit"; shift 2 ;;
      --dry-run) DRY_RUN=1; shift ;;
      --mode) MODE="${2:-}"; [[ "$MODE" == standalone || "$MODE" == website ]] || die "--mode is standalone or website"; shift 2 ;;
      --site-origin) SITE_ORIGIN="${2:-}"; [[ "$SITE_ORIGIN" =~ ^https?://[^/[:space:]]+$ ]] || die "--site-origin is an address like https://seasonal.example.com (no path)"; shift 2 ;;
      --team) TEAM="${2:-}"; [[ -n "$TEAM" ]] || die "--team needs a name"; shift 2 ;;
      --port) PORT="${2:-}"; [[ "$PORT" =~ ^[0-9]{2,5}$ ]] || die "--port is a port number"; shift 2 ;;
      --site-network) SITE_NETWORK="${2:-}"; [[ -n "$SITE_NETWORK" ]] || die "--site-network needs a Docker network's name"; shift 2 ;;
      --subnet) SUBNET="${2:-}"; [[ "$SUBNET" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$ ]] || die "--subnet is a network like 172.30.250.0/24"; shift 2 ;;
      --help | -h) usage; exit 0 ;;
      *) die "unknown option: $1 (see --help)" ;;
    esac
  done
}

# ── 1 · checks ───────────────────────────────────────────────────────────────────────────────────
check_system() {
  step "1 · checks"
  if [[ "$(id -u)" != 0 ]]; then
    if ((DRY_RUN)); then say "[dry-run] not root — a real run stops here: run it with sudo"; else die "run it as root: sudo bash install.sh"; fi
  fi
  local id="" ver=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    id="$(. /etc/os-release && echo "${ID:-}")"
    # shellcheck disable=SC1091
    ver="$(. /etc/os-release && echo "${VERSION_ID:-}")"
  fi
  case "$id $ver" in
    "ubuntu 22.04" | "ubuntu 24.04" | "debian 12") say "system: $id $ver — supported" ;;
    *)
      local msg="this system is '${id:-unknown} ${ver:-}'. Supported: Ubuntu 22.04, Ubuntu 24.04, Debian 12."
      if ((DRY_RUN)); then say "[dry-run] $msg A real run stops here."; else die "$msg"; fi
      ;;
  esac
}

# ── 2 · questions ────────────────────────────────────────────────────────────────────────────────
DOMAIN="" EMAIL="" ADMIN="" ADMIN_PW="" SMTP_HOST="" SMTP_PORT="" SMTP_USER="" SMTP_PW="" SMTP_FROM=""

ask() { # ask <prompt> <regex> <error> → REPLY
  while :; do
    read -r -p "$1: " REPLY
    [[ "$REPLY" =~ $2 ]] && return 0
    say "  $3"
  done
}
ask_secret_twice() { # → REPLY; never echoed, never stored
  local a b
  while :; do
    read -r -s -p "$1: " a; echo
    if ((${#a} < 10)); then say "  at least 10 characters, please"; continue; fi
    read -r -s -p "the same again: " b; echo
    [[ "$a" == "$b" ]] && { REPLY="$a"; return 0; }
    say "  the two did not match — once more"
  done
}

ask_questions() {
  step "2 · questions"
  if [[ -f "$CONF" ]]; then
    # shellcheck disable=SC1090
    . "$CONF"
    say "known from an earlier run: $DOMAIN, $EMAIL, admin $ADMIN${SMTP_HOST:+, SMTP $SMTP_HOST}"
  fi
  if ((DRY_RUN)); then
    DOMAIN="${DOMAIN:-racearena.example.com}" EMAIL="${EMAIL:-you@example.com}" ADMIN="${ADMIN:-admin}"
    say "[dry-run] the questions are not asked; using $DOMAIN, $EMAIL, admin $ADMIN, no SMTP"
    return 0
  fi
  local dom_re='^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  local mail_re='^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  [[ -n "$DOMAIN" ]] || { ask "the domain visitors will type (e.g. races.example.com)" "$dom_re" "that is not a domain name (lower case, e.g. races.example.com)"; DOMAIN="$REPLY"; }
  [[ -n "$EMAIL" ]] || { ask "an e-mail address (certificate notices and alerts)" "$mail_re" "that is not an e-mail address"; EMAIL="$REPLY"; }
  [[ -n "$ADMIN" ]] || { ask "the first admin's user name" '^[^[:space:]]{2,64}$' "2 to 64 characters, no spaces"; ADMIN="$REPLY"; }
  if ! done_step first-admin; then
    ask_secret_twice "the first admin's password (hidden)"
    ADMIN_PW="$REPLY"
  fi
  if [[ ! -f "$CONF" ]]; then
    say "alert e-mails need an SMTP server. Press Enter to skip them (alerts then go to the system journal)."
    read -r -p "SMTP server (host name, or Enter to skip): " SMTP_HOST
    if [[ -n "$SMTP_HOST" ]]; then
      ask "SMTP port" '^[0-9]{2,5}$' "a port number, e.g. 587"; SMTP_PORT="$REPLY"
      ask "SMTP user name" '^.+$' "a user name, please"; SMTP_USER="$REPLY"
      read -r -s -p "SMTP password (hidden): " SMTP_PW; echo
      ask "the sender address" "$mail_re" "that is not an e-mail address"; SMTP_FROM="$REPLY"
    fi
  fi
  run mkdir -p "$RA_ETC"
  run chmod 700 "$RA_ETC"
  # The answers, without any password, so a re-run never asks them again.
  printf 'DOMAIN=%q\nEMAIL=%q\nADMIN=%q\nSMTP_HOST=%q\n' "$DOMAIN" "$EMAIL" "$ADMIN" "$SMTP_HOST" | write_file "$CONF" 600
}

# ── 3 · DNS ──────────────────────────────────────────────────────────────────────────────────────
check_dns() {
  step "3 · DNS: does $DOMAIN point at this server?"
  if ((DRY_RUN)); then
    say "[dry-run] would compare the A record of $DOMAIN with this server's IPv4 addresses, and stop if they differ"
    return 0
  fi
  local mine theirs
  mine="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)"
  theirs="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u || true)"
  local ok=0 ip
  for ip in $theirs; do grep -qx "$ip" <<<"$mine" && ok=1; done
  if ((ok)); then
    say "$DOMAIN → $(echo "$theirs" | tr '\n' ' ')— this server. Good."
    return 0
  fi
  say "
$DOMAIN does not point at this server yet.

  This server's address:   $(echo "$mine" | head -n 1)
  $DOMAIN points at:       ${theirs:-nothing}

What to do, at the company where you registered the domain (its DNS settings):
  · create or change an  A  record for  $DOMAIN  with the value  $(echo "$mine" | head -n 1)
  · if an  AAAA  record exists for it, remove it (or point it at this server's IPv6 address)
Changes take from a few minutes to a few hours to arrive. Then run the same command again —
it continues from here, and does not ask the questions again."
  exit 3
}

# ── 4 · the operating system ─────────────────────────────────────────────────────────────────────
install_os() {
  step "4 · Docker, firewall, security updates"
  if done_step os; then say "done in an earlier run"; return 0; fi
  local id=debian codename=bookworm arch=amd64
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    id="$(. /etc/os-release && echo "${ID:-debian}")"
    # shellcheck disable=SC1091
    codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")"
  fi
  if ! ((DRY_RUN)); then arch="$(dpkg --print-architecture)"; fi
  export DEBIAN_FRONTEND=noninteractive
  run apt-get update -q
  run apt-get install -y -q ca-certificates curl gnupg git ufw unattended-upgrades
  if [[ -n "$SMTP_HOST" ]]; then run apt-get install -y -q msmtp; fi
  install_docker "$id" "$codename" "$arch"
  # ★ SSH is allowed BEFORE the firewall is switched on, so an SSH session never drops.
  run ufw allow 22/tcp
  run ufw allow 80/tcp
  run ufw allow 443/tcp
  run ufw default deny incoming
  run ufw default allow outgoing
  run ufw --force enable
  # Security updates, installed by themselves every day.
  printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' |
    write_file /etc/apt/apt.conf.d/20auto-upgrades 644
  mark_done os
}

# Docker Engine and the compose plugin from Docker's own repository (docs.docker.com/engine/install).
# Moved out of install_os unchanged, so website mode installs Docker the same way when it is missing.
install_docker() {
  local id="$1" codename="$2" arch="$3"
  run install -m 0755 -d /etc/apt/keyrings
  run curl -fsSL "https://download.docker.com/linux/$id/gpg" -o /etc/apt/keyrings/docker.asc
  run chmod a+r /etc/apt/keyrings/docker.asc
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
    "$arch" "$id" "$codename" | write_file /etc/apt/sources.list.d/docker.list 644
  run apt-get update -q
  run apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  run systemctl enable --now docker
}

# ── 4b · fail2ban for SSH ────────────────────────────────────────────────────────────────────────
# Its OWN step, not part of step 4, so a server installed before it existed gets it from a re-run:
# step 4 is recorded as done there and would never run again. Re-running it is harmless — the jail
# file is rewritten with the same content and fail2ban reloaded.
install_fail2ban() {
  step "4b · fail2ban: five failed SSH sign-ins in ten minutes ban the address for an hour"
  if done_step fail2ban; then say "done in an earlier run"; return 0; fi
  export DEBIAN_FRONTEND=noninteractive
  # python3-systemd: the jail reads the journal (backend = systemd), the one source Debian 12 has.
  run apt-get install -y -q fail2ban python3-systemd
  write_file /etc/fail2ban/jail.d/racearena-sshd.local 644 <"$(deploy_dir)/fail2ban/racearena-sshd.local"
  run systemctl enable --now fail2ban
  run systemctl reload-or-restart fail2ban
  mark_done fail2ban
}

# ── 5 · layout, checkout, settings ───────────────────────────────────────────────────────────────
resolve_default_ref() {
  [[ -n "$REF" ]] && return 0
  # The newest RELEASE tag. ★ Not every "v…" tag: this repository carries many ship markers
  # (v-…-complete) that are not releases, and installing one would install an old commit.
  REF="$(git ls-remote --tags --refs "$REPO_URL" 'v*' 2>/dev/null | sed 's|.*refs/tags/||' |
    grep -E '^v[0-9]+\.[0-9]+(\.[0-9]+)?$' | sort -V | tail -n 1 || true)"
  [[ -n "$REF" ]] || die "no release tag (v<major>.<minor>[.<patch>]) exists yet. Name the version to install:
  sudo bash install.sh --ref <tag, branch or commit>"
}

# A tag, a branch or a commit. A fresh clone holds a branch only as origin/<branch>, so that is
# tried first — the same rule as `racearena update`.
checkout_ref() {
  if ((DRY_RUN)); then
    say "[dry-run] git -C $RA_HOME checkout --quiet --detach <the commit $REF names>"
    return 0
  fi
  local sha
  sha="$(git -C "$RA_HOME" rev-parse --verify --quiet "origin/$REF^{commit}" ||
    git -C "$RA_HOME" rev-parse --verify --quiet "$REF^{commit}")" ||
    die "no tag, branch or commit called '$REF' in $REPO_URL"
  git -C "$RA_HOME" checkout --quiet --detach "$sha"
}

# The checkout: cloned once at the version asked for; afterwards only 'racearena update' moves it.
# Shared by both modes (moved out of lay_out unchanged).
clone_or_keep_checkout() {
  if [[ -d "$RA_HOME/.git" ]]; then
    say "the checkout exists; it is moved to a version only by 'racearena update'"
  else
    resolve_default_ref
    say "installing version $REF"
    run git clone --quiet "$REPO_URL" "$RA_HOME"
    checkout_ref
  fi
}

lay_out() {
  step "5 · directories, the checkout, the settings"
  run mkdir -p "$RA_HOME" "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/state"
  # The app runs as uid $APP_UID in its container; its two directories are its own — and ONLY its
  # own (AUDIT-1 A5M-06): the data holds the session store and every race, the backups hold the
  # password hashes, and under the usual umask mkdir leaves both readable by every local account.
  run chown "$APP_UID:$APP_UID" "$RA_DATA" "$RA_BACKUPS"
  run chmod 700 "$RA_DATA" "$RA_BACKUPS"
  run chmod 700 "$RA_ETC"
  clone_or_keep_checkout
  if [[ -f "$RA_ETC/racearena.env" ]]; then
    say "settings exist: $RA_ETC/racearena.env (kept — its session secret signs everybody's sign-in)"
  else
    # A session secret generated ONCE (regenerating it signs everybody out), and the one-time token
    # that opens an empty install; the token is removed again right after the first admin exists.
    {
      printf 'RA_PUBLIC_ORIGIN=https://%s\n' "$DOMAIN"
      printf 'RA_SESSION_SECRET=%s\n' "$(secret_hex 64)"
      printf 'RA_BOOTSTRAP_TOKEN=%s\n' "$(secret_hex 32)"
    } | write_file "$RA_ETC/racearena.env" 600
  fi
  sed -e "s|{{DOMAIN}}|$DOMAIN|" -e "s|{{EMAIL}}|$EMAIL|" -e 's|{{TLS_LINE}}||' \
    "$(deploy_dir)/Caddyfile.template" |
    write_file "$RA_ETC/Caddyfile" 644
  printf 'RA_DATA_HOST=%s\nRA_BACKUP_HOST=%s\nRA_ENV_FILE=%s\nRA_CADDYFILE=%s\n' \
    "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/racearena.env" "$RA_ETC/Caddyfile" | write_file "$RA_ETC/compose.env" 644
  if [[ -n "$SMTP_HOST" && ! -f "$RA_ETC/msmtprc" ]]; then
    printf 'defaults\nauth on\ntls on\ntls_trust_file /etc/ssl/certs/ca-certificates.crt\naccount default\nhost %s\nport %s\nuser %s\npassword %s\nfrom %s\n' \
      "$SMTP_HOST" "$SMTP_PORT" "$SMTP_USER" "$SMTP_PW" "$SMTP_FROM" | write_file "$RA_ETC/msmtprc" 600
  fi
  printf '%s\n' "$EMAIL" | write_file "$RA_ETC/state/alert-email" 600
  run install -m 0755 "$RA_HOME/deploy/racearena" /usr/local/bin/racearena
}

# ── 6 · the stack, the first admin, sign-in over https ───────────────────────────────────────────
start_stack() {
  step "6 · start, first admin, sign-in over https"
  run racearena start
  if done_step first-admin; then
    say "the first admin was created in an earlier run"
  else
    # The password goes from memory into the command's standard input — never an argument, a file
    # or the shell history.
    if ((DRY_RUN)); then say "[dry-run] racearena first-admin --user $ADMIN   (password on standard input)"; else printf '%s\n' "$ADMIN_PW" | racearena first-admin --user "$ADMIN"; fi
    mark_done first-admin
    # Caddy fetches the certificate on the first https request; give it up to two minutes.
    local tries=0
    if ((DRY_RUN)); then
      say "[dry-run] racearena verify-signin --user $ADMIN   (password on standard input)"
    else
      until printf '%s\n' "$ADMIN_PW" | racearena verify-signin --user "$ADMIN"; do
        tries=$((tries + 1))
        ((tries < 12)) || die "sign-in over https://$DOMAIN did not work within two minutes — see: racearena logs caddy"
        sleep 10
      done
    fi
  fi
  ADMIN_PW=""
}

# ── 7 · schedules ────────────────────────────────────────────────────────────────────────────────
install_timers() {
  step "7 · daily backup, status check every 10 minutes"
  local unit
  for unit in racearena-backup.service racearena-backup.timer racearena-status.service racearena-status.timer racearena-alert.service; do
    write_file "/etc/systemd/system/$unit" 644 <"$(deploy_dir)/systemd/$unit"
  done
  run systemctl daemon-reload
  run systemctl enable --now racearena-backup.timer racearena-status.timer
}

summary() {
  local alerts="written to the system journal (tag racearena-alert) and shown by 'racearena status' — no SMTP was given"
  [[ -n "$SMTP_HOST" ]] && alerts="e-mailed to $EMAIL through $SMTP_HOST"
  local title="RaceArena is installed"
  ((DRY_RUN)) && title="(dry run) what the end of a real run prints"
  say "

══ $title ══

  Address:   https://$DOMAIN   (sign in as $ADMIN)
  Data:      $RA_DATA
  Backups:   $RA_BACKUPS — one every day, the last 14 days kept.
             ★ Copy them OFF this server too (another machine, or storage you rent): a backup on
               the same disk is lost with the disk.
  Alerts:    the status check runs every 10 minutes; when it fails, alerts are $alerts.

  racearena status              is it healthy?
  racearena logs [app|caddy]    the logs
  racearena backup              a backup now
  racearena restore <archive>   put the data back from a backup
  racearena update [ref]        move to another version (backup first, rolls back by itself)
  racearena rollback            back to the version before the last update
  racearena version             what runs here
  racearena uninstall           remove RaceArena (a final backup first; the data is kept)
  racearena <command> --help    explains one

  SSH: fail2ban now bans an address after 5 failed sign-ins (1 hour). This installer did NOT change
  the SSH configuration itself. When you sign in with a key, let RaceArena switch passwords and
  root sign-in off — it checks your key login from a second session first and refuses otherwise:
    sudo racearena harden-ssh --user <your non-root sudo user>"
}

# ══ WEBSITE MODE — inside Seasonal Entertainment (WEBSITE-EMBED-1 pieces 5b and 5c) ═════════════════
#
# Piece 5c (2026-11-11) follows the website's own facts, checked that day against website master
# eb1bbe9 and the way Seasonal Bingo Royale installs into it (its ops/lib/website.sh and
# websiteApply.sh, read-only): the website's installer records itself in /etc/seasonal/install.conf
# (root only, no secrets; MODE, SITE_DOMAIN, INSTALL_DIR, RACE), its app is the container "site" of
# the compose project "seasonal-site", and each game takes its own fixed port and subnet (Bingo
# 3900 and 172.30.249.0/24, Mini Games 3920 and 172.30.250.0/24, the race 3940 and 172.30.251.0/24).

website_markers_present() {
  [[ -f "$SEASONAL/site-local-port" && -f "$SEASONAL/games-sync-token" && -d "$SEASONAL/routes" ]]
}

# Which install. With no markers and no --mode there is NO question: standalone, exactly as before.
choose_mode() {
  local markers=0
  website_markers_present && markers=1
  if [[ -z "$MODE" && -f "$RA_ETC/mode" ]]; then
    MODE="$(cat "$RA_ETC/mode")"
    say "mode from the earlier install: $MODE"
  fi
  if [[ -z "$MODE" ]]; then
    if ((markers == 0)); then
      MODE=standalone
    elif ((DRY_RUN)); then
      MODE=website
      say "[dry-run] the website's markers are here, so 'inside Seasonal Entertainment' is offered first"
    else
      read -r -p "This server runs Seasonal Entertainment. Install RaceArena inside it, under $BASE_PATH? [Y/n]: " REPLY
      if [[ "$REPLY" =~ ^[Nn] ]]; then MODE=standalone; else MODE=website; fi
    fi
  fi
  if [[ "$MODE" == website ]] && ((markers == 0)); then
    local msg="website mode needs the website's markers on this server ($SEASONAL/site-local-port, $SEASONAL/games-sync-token, $SEASONAL/routes/) — none are here"
    if ((DRY_RUN)); then say "[dry-run] $msg. A real run stops here."; else die "$msg"; fi
  fi
}

# ── what the website's installer recorded: /etc/seasonal/install.conf ───────────────────────────
# Root only and without secrets, but NEVER sourced and never printed: only the four keys are read,
# each from its own KEY=VALUE line (the website writes them with kv_set, its deploy/install/lib/
# common.sh; the last line of a key wins).
site_record() { # site_record <KEY> → its value, or nothing
  [[ -r "$SEASONAL/install.conf" ]] || return 0
  sed -n "s/^$1=//p" "$SEASONAL/install.conf" | tail -n 1
}
SITE_MODE="" SITE_DIR=""
website_record() {
  if ((DRY_RUN)) && [[ ! -r "$SEASONAL/install.conf" ]]; then
    SITE_MODE=nginx SITE_ORIGIN="${SITE_ORIGIN:-https://seasonal.example.com}"
    say "[dry-run] would read MODE, SITE_DOMAIN, INSTALL_DIR and RACE from $SEASONAL/install.conf"
    return 0
  fi
  [[ -r "$SEASONAL/install.conf" ]] || die "the website's installer has not recorded itself here ($SEASONAL/install.conf is missing): install or update the website first"
  [[ "$(site_record RACE)" == yes ]] || die "the website is not prepared for the race (RACE is not yes in $SEASONAL/install.conf).
  Run the website's installer again with --race and answer yes, then this installer again. Nothing was changed."
  SITE_MODE="$(site_record MODE)"
  [[ "$SITE_MODE" == nginx || "$SITE_MODE" == caddy ]] || die "the website's record names no mode nginx or caddy ($SEASONAL/install.conf)"
  SITE_DIR="$(site_record INSTALL_DIR)"
  local domain
  domain="$(site_record SITE_DOMAIN)"
  # --site-origin is an override only; otherwise the website's own domain, over https.
  if [[ -z "$SITE_ORIGIN" ]]; then
    [[ "$domain" =~ ^[A-Za-z0-9.-]+$ ]] || die "the website's record carries no SITE_DOMAIN ($SEASONAL/install.conf); name it: --site-origin https://<the website's domain>"
    SITE_ORIGIN="https://$domain"
  fi
}

# ── w2 · the one question: the team ───────────────────────────────────────────────────────────────
website_questions() {
  step "2 · questions (inside Seasonal Entertainment: only the team)"
  if [[ -f "$CONF" ]]; then
    TEAM="${TEAM:-$(sed -n 's/^TEAM=//p' "$CONF" | tail -n 1)}"
    [[ -n "$TEAM" ]] && say "known from an earlier run: team $TEAM"
  fi
  if [[ -z "$TEAM" ]]; then
    if ((DRY_RUN)); then TEAM="$DEFAULT_TEAM"; else
      read -r -p "the team the website's hosts run races in [$DEFAULT_TEAM]: " TEAM
      TEAM="${TEAM:-$DEFAULT_TEAM}"
    fi
  fi
  [[ "$TEAM" =~ ^[^[:cntrl:]]{1,64}$ ]] || die "the team is 1 to 64 characters"
  run mkdir -p "$RA_ETC"
  run chmod 700 "$RA_ETC"
  printf 'MODE=website\nTEAM=%s\n' "$TEAM" | write_file "$CONF" 600
}

# ── w4 · Docker, only when it is missing: the server is the website's — no firewall, no fail2ban ──
website_docker() {
  step "4 · Docker (the website's server: its firewall and SSH are left as they are)"
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    say "Docker and compose are here"
    return 0
  fi
  local id=debian codename=bookworm arch=amd64
  # shellcheck disable=SC1091
  [[ -r /etc/os-release ]] && { id="$(. /etc/os-release && echo "${ID:-debian}")"; codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")"; }
  ((DRY_RUN)) || arch="$(dpkg --print-architecture)"
  export DEBIAN_FRONTEND=noninteractive
  run apt-get update -q
  run apt-get install -y -q ca-certificates curl gnupg git
  install_docker "$id" "$codename" "$arch"
}

# ── w3 · the website on this server, as its installer and its containers say ───────────────────
WEBSITE_PROJECT=seasonal-site
PROXY="" PROXY_CONTAINER="" ROUTES_DIR="" ROUTE_FILE="" RACE_UPSTREAM="" AUTH_UPSTREAM=""
SITE_NETWORK="" TRUSTED="" SITE_PORT=""

# A running container of the website's compose project, by its service name (site or caddy).
website_container() {
  docker ps --filter "label=com.docker.compose.project=$WEBSITE_PROJECT" \
    --filter "label=com.docker.compose.service=$1" --format '{{.Names}}' | head -n 1
}
# nginx holds 80 or 443 on the host.
host_nginx() { ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -q '"nginx"'; }

# The website's network the race joins (for the feed; in Caddy mode the website's Caddy also
# reaches the race over it): seasonal-site_default when the container is on it, else its only
# network, else the one named with --site-network.
choose_site_network() {
  local container="$1" networks
  networks="$(docker inspect -f '{{range $n, $_ := .NetworkSettings.Networks}}{{$n}} {{end}}' "$container")"
  if [[ -n "$SITE_NETWORK" ]]; then
    [[ " $networks " == *" $SITE_NETWORK "* ]] || die "the website's container $container is not on the network $SITE_NETWORK (it is on: $networks)"
  elif [[ " $networks " == *" ${WEBSITE_PROJECT}_default "* ]]; then
    SITE_NETWORK="${WEBSITE_PROJECT}_default"
  elif [[ "$(wc -w <<<"$networks")" -eq 1 ]]; then
    SITE_NETWORK="${networks// /}"
  else
    die "the website's container $container is on several networks ($networks): name the one the race joins with --site-network <name>"
  fi
}

website_detect() {
  step "3 · the website on this server"
  if ((DRY_RUN)) && ! command -v docker >/dev/null 2>&1; then
    PROXY="$SITE_MODE" SITE_NETWORK="${SITE_NETWORK:-${WEBSITE_PROJECT}_default}" SITE_PORT=3800
    say "[dry-run] would cross-check the website's $PROXY and find its container \"site\" once Docker is installed"
    website_routes
    return 0
  fi
  SITE_PORT="$(tr -dc '0-9' <"$SEASONAL/site-local-port")"
  [[ -n "$SITE_PORT" ]] || die "$SEASONAL/site-local-port does not hold a port"
  # The record names the mode; what runs here must say the same, or the record is out of date.
  local caddy site seen=""
  caddy="$(website_container caddy)"
  if [[ -n "$caddy" ]]; then seen=caddy; elif host_nginx; then seen=nginx; fi
  [[ "$seen" == "$SITE_MODE" ]] || die "the website's installer recorded $SITE_MODE mode ($SEASONAL/install.conf), but this server looks like ${seen:-neither} (its Caddy of $WEBSITE_PROJECT, or nginx on 80/443): check which proxy holds ports 80/443"
  PROXY="$SITE_MODE"
  site="$(website_container site)"
  [[ -n "$site" ]] || die "the website's container \"site\" (compose project $WEBSITE_PROJECT) is not running: the race reaches the website's account feed through it"
  choose_site_network "$site"
  if [[ "$PROXY" == caddy ]]; then
    PROXY_CONTAINER="$caddy"
    # The website's Caddy reaches the race on the website's network: every subnet of it is the
    # trusted proxy here, as for Bingo.
    TRUSTED="$(docker network inspect -f '{{range .IPAM.Config}}{{.Subnet}} {{end}}' "$SITE_NETWORK" | xargs | tr ' ' ',')"
    [[ -n "$TRUSTED" ]] || die "the network $SITE_NETWORK has no subnet to trust"
  fi
  website_routes
  say "website: $PROXY mode, $SITE_ORIGIN · its container $site on $SITE_NETWORK · route file $ROUTES_DIR/$ROUTE_FILE · the race trusts $TRUSTED"
}

# Where the route file goes and how the proxy reaches the race and the website (F5).
website_routes() {
  if [[ "$PROXY" == nginx ]]; then
    ROUTES_DIR="$SEASONAL/routes" ROUTE_FILE=race.conf
    RACE_UPSTREAM="127.0.0.1:$PORT" AUTH_UPSTREAM="127.0.0.1:$SITE_PORT"
  else
    [[ -n "$SITE_DIR" ]] || die "the website's record carries no INSTALL_DIR ($SEASONAL/install.conf): the race's Caddy route file goes into its deploy/site/routes"
    ROUTES_DIR="$SITE_DIR/deploy/site/routes" ROUTE_FILE=race.caddy
    RACE_UPSTREAM=racearena:4000 AUTH_UPSTREAM=site:3800
  fi
}

# ── w3b · the race's own port and subnet: fixed, flags to override, refused when taken ──────────
# A re-run keeps the values the first install recorded (website.conf), unless a flag names others.
website_port_and_subnet() {
  local prev_port="" prev_subnet=""
  if [[ -f "$RA_ETC/website.conf" ]]; then
    prev_port="$(sed -n 's/^LOCAL_PORT=//p' "$RA_ETC/website.conf" | tail -n 1)"
    prev_subnet="$(sed -n 's/^SUBNET=//p' "$RA_ETC/website.conf" | tail -n 1)"
  fi
  PORT="${PORT:-${prev_port:-$DEFAULT_PORT}}"
  SUBNET="${SUBNET:-${prev_subnet:-$DEFAULT_SUBNET}}"
  if ((DRY_RUN)) && ! command -v docker >/dev/null 2>&1; then
    say "[dry-run] would refuse if port $PORT or the network $SUBNET is in use"
    return 0
  fi
  # The port: only nginx mode publishes it (127.0.0.1); the race's own container may hold it.
  if [[ "$SITE_MODE" == nginx ]] && ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . &&
    ! docker ps --filter label=com.docker.compose.project=racearena --format '{{.Ports}}' | grep -q ":$PORT->"; then
    die "port $PORT is in use on this server (Bingo uses 3900, Mini Games 3920). Choose another: --port <n>"
  fi
  local net used
  for net in $(docker network ls -q); do
    used="$(docker network inspect -f '{{.Name}} {{range .IPAM.Config}}{{.Subnet}} {{end}}' "$net")"
    [[ "${used%% *}" == racearena_default ]] && continue
    grep -qw -- "$SUBNET" <<<"${used#* }" && die "the race's network $SUBNET is already used by the Docker network '${used%% *}' (Bingo uses 172.30.249.0/24, Mini Games 172.30.250.0/24). Choose another: --subnet <cidr>"
  done
  say "the race's port $PORT and network $SUBNET: free"
}

# nginx mode: the race's own network alone is trusted — the website's network carries the feed only
# and is never trusted there. (Caddy mode: the website's network, set by website_detect.)
website_trust() {
  if [[ "$PROXY" == nginx ]]; then TRUSTED="$SUBNET"; fi
}

# ── w5 · layout, checkout, the secret, the settings ──────────────────────────────────────────────
website_lay_out() {
  step "5 · directories, the checkout, the proxy secret, the settings"
  run mkdir -p "$RA_HOME" "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/state" "$RA_ETC/website"
  run chown "$APP_UID:$APP_UID" "$RA_DATA" "$RA_BACKUPS"
  run chmod 700 "$RA_DATA" "$RA_BACKUPS" "$RA_ETC" "$RA_ETC/website"
  clone_or_keep_checkout
  if [[ -f "$RA_ETC/website/proxy-secret" ]]; then
    say "the proxy secret exists (kept)"
  else
    # Generated once, read by the app (uid $APP_UID) and by the route file; never printed.
    secret_hex 64 | write_file "$RA_ETC/website/proxy-secret" 400
    run chown "$APP_UID:$APP_UID" "$RA_ETC/website/proxy-secret"
  fi
  # The settings are written on every run from what the website and its record say now (the
  # session secret alone is kept: regenerating it would sign everybody out).
  local session
  session="$( [[ -f "$RA_ETC/racearena.env" ]] && sed -n 's/^RA_SESSION_SECRET=//p' "$RA_ETC/racearena.env" | tail -n 1 )"
  [[ -n "$session" ]] || session="$(secret_hex 64)"
  {
    printf 'RA_PUBLIC_ORIGIN=%s\n' "$SITE_ORIGIN"
    printf 'RA_SESSION_SECRET=%s\n' "$session"
    printf 'RA_MODE=website\nRA_BASE_PATH=%s\nRA_WEBSITE_TEAM=%s\n' "$BASE_PATH" "$TEAM"
    printf 'RA_WEBSITE_PROXY_SECRET_FILE=/run/racearena/proxy-secret\nRA_WEBSITE_SYNC_TOKEN_FILE=/run/racearena/sync-token\n'
    printf 'RA_WEBSITE_TRUSTED_PROXIES=%s\nRA_WEBSITE_FEED_URL=http://site:3800\n' "$TRUSTED"
  } | write_file "$RA_ETC/racearena.env" 600
  printf 'RA_DATA_HOST=%s\nRA_BACKUP_HOST=%s\nRA_ENV_FILE=%s\n' "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/racearena.env" |
    write_file "$RA_ETC/compose.env" 644
  # What `racearena` needs to run this mode (no secret in it). The mode itself is its own file, so
  # an update — which never rewrites either — keeps it.
  printf 'PROXY=%q\nROUTES_DIR=%q\nROUTE_FILE=%q\nPROXY_CONTAINER=%q\nRACE_UPSTREAM=%q\nAUTH_UPSTREAM=%q\nLOCAL_PORT=%q\nSUBNET=%q\nSITE_NETWORK=%q\nSITE_TOKEN=%q\n' \
    "$PROXY" "$ROUTES_DIR" "$ROUTE_FILE" "$PROXY_CONTAINER" "$RACE_UPSTREAM" "$AUTH_UPSTREAM" \
    "$PORT" "$SUBNET" "$SITE_NETWORK" "$SEASONAL/games-sync-token" | write_file "$RA_ETC/website.conf" 600
  printf 'website\n' | write_file "$RA_ETC/mode" 600
  run install -m 0755 "$RA_HOME/deploy/racearena" /usr/local/bin/racearena
}

# ── w6 · start the app (no Caddy of its own, no 80/443), then the route in the website's proxy ───
website_start() {
  step "6 · start the app, then the route in the website's proxy"
  run racearena start
  run racearena route install
}

website_summary() {
  local title="RaceArena is installed inside Seasonal Entertainment"
  ((DRY_RUN)) && title="(dry run) what the end of a real run prints"
  say "

══ $title ══

  Address:   $SITE_ORIGIN$BASE_PATH/   — sign in through the website; hosts run races, members join.
  Team:      $TEAM
  Route:     $ROUTES_DIR/$ROUTE_FILE in the website's $PROXY (the race writes only this file)
  Data:      $RA_DATA
  Backups:   $RA_BACKUPS — one every day, the last 14 days kept. Copy them OFF this server too.

  racearena status              is it healthy? (the mode and the route file too)
  racearena logs app            the app's log
  racearena backup              a backup now
  racearena update [ref]        move to another version (backup first, rolls back by itself; the mode is kept)
  racearena uninstall           remove RaceArena: its route file, its containers; the data is kept
  racearena <command> --help    explains one"
}

website_main() {
  # The website's record FIRST: RACE other than yes stops before anything on this server changes.
  step "1b · the website's record (/install.conf)"
  website_record
  website_questions
  website_docker
  website_detect
  website_port_and_subnet
  website_trust
  # nginx mode's upstream needs the port, which is only known now.
  website_routes
  website_lay_out
  website_start
  install_timers
  website_summary
}

main() {
  parse_args "$@"
  ((DRY_RUN)) && say "DRY RUN — nothing is changed; every action is printed in order."
  check_system
  choose_mode
  if [[ "$MODE" == website ]]; then
    website_main
    return
  fi
  ask_questions
  check_dns
  install_os
  install_fail2ban
  lay_out
  start_stack
  install_timers
  summary
}

main "$@"
