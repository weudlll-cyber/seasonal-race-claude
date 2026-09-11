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
      let postChaosRank = new Map(); // index -> rank on the frame the plan arrived
      const atMark = new Map(); // index -> rank at the release mark
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
          }
        }
        const p = st.raceProgress ?? 0;
        if (!marked && p >= MARK) {
          marked = true;
          for (const h of heroes ?? []) atMark.set(h.index, rankOf(st.racers, h.index));
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
          return {
            index: h.index,
            postChaosRank: postChaosRank.get(h.index) ?? null,
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
              return `#${h.index} pc${postChaosRank.get(h.index)}→r${m}→${f}`;
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
