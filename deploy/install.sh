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
#    5. lays out /opt/racearena (the checkout), /var/lib/racearena (data), /var/backups/racearena,
#       /etc/racearena (settings, 600)
#    6. starts the stack, creates the first admin, removes the one-time token, checks sign-in over
#       https — through `racearena`, the helper this installs to /usr/local/bin
#    7. schedules a daily backup (14 days kept) and a status check every 10 minutes (systemd)
#
# IT NEVER TOUCHES THE SSH CONFIGURATION. The recommended hardening is printed at the end.
# The stack itself — compose file, Caddy, the tools — is deploy/racearena's; see its header.
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/weudlll-cyber/seasonal-race-claude.git"
RA_HOME=/opt/racearena
RA_ETC=/etc/racearena
RA_DATA=/var/lib/racearena
RA_BACKUPS=/var/backups/racearena
CONF="$RA_ETC/install.conf"
STATE="$RA_ETC/install.state"
APP_UID=1000

DRY_RUN=0
REF=""

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
  # Docker Engine and the compose plugin from Docker's own repository (docs.docker.com/engine/install).
  run install -m 0755 -d /etc/apt/keyrings
  run curl -fsSL "https://download.docker.com/linux/$id/gpg" -o /etc/apt/keyrings/docker.asc
  run chmod a+r /etc/apt/keyrings/docker.asc
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
    "$arch" "$id" "$codename" | write_file /etc/apt/sources.list.d/docker.list 644
  run apt-get update -q
  run apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  run systemctl enable --now docker
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

lay_out() {
  step "5 · directories, the checkout, the settings"
  run mkdir -p "$RA_HOME" "$RA_DATA" "$RA_BACKUPS" "$RA_ETC/state"
  # The app runs as uid $APP_UID in its container; its two directories are its own.
  run chown "$APP_UID:$APP_UID" "$RA_DATA" "$RA_BACKUPS"
  run chmod 700 "$RA_ETC"
  if [[ -d "$RA_HOME/.git" ]]; then
    say "the checkout exists; it is moved to a version only by 'racearena update'"
  else
    resolve_default_ref
    say "installing version $REF"
    run git clone --quiet "$REPO_URL" "$RA_HOME"
    checkout_ref
  fi
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
  racearena <command> --help    explains one

  Next, for SSH (this installer did NOT change it — do it while still signed in, and test a second
  login before closing the first):
    1. sign in with a key instead of a password: put your public key in ~/.ssh/authorized_keys
    2. then in /etc/ssh/sshd_config set:  PasswordAuthentication no   and   PermitRootLogin prohibit-password
    3. sudo systemctl reload ssh"
}

main() {
  parse_args "$@"
  ((DRY_RUN)) && say "DRY RUN — nothing is changed; every action is printed in order."
  check_system
  ask_questions
  check_dns
  install_os
  lay_out
  start_stack
  install_timers
  summary
}

main "$@"
