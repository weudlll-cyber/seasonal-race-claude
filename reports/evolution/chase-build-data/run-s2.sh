#!/bin/sh
# Stage 2: 3 arms x 10 tracks = 30 jobs of 30 races each. Concurrency 10, leaving cores free.
TRACKS="city-circuit dirt-oval garden-path ice-track luger-hill mountainstreet river-run searound seatrack space-sprint"
JOBS=""
for A in A0 G4 G5; do for T in $TRACKS; do JOBS="$JOBS $A:$T"; done; done
i=0
for J in $JOBS; do
  A=${J%%:*}; T=${J##*:}
  node chase-sweep.mjs --seeds=30 --stage=quiet --arm=$A --track=$T --tag=s2-$A-$T >/dev/null 2>&1 &
  i=$((i+1))
  if [ $((i % 10)) -eq 0 ]; then wait; fi
done
wait
echo "stage 2 complete"
