#!/usr/bin/env bash
# ============================================================
# File:        backup-copy-check.sh
# Path:        deploy/test/backup-copy-check.sh
# Project:     RaceArena — GOING-ONLINE-PREP-1 piece 3 (the owner's decision D4 of 2026-11-13)
# Created:     2026-11-13
# Description: `racearena backup-copy` — the encrypted copy of the backups off the server — run
#              INSIDE a throwaway Debian 12 container (the image hardening-check.sh uses), with the
#              REAL racearena and the REAL rclone, installed by the setup itself from Debian's
#              package repository. A LOCAL directory (`setup --local`) stands in for the OneDrive, so
#              the interactive OneDrive authorisation is the one step not run here (it needs the
#              owner's Microsoft account; the first real run does it, D6).
#
#              The app's container is not here: `docker` is a stand-in on PATH that answers the calls
#              racearena makes — `backup.mjs --out` writes a real tar of $RA_DATA with its checksum,
#              `backup.mjs --restore` unpacks one into $RA_DATA, and the health and status calls
#              answer "healthy". The real stack's backup and restore are deploy/test/e2e-local.sh's.
#
#              What it shows, one PASS/FAIL line each:
#                1. with no setup nothing changes — a backup copies nothing, rclone is not installed,
#                   no backup-copy folder appears, and `racearena status` shows no copy section;
#                2. setup installs rclone, writes the encryption, keeps the password root-only (0600)
#                   and never prints it (no terminal here, so it says where to read it once), and its
#                   test copy is read back;
#                3. a backup — the command the daily timer runs — is copied, ENCRYPTED: what is stored
#                   is not readable as a tar and its name is not the archive's;
#                4. the read-back restores: the copy fetched into an empty backups folder matches its
#                   checksum, and `racearena restore` of it brings the data back;
#                5. retention prunes the copy past 14 days, by the date in the name;
#                6. `backup-copy status` warns when the newest copy is older than 2 days, and so does
#                   `racearena status`;
#                7. the password of the copies opens them on a NEW install (`setup --existing` is
#                   interactive, so this check rebuilds that layer with the same password the way
#                   setup writes it).
#              Prints one PASS/FAIL line per check and a summary; exits non-zero if any failed.
#
# Usage (from the repository root, Git Bash or Linux, with Docker):
#   MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W 2>/dev/null || pwd)/deploy:/deploy:ro" \
#     debian@sha256:2c037a04925515fdd6ea85ea14a682d0e79931f5e9f5d07b6dbfc6ba12f9e858 \
#     bash /deploy/test/backup-copy-check.sh [/deploy/<changed racearena>]   (a sabotage run)
# ============================================================
set -uo pipefail

R="${1:-/deploy/racearena}"
fails=0 count=0
pass() { count=$((count + 1)); printf 'PASS  %s\n' "$*"; }
fail() { count=$((count + 1)); fails=$((fails + 1)); printf 'FAIL  %s\n' "$*"; }
check() { local name="$1"; shift; if "$@" >/tmp/out 2>&1; then pass "$name"; else fail "$name"; sed 's/^/      /' /tmp/out | tail -n 6; fi; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -q >/dev/null
apt-get install -y -q git >/dev/null

# ── an install's layout, as install.sh makes it (only what racearena reads) ────────────────────────
export RA_HOME=/opt/racearena RA_ETC=/etc/racearena RA_DATA=/var/lib/racearena RA_BACKUPS=/var/backups/racearena
mkdir -p "$RA_ETC/state" "$RA_DATA" "$RA_BACKUPS" "$RA_HOME"
git -C "$RA_HOME" init -q && git -C "$RA_HOME" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
: >"$RA_ETC/compose.env"
printf 'the accounts\n' >"$RA_DATA/users.json"
printf 'the races %s\n' "$(date -u +%s%N)" >"$RA_DATA/races.txt"
cp "$R" /usr/local/bin/racearena
chmod +x /usr/local/bin/racearena

# ── the stand-in for docker: the calls racearena makes, answered with real files ───────────────────
cat >/usr/local/bin/docker <<'STUB'
#!/usr/bin/env bash
# The stand-in for docker in backup-copy-check.sh (see its header).
args="$*"
case "$args" in
  *"/scripts/backup.mjs --out /backups"*)
    name="racearena-backup-$(date -u +%Y%m%dT%H%M%SZ).tar"
    tar -C "$RA_DATA" -cf "$RA_BACKUPS/$name" .
    (cd "$RA_BACKUPS" && sha256sum "$name" >"$name.sha256")
    echo "archive   : /backups/$name ($(stat -c %s "$RA_BACKUPS/$name") bytes)" ;;
  *"/scripts/backup.mjs --restore /backups/"*)
    a="${args#*--restore /backups/}"; a="${a%% *}"
    tar -C "$RA_DATA" -xf "$RA_BACKUPS/$a" ;;
  *"/scripts/status.mjs"*) echo "status: ok (stand-in)" ;;
  *" ps -q "*) echo stand-in-id ;;
  *" ps --format"*) echo "app: Up (healthy)" ;;
  "inspect -f {{if .State.Health}}"*) echo healthy ;;
  "inspect -f {{.State.Running}}"*) echo true ;;
  *) : ;;
esac
exit 0
STUB
chmod +x /usr/local/bin/docker

COPY_DIR="$RA_ETC/backup-copy"
REMOTE_DIR=/srv/onedrive-standin
# rclone with the install's own config, as racearena calls it (after setup).
rc() { rclone --config "$COPY_DIR/rclone.conf" "$@"; }
export COPY_DIR
export -f rc
newest_local() { ls "$RA_BACKUPS"/racearena-backup-*.tar 2>/dev/null | sort | tail -n 1 | xargs -r basename; }

echo "── 1 · with no setup nothing changes"
racearena backup >/tmp/b0 2>&1
check "a backup without the setup succeeds" test -n "$(newest_local)"
check "... and says nothing about a copy" bash -c "! grep -qi 'cop' /tmp/b0"
check "rclone is not installed by a backup" bash -c "! command -v rclone"
check "no backup-copy folder appears" test ! -e "$COPY_DIR"
racearena status >/tmp/s0 2>&1
check "racearena status shows no copy section" bash -c "! grep -q 'copy off the server' /tmp/s0"
check "backup-copy status says it is not set up (exit 1)" bash -c "! racearena backup-copy status >/tmp/o 2>&1 && grep -q 'not set up' /tmp/o"

echo "── 2 · setup (a local directory stands in for the OneDrive)"
racearena backup-copy setup --local "$REMOTE_DIR" </dev/null >/tmp/setup 2>&1
SETUP_RC=$?
check "setup succeeds" test "$SETUP_RC" -eq 0
check "it installed rclone from Debian's repository" bash -c "command -v rclone && dpkg -s rclone | grep -q '^Status: install ok'"
check "the password file is root-only (0600)" test "$(stat -c '%a %U' "$COPY_DIR/crypt-password")" = "600 root"
check "rclone.conf is root-only (0600)" test "$(stat -c '%a %U' "$COPY_DIR/rclone.conf")" = "600 root"
check "the copy is an rclone CRYPT remote" bash -c "grep -A2 '^\[racearena-copy\]' '$COPY_DIR/rclone.conf' | grep -q 'type = crypt'"
# grep -F -f reads the password from its file and compares; it is never printed here.
check "the password is NOT in setup's output" bash -c "! grep -q -F -f '$COPY_DIR/crypt-password' /tmp/setup"
check "with no terminal it says where to read the password once" grep -q "was NOT shown" /tmp/setup
check "its test copy was read back" grep -q "read back identical" /tmp/setup
check "setup refuses to run twice" bash -c "! racearena backup-copy setup --local /tmp/x </dev/null"
check "backup-copy test passes" racearena backup-copy test

echo "── 3 · a backup (what the daily timer runs) is copied, encrypted"
sleep 1
racearena backup >/tmp/b1 2>&1
A1="$(newest_local)"
check "racearena backup copied $A1" grep -q "copied off the server: $A1" /tmp/b1
check "the copy lists it, with its checksum" bash -c "rc lsf racearena-copy: | grep -qx '$A1' && rc lsf racearena-copy: | grep -qx '$A1.sha256'"
# The largest stored file is the archive (the other one is its checksum).
STORED="$(find "$REMOTE_DIR" -type f -printf '%s %p\n' | sort -n | tail -n 1 | cut -d' ' -f2-)"
check "what is stored is not readable as a tar" bash -c "! tar -tf '$STORED'"
check "no stored name is the archive's" bash -c "! find '$REMOTE_DIR' -name 'racearena-backup-*' | grep -q ."
check "the stored file differs from the archive" bash -c "! cmp -s '$STORED' '$RA_BACKUPS/$A1'"
check "the password is in no backup output" bash -c "! grep -q -F -f '$COPY_DIR/crypt-password' /tmp/b1"

echo "── 4 · the read-back restores"
RACES_BEFORE="$(cat "$RA_DATA/races.txt")"
mv "$RA_BACKUPS" "$RA_BACKUPS.local-lost"
mkdir -p "$RA_BACKUPS"
check "backup-copy fetch --newest brings $A1 back, checked" bash -c "racearena backup-copy fetch --newest | grep -q 'checked against its checksum'"
check "the fetched archive is the original" cmp -s "$RA_BACKUPS/$A1" "$RA_BACKUPS.local-lost/$A1"
rm -f "$RA_DATA"/*
check "racearena restore of the fetched archive" racearena restore "$A1"
check "the data is back" test "$(cat "$RA_DATA/races.txt" 2>/dev/null)" = "$RACES_BEFORE"
check "a damaged copy is refused at fetch" bash -c "printf 'x' >>'$STORED'; ! racearena backup-copy fetch '$A1'"
rm -rf "$RA_BACKUPS" && mv "$RA_BACKUPS.local-lost" "$RA_BACKUPS"

echo "── 5 · retention: past 14 days the copy is pruned, by the date in the name"
OLD="racearena-backup-$(date -u -d '-20 days' +%Y%m%dT%H%M%SZ).tar"
KEEP="racearena-backup-$(date -u -d '-13 days' +%Y%m%dT%H%M%SZ).tar"
printf 'old' | rc rcat "racearena-copy:$OLD"
printf 'old' | rc rcat "racearena-copy:$OLD.sha256"
printf 'kept' | rc rcat "racearena-copy:$KEEP"
sleep 1
racearena backup >/tmp/b2 2>&1
check "the 20-day-old copy is removed" bash -c "! rc lsf racearena-copy: | grep -q '$OLD'"
check "... and said so" grep -q "removed from the copy (older than 14 days): $OLD" /tmp/b2
check "the 13-day-old copy is kept" bash -c "rc lsf racearena-copy: | grep -qx '$KEEP'"

echo "── 6 · status warns when the newest copy is older than 2 days"
check "fresh: backup-copy status passes" racearena backup-copy status
check "fresh: racearena status shows the copy and passes" bash -c "racearena status >/tmp/s1 2>&1 && grep -q 'last copied:' /tmp/s1"
for f in $(rc lsf --files-only racearena-copy:); do rc deletefile "racearena-copy:$f"; done
STALE="racearena-backup-$(date -u -d '-3 days' +%Y%m%dT%H%M%SZ).tar"
printf 'stale' | rc rcat "racearena-copy:$STALE"
printf '%s\n' "$STALE" >"$RA_ETC/state/last-copy"
check "stale: backup-copy status warns and exits 1" bash -c "! racearena backup-copy status >/tmp/o 2>&1 && grep -q 'older than 2 days' /tmp/o"
check "stale: racearena status warns and exits 1" bash -c "! racearena status >/tmp/o 2>&1 && grep -q 'older than 2 days' /tmp/o"
for f in $(rc lsf --files-only racearena-copy:); do rc deletefile "racearena-copy:$f"; done
check "empty: backup-copy status warns and exits 1" bash -c "! racearena backup-copy status >/tmp/o 2>&1 && grep -q 'no archive in the copy' /tmp/o"
racearena backup >/dev/null 2>&1
check "after the next backup status passes again" racearena backup-copy status

echo "── 7 · the password opens the copies on a new install"
A3="$(newest_local)"
NEW=/tmp/new-install.conf
( umask 077
  printf '[racearena-copy]\ntype = crypt\nremote = %s\nfilename_encryption = standard\ndirectory_name_encryption = true\n' "$REMOTE_DIR"
  printf 'password = %s\n' "$(tr -d '\n' <"$COPY_DIR/crypt-password" | rclone obscure -)" ) >"$NEW"
check "a new config with the same password lists the copy" bash -c "rclone --config '$NEW' lsf racearena-copy: | grep -qx '$A3'"
check "... and reads the archive back as a tar" bash -c "rclone --config '$NEW' cat 'racearena-copy:$A3' | tar -tf - | grep -q races.txt"
( umask 077
  printf '[racearena-copy]\ntype = crypt\nremote = %s\npassword = %s\n' "$REMOTE_DIR" "$(printf 'wrong' | rclone obscure -)" ) >"$NEW.wrong"
check "a wrong password does not open it" bash -c "! rclone --config '$NEW.wrong' cat 'racearena-copy:$A3' 2>/dev/null | tar -tf - >/dev/null 2>&1"

echo
echo "summary: $((count - fails)) passed, $fails failed"
exit $((fails > 0))
