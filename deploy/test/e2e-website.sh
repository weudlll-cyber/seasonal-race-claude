#!/usr/bin/env bash
# ============================================================
# File:        e2e-website.sh
# Path:        deploy/test/e2e-website.sh
# Project:     RaceArena — WEBSITE-EMBED-1 piece 5b (2026-11-11)
# Description: The website-mode installer test, beside the standalone one (e2e-local.sh, unchanged):
#              a THROWAWAY Ubuntu 24.04 machine — a privileged container with systemd as init and
#              its own Docker — in which deploy/test/e2e-website-inner.sh plays the website's server
#              (fake markers, the stand-in as the website, a real nginx or Caddy) and runs the real
#              install.sh. ONE proxy variant per run, never both at once.
#
# Usage: bash e2e-website.sh nginx|caddy <workDir> <repoClone> <refA> <refB>
#   <repoClone>  a git repository holding both refs (copied bare into the machine; the install clones it)
#   <refA>       the version installed      <refB>  a newer one, for "update keeps the mode"
# The machine is capped (--cpus 6, --memory 6g: this computer keeps several cores free). Everything it
# makes is named ra-e2e-web* and removed at the end — the container, its two Docker volumes (the
# inner Docker's and containerd's stores: neither may sit on the container's own overlay) —
# unless RA_E2E_KEEP=1. No port of this computer is published.
# ============================================================
set -uo pipefail

VARIANT="$1" WORK="$2" CLONE="$3" REF_A="$4" REF_B="$5"
HERE="$(cd "$(dirname "$0")" && { pwd -W 2>/dev/null || pwd; })"
export MSYS_NO_PATHCONV=1
UBUNTU=ubuntu:24.04@sha256:24737cef17f4e22b1977df7d9a05e77c4e28b7da5b8911f8d8ccda136bf3573c
NAME=ra-e2e-web
mkdir -p "$WORK"
WORK_W="$(cd "$WORK" && { pwd -W 2>/dev/null || pwd; })"

remove_machine() {
  docker rm -f "$NAME" >/dev/null 2>&1
  docker volume rm "$NAME-docker" "$NAME-containerd" >/dev/null 2>&1
}
# A machine left by an earlier run is ALWAYS removed first; RA_E2E_KEEP=1 keeps only THIS run's at the end.
remove_machine
cleanup() { [[ "${RA_E2E_KEEP:-0}" == 1 ]] || remove_machine; }
trap cleanup EXIT

# The machine's image: systemd, its own Docker (Ubuntu's packages), nginx (enabled only by the nginx
# variant), git and openssl. Built once and reused by the second variant; removed by the caller.
cat >"$WORK/Dockerfile" <<EOF
FROM $UBUNTU
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -q && apt-get install -y -q --no-install-recommends systemd systemd-sysv dbus \\
      ca-certificates curl git openssl iproute2 docker.io docker-compose-v2 nginx \\
    && apt-get clean && rm -rf /var/lib/apt/lists/* \\
    && systemctl enable docker && systemctl disable nginx
STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
EOF
docker build -q -t "$NAME:img" "$WORK_W" >/dev/null || { echo "FAIL  the test machine's image builds"; exit 1; }

# The repository, bare, for the install to clone (never a link into the working copy).
rm -rf "$WORK/repo.git"
git clone --quiet --bare --no-local "$(cd "$CLONE" && { pwd -W 2>/dev/null || pwd; })" "$WORK_W/repo.git"

docker run -d --name "$NAME" --privileged --cgroupns=host --cpus 6 --memory 6g \
  --tmpfs /run --tmpfs /run/lock -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v "$NAME-docker:/var/lib/docker" -v "$NAME-containerd:/var/lib/containerd" -v "$WORK_W/repo.git:/src/repo.git:ro" -v "$HERE/..:/e2e:ro" \
  "$NAME:img" >/dev/null
sleep 8
docker exec "$NAME" bash /e2e/test/e2e-website-inner.sh "$VARIANT" "$REF_A" "$REF_B" | tee "$WORK/out-$VARIANT.txt"
docker exec "$NAME" cat /root/results.txt >"$WORK/results-$VARIANT.txt" 2>/dev/null
for f in install.log checks.log status.log uninstall.log; do docker exec "$NAME" cat "/root/$f" >"$WORK/$VARIANT-$f" 2>/dev/null; done
! grep -q '^FAIL' "$WORK/results-$VARIANT.txt"
