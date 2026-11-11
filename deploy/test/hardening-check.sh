#!/usr/bin/env bash
# ============================================================
# File:        hardening-check.sh
# Path:        deploy/test/hardening-check.sh
# Project:     RaceArena — AUDIT-1 hardening (2026-10-09)
# Description: The parts of the hardening that need a real Debian, run INSIDE a throwaway Debian 12
#              container (e2e-local.sh starts it, with deploy/ mounted read-only at /deploy):
#                · the fail2ban jail parses, and fail2ban reads 5 tries / 10 minutes / 1 hour from it;
#                · `racearena harden-ssh` refuses a user who is root, has no sudo, or has no key,
#                  refuses a confirmation with no plan, and in --dry-run prints the plan and changes
#                  nothing — it is NEVER applied here (no second SSH session exists to prove a key);
#                · `install.sh --dry-run` makes the data and backup folders owner-only, installs the
#                  fail2ban step, and only PRINTS harden-ssh.
#              Prints one PASS/FAIL line per check; exits non-zero if any failed.
# ============================================================
set -uo pipefail

R=/deploy/racearena
fails=0
pass() { printf 'PASS  %s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*"; fails=$((fails + 1)); }
check() { local name="$1"; shift; if "$@" >/tmp/out 2>&1; then pass "$name"; else fail "$name"; sed 's/^/      /' /tmp/out | tail -n 5; fi; }
refuses() { local name="$1" want="$2"; shift 2; if "$@" >/tmp/out 2>&1; then fail "$name (it did not refuse)"; elif grep -q "$want" /tmp/out; then pass "$name"; else fail "$name (refused for another reason)"; tail -n 3 /tmp/out; fi; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -q >/dev/null
apt-get install -y -q fail2ban python3-systemd openssh-server sudo >/dev/null

echo "── the fail2ban jail"
cp /deploy/fail2ban/racearena-sshd.local /etc/fail2ban/jail.d/
check "fail2ban accepts the configuration (fail2ban-client --test)" fail2ban-client --test
fail2ban-client -d 2>/dev/null >/tmp/dump
check "the sshd jail is defined" grep -q "\['add', 'sshd'" /tmp/dump
check "it bans after 5 tries" grep -q "\['set', 'sshd', 'maxretry', 5\]" /tmp/dump
# fail2ban keeps a time as written ('10m', '1h') in its dump and converts it when the jail starts.
check "within 10 minutes" grep -q "\['set', 'sshd', 'findtime', '10m'\]" /tmp/dump
check "for 1 hour" grep -q "\['set', 'sshd', 'bantime', '1h'\]" /tmp/dump
check "it reads the journal" grep -q "\['add', 'sshd', 'systemd'\]" /tmp/dump

echo "── racearena harden-ssh refuses, and its dry run changes nothing"
useradd -m -G sudo op
mkdir -p /home/op/.ssh
printf 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLE op@test\n' >/home/op/.ssh/authorized_keys
useradd -m -G sudo nokey
useradd -m plain
mkdir -p /home/plain/.ssh
cp /home/op/.ssh/authorized_keys /home/plain/.ssh/
export RA_ETC=/tmp/ra-etc
mkdir -p "$RA_ETC/state"
DROPIN=/etc/ssh/sshd_config.d/00-racearena-hardening.conf
refuses "refuses root" "is root" bash "$R" harden-ssh --user root --dry-run
refuses "refuses a user who cannot use sudo" "cannot use sudo" bash "$R" harden-ssh --user plain --dry-run
refuses "refuses a user with no public key" "no public key" bash "$R" harden-ssh --user nokey --dry-run
refuses "refuses a user who does not exist" "no user" bash "$R" harden-ssh --user ghost --dry-run
refuses "refuses a confirmation with no plan waiting" "no plan is waiting" bash "$R" harden-ssh --confirm deadbeef
check "the dry run passes the checks and prints the plan" bash -c "bash $R harden-ssh --user op --dry-run | grep -q 'PasswordAuthentication no'"
check "the dry run writes no SSH setting" test ! -e "$DROPIN"
check "the dry run issues no code" test ! -e "$RA_ETC/state/harden-ssh"

echo "── install.sh --dry-run"
bash /deploy/install.sh --dry-run --ref v0.0.0 >/tmp/install.out 2>&1
check "the data and backup folders are made owner-only" grep -q '^\[dry-run\] chmod 700 /var/lib/racearena /var/backups/racearena$' /tmp/install.out
check "fail2ban is installed" grep -q 'apt-get install -y -q fail2ban python3-systemd' /tmp/install.out
check "the jail file is written" grep -q 'write /etc/fail2ban/jail.d/racearena-sshd.local' /tmp/install.out
check "harden-ssh is printed as a next step" grep -q 'sudo racearena harden-ssh --user' /tmp/install.out
check "harden-ssh is never run by the installer" bash -c "! grep -q '^\[dry-run\] .*harden-ssh' /tmp/install.out"

echo "hardening-check: $fails failed"
exit "$fails"
