import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.argv[2];
const SEED = Number(process.argv[3] ?? 117);
const N = 20;
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { resolveIdentity, loadTracks, buildRace, TRACK_DEFAULT_RACER } = await import(
  u("scripts/lib/raceDriver.mjs")
);
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { stepRacePhysics } = await import(u("client/src/modules/raceCore.js"));
const gr = await import(u("scripts/parity/goldenRunner.mjs"));

const NAMES = resolveNameSet(DEFAULT_NAME_SET);
const geo = new Map(loadTracks().map((g) => [g.id, g])).get("river-run");

// ── ARM A: the HARNESS, exactly as every probe in this arc ran it (roster now supplied) ──────────
const identity = resolveIdentity({
  trackId: "river-run",
  raceSeed: SEED,
  racers: N,
  racerType: TRACK_DEFAULT_RACER,
  roster: NAMES.slice(0, N),
});
const { st, raceCfg } = buildRace(geo, identity, { ...DEFAULT_CAMERA_CONFIG });
raceCfg.computePositions();
const maxTime = 600 * 1000;
while (st.finishedCount < st.racers.length && st.physicsTs < maxTime) stepRacePhysics(st, raceCfg);
const dnfA = st.racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
for (let k = 0; k < dnfA.length; k++) dnfA[k].finishRank = st.finishedCount + 1 + k;
const A = st.racers.map((r) => ({
  i: r.index,
  name: r.name ?? null,
  rank: r.finishRank,
  t: r.finishTimeMs == null ? null : +(r.finishTimeMs / 1000).toFixed(4),
}));

// ── ARM B: the project's own BROWSER-FAITHFUL arm ────────────────────────────────────────────────
const baseIdent = gr.buildIdentity({
  trackId: "river-run",
  racerType: "duck",
  seed: SEED,
  nRacers: N,
  shape: "open-in-range",
});
// Quick Test derives 60 s for river-run; pin the identity to it so both arms race the same length.
const ident = { ...baseIdent, requestedSeconds: 60 };
const real = gr.realArm(ident);
const B = real.results.map((r) => ({
  i: r.racerIndex,
  rank: r.finalRank,
  t: r.finishTime == null ? null : +r.finishTime.toFixed(4),
}));

// ── COMPARE ──────────────────────────────────────────────────────────────────────────────────────
const byRankA = [...A].sort((a, b) => a.rank - b.rank);
const byRankB = [...B].sort((a, b) => a.rank - b.rank);
let orderSame = true;
let timeMax = 0;
for (let k = 0; k < N; k++) {
  if (byRankA[k].i !== byRankB[k].i) orderSame = false;
  const ta = A.find((x) => x.i === k)?.t;
  const tb = B.find((x) => x.i === k)?.t;
  if (ta != null && tb != null) timeMax = Math.max(timeMax, Math.abs(ta - tb));
}
console.log(`river-run  seed=${SEED}  n=${N}  duck  roster=first ${N} default names\n`);
console.log("  rank | harness racer (name)            | browser-faithful racer | harness t | browser t");
for (let k = 0; k < N; k++) {
  const a = byRankA[k],
    b = byRankB[k];
  const flag = a.i === b.i ? "  " : "<>";
  console.log(
    `  ${String(k + 1).padStart(4)} | ${String(a.i).padStart(2)} ${String(a.name ?? "").padEnd(10)} ${flag} | ` +
      `${String(b.i).padStart(21)} | ${String(a.t ?? "DNF").padStart(9)} | ${String(b.t ?? "DNF").padStart(9)}`
  );
}
console.log(`\n  FINISHING ORDER IDENTICAL: ${orderSame}`);
console.log(`  largest finish-time difference: ${timeMax.toFixed(4)} s`);
console.log(`  browser-faithful outcome hash: ${real.hash}`);
