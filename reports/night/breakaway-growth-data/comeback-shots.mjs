// WHICH SEEDS LOST A COMEBACK SHOT ON THE RENAMED RACER.
//
// One arm per tree: `--root=<checkout>`. The race is byte-identical between master and the rename
// branch (PURSUER-RENAME-1 measured 300/300 on order and on all 40 finishing times), so the racer
// INDEX of the fall-back cast is the same on both arms and the two runs are directly comparable.
//
// A COMEBACK_ZOOM shot's subject is `cd.comebackLockedRacerIndex` (CameraDirector.js:5491).
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith(`--${k}=`)); return h ? h.slice(k.length + 3) : d; };
// Default: the repository this file is committed in (three levels up). `--root=<checkout>` points
// it at the other arm — a detached worktree at master is how the two arms below were driven.
const ROOT = arg("root", join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const OUT = arg("out", "shots.json");
const SEEDS = Number(arg("seeds", 30));
const ONLY = arg("track", null);
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const RD = await import(u("scripts/lib/raceDriver.mjs"));
const { QUICK_TEST_NAMES } = await import(u("client/src/modules/racerNames.js"));
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const WORLD = RD.worldForActionStage("wild");
const out = [];
for (const geo of RD.loadTracks({ only: ONLY })) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const id = RD.resolveIdentity({ racers: 40, raceSeed: seed, seconds: 60, racerType: RD.TRACK_DEFAULT_RACER, roster: QUICK_TEST_NAMES, note: "PURSUER-SHOTS" });
    const race = RD.buildRace(geo, id, DEFAULT_CAMERA_CONFIG, WORLD);
    const { cd, raceCfg } = race;
    const ctl = raceCfg.racePlanController;
    const shots = [];
    let prev = null;
    RD.runRace(race, id, DEFAULT_CAMERA_CONFIG, ({ st }) => {
      const s = cd.hudState;
      if (s === "COMEBACK_ZOOM" && prev !== "COMEBACK_ZOOM") {
        shots.push({ idx: cd.comebackLockedRacerIndex, prog: st.raceProgress });
      }
      prev = s;
    });
    const roles = ctl.getHeroRoles();
    // `getHeldRelease()` is a MAP (racePlanner.js:1139), not an object. Reading it with
    // Object.keys silently returns nothing and marks every staged hero un-held.
    const held = ctl.getHeldRelease();
    const heldSet = new Set(held ? [...held.keys()] : []);
    const roleArr = roles ? [...roles.entries()].map(([i, r]) => ({ i, role: r, held: heldSet.has(i), drawnRank: ctl.getTargetRank(i) })) : [];
    // THE FALL-BACK CAST — the racer this rename renames. On master he is `comebacker`, not held and
    // not the drawn winner; on the branch he is `pursuer`. Both forms are matched so one script
    // reads both arms.
    const fallback = roleArr.filter((x) => x.role === "pursuer" || (x.role === "comebacker" && !x.held && x.drawnRank !== 1)).map((x) => x.i);
    out.push({ track: geo.id, seed, shots, roles: roleArr, fallback });
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.error(`${out.length} races -> ${OUT}`);
