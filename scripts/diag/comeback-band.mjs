// ============================================================
// File:        scripts/diag/comeback-band.mjs
// Project:     RaceArena — COMEBACK-BAND-1
//
// WHAT THIS OWNS: what the CAST comebacker actually does, per field size — where he is when the
// release comes, where he finishes, and HOW MANY PLACES HE GAINS. That last number is the one the
// owner judges by: he watched four shots move a racer from 6th to 3rd and said those are not
// comebacks.
//
// WHAT IT DELIBERATELY DOES NOT DO:
//   · IT ARMS NOTHING. There is no hold arm and no temporary edit anywhere in its path. It reads the
//     plan the product builds and watches the race the product runs, so its numbers describe the
//     shipped behaviour rather than a measurement rig.
//   · IT DOES NOT JUDGE FAIRNESS. Band-reach against the 70% gate is `docs/FAIRNESS.md`'s question
//     and `sim-fairness.mjs` is its instrument; a second opinion computed here would be a second
//     authority on a number that has one home.
//   · IT PREDICTS NOTHING. No reachability arithmetic — that model assumed a passive field and was
//     wrong by 7-14 places.
//
// ★ ADDED BY DIRECTION-AUTHORITY-1 (2026-09-12): whether each comebacker is the HELD one, and the
// PACE DEFICIT he runs while held. `held` is read from the PLAN (`getHeldRelease`), never guessed
// from the race — the role label is 'comebacker' for both the held comebacker and the fall-back one,
// and the previous attempt to separate them by watching the race flagged 339 of 355. The deficit is
// his distance travelled over the hold window against the FIELD MEDIAN over the same window, which
// is a ratio of two measured distances and needs no model of either.
//
// ★ ADDED BY COMEBACK-CONSTANT-DEFICIT-1: the HOLD DEPTH — the deepest rank the comebacker reaches
// between the choreo anchor and the release mark. Reported as a RANK, against which a reader
// compares the director's staging rank for that field size. Measured on the race, not read from the
// plan, because the plan does not publish a peak rank.
//
// ★ AND A BOOLEAN "was he STAGED?" IS DELIBERATELY NOT DERIVED HERE. One was written and MEASURED:
// `deepestRank >= postChaosRank + 2` flagged 339 of 355 comebackers, because every racer dips two
// places somewhere in a window half a race long. It was reporting ordinary jostling under the name
// of staging, so it was removed rather than tuned — the threshold that would separate them is the
// authored peak rank, and that is a PLAN fact this harness cannot see.
//
// ★ WHY "CAST AT ALL" IS A REPORTED NUMBER AND NOT A FOOTNOTE. Below a field size the rule casts
// NOBODY on purpose, because at N=10 the first third ends around rank 3, already inside the top 5.
// A run that shows fewer comebackers is therefore not a regression, and the only way to tell that
// from a broken rule is to count both — cast, and deliberately not cast — per size.
// ============================================================

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadTracks, resolveIdentity, buildRace, runRace } from "../lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const nums = (s) => s.split(",").map(Number).filter(Number.isFinite);

const SIZES = nums(ARG("sizes", "10,20,30,40,60,100"));
const SEEDS = nums(ARG("seeds", "41000,41001,41002"));
const MARK = Number(ARG("mark", "0.70"));
const JSON_OUT = ARG("json", null);
const ONLY_TRACK = ARG("track", null);

const CAMERA_CONFIG = { ...DEFAULT_CAMERA_CONFIG };
const tracks = loadTracks(ONLY_TRACK ? { only: ONLY_TRACK } : {});
if (!tracks.length) {
  console.error("comeback-band: no tracks loaded. Refusing to report on an empty set.");
  process.exit(2);
}

const rankOf = (racers, index) => {
  const sorted = [...racers].sort((a, b) => b.t - a.t);
  const i = sorted.findIndex((r) => r.index === index);
  return i < 0 ? null : i + 1;
};

const rows = [];

for (const geo of tracks) {
  for (const N of SIZES) {
    for (const seed of SEEDS) {
      const identity = resolveIdentity({ raceSeed: seed, racers: N });
      const race = buildRace(geo, identity, CAMERA_CONFIG);
      const ctl = race.meta.racePlanController;

      let heroes = null;
      let heldRelease = null; // index -> release progress, from the PLAN
      let holdStartT = null; // index -> t at the choreo anchor (hold window start)
      let fieldStartT = null; // every racer's t at that same moment
      const holdPace = new Map(); // index -> his distance / the field's median distance, over the hold
      let postChaosRank = new Map(); // index -> rank on the frame the plan arrived
      const atMark = new Map(); // index -> rank at the release mark
      const deepest = new Map(); // index -> deepest (largest) rank seen anchor..mark
      let marked = false;

      runRace(race, identity, CAMERA_CONFIG, ({ st }) => {
        if (!heroes) {
          const cp = ctl?.getCameraPlan?.();
          if (cp) {
            heroes = (cp.heroes ?? []).map((h) => ({
              index: h.index,
              role: h.role,
              finalRank: h.finalRank ?? null,
            }));
            for (const h of heroes) postChaosRank.set(h.index, rankOf(st.racers, h.index));
            heldRelease = ctl?.getHeldRelease?.() ?? null;
            // the hold window opens here: record everyone's distance so the deficit is a ratio of
            // two distances measured over the SAME interval.
            holdStartT = new Map(st.racers.map((r) => [r.index, r.t]));
            fieldStartT = holdStartT;
          }
        }
        const p = st.raceProgress ?? 0;
        if (heroes && !marked) {
          for (const h of heroes) {
            const rk = rankOf(st.racers, h.index);
            if (rk != null && rk > (deepest.get(h.index) ?? 0)) deepest.set(h.index, rk);
          }
        }
        if (!marked && p >= MARK) {
          marked = true;
          for (const h of heroes ?? []) atMark.set(h.index, rankOf(st.racers, h.index));
          // close the hold window and price the deficit
          if (fieldStartT) {
            const moved = st.racers
              .map((r) => r.t - (fieldStartT.get(r.index) ?? r.t))
              .filter((d) => Number.isFinite(d))
              .sort((a, b) => a - b);
            const fieldMedian = moved.length ? moved[Math.floor(moved.length / 2)] : null;
            if (fieldMedian > 0) {
              for (const h of heroes ?? []) {
                const r = st.racers.find((x) => x.index === h.index);
                if (!r) continue;
                const mine = r.t - (fieldStartT.get(h.index) ?? r.t);
                holdPace.set(h.index, mine / fieldMedian);
              }
            }
          }
        }
        return true;
      });

      const comebackers = (heroes ?? []).filter((h) => h.role === "comebacker");
      rows.push({
        track: geo.id,
        N,
        seed,
        heroCount: (heroes ?? []).length,
        roles: (heroes ?? []).reduce((m, h) => ((m[h.role] = (m[h.role] ?? 0) + 1), m), {}),
        castAny: comebackers.length > 0,
        comebackers: comebackers.map((h) => {
          const rankAtMark = atMark.get(h.index) ?? null;
          const finish = rankOf(race.st.racers, h.index);
          const pc = postChaosRank.get(h.index) ?? null;
          const deep = deepest.get(h.index) ?? null;
          const pace = holdPace.get(h.index) ?? null;
          return {
            index: h.index,
            postChaosRank: pc,
            deepestRank: deep,
            // read from the plan, not inferred from the race
            held: heldRelease ? heldRelease.has(h.index) : false,
            releaseAt: heldRelease ? (heldRelease.get(h.index) ?? null) : null,
            // 1.0 = exactly the field's pace over the hold; 0.94 = six percent slower
            holdPaceRatio: pace,
            rankAtMark,
            finishRank: finish,
            placesGained:
              rankAtMark != null && finish != null ? rankAtMark - finish : null,
            gainedFromPostChaos:
              postChaosRank.get(h.index) != null && finish != null
                ? postChaosRank.get(h.index) - finish
                : null,
            top5: finish != null && finish <= 5,
          };
        }),
      });
      process.stderr.write(
        `  ${geo.id.padEnd(15)} N=${String(N).padStart(3)} seed ${seed}  ` +
          `comebackers ${comebackers.length}  ` +
          comebackers
            .map((h) => {
              const m = atMark.get(h.index);
              const f = rankOf(race.st.racers, h.index);
              const hh = heldRelease && heldRelease.has(h.index) ? "HELD " : "";
              return `${hh}#${h.index} pc${postChaosRank.get(h.index)}→r${m}→${f}`;
            })
            .join(" ") +
          "\n",
      );
    }
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ sizes: SIZES, seeds: SEEDS, mark: MARK, rows }, null, 1));
  process.stderr.write(`\ncomeback-band: wrote ${rows.length} row(s) to ${JSON_OUT}\n`);
}
