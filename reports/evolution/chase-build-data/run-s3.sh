#!/bin/sh
TRACKS="city-circuit dirt-oval garden-path ice-track luger-hill mountainstreet river-run searound seatrack space-sprint"
i=0
for A in A0 G5; do for T in $TRACKS; do
  node chase-sweep.mjs --seeds=30 --stage=wild --arm=$A --track=$T --tag=s3-$A-$T >/dev/null 2>&1 &
  i=$((i+1)); if [ $((i % 10)) -eq 0 ]; then wait; fi
done; done
wait
echo "piece 4 complete"
