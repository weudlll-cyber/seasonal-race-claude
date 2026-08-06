// ============================================================
// cohesion.mjs — Stage-0 LINK observer (INFRA cohesion build). SIM-ONLY, READ-ONLY.
//
// Measures the field's gap structure in RACER LENGTHS, per frame. It CHANGES NO RACE STATE — it
// reads r.t / r.index / r.finished / r.isHeroChoreographed / r.trajectoryMult and returns numbers.
// The length conversion is the SHARED one (raceLengths.js) — lenScale is passed in, never re-derived
// here; percentile is the shared one (gap-metrics.mjs). One module, one concern (the gap structure).
//
// A "link" is the gap between two consecutive live racers (rank-ordered), in racer lengths:
//   link = arcT(ahead.t, behind.t, isOpen) * lenScale.
// arcT handles the open-vs-closed lap seam (a prior cohesion attempt died on a multi-lap wrap bug);
// see cohesion.test.mjs for the seam golden.
//
// STAGE 0 IS MEASURE-ONLY: no correction is applied. Where a hypothetical correction WOULD apply we
// only COUNT (duty-cycle projection, servo-conflict) — we never act.
// ============================================================
import { arcT } from "../../../client/src/modules/raceLengths.js";
import { percentile } from "./gap-metrics.mjs";

export const COHESION_CAPS = [2, 3, 4, 5]; // candidate gap caps (racer lengths)
const CPS = [0.25, 0.5, 0.75, 0.9]; // checkpoint progress fractions (+ the line)
export const COHESION_REF_CAP = 3; // reference cap for hero-adjacency + frontmost reporting

// Consecutive links of a live field, rank-ordered (leader first). Read-only.
// Returns { live, links:[{ len, ahead, behind }] } — link.len in racer lengths.
export function consecutiveLinks(racers, isOpen, lenScale) {
  const live = racers
    .filter((r) => !r.finished)
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.index - b.index));
  const links = [];
  for (let i = 0; i < live.length - 1; i++) {
    links.push({
      len: arcT(live[i].t, live[i + 1].t, isOpen) * lenScale,
      ahead: live[i],
      behind: live[i + 1],
    });
  }
  return { live, links };
}

// Snapshot of one frame's link distribution + the frontmost link over the reference cap (with the
// racers-ahead count and whether the two racers straddling it are heroes).
function snapshot(links) {
  const L = links.map((x) => x.len);
  const fi = links.findIndex((x) => x.len > COHESION_REF_CAP);
  const frontOverRef =
    fi >= 0
      ? {
          len: +links[fi].len.toFixed(3),
          nAhead: fi + 1,
          aheadHero: !!links[fi].ahead.isHeroChoreographed,
          behindHero: !!links[fi].behind.isHeroChoreographed,
        }
      : null;
  return {
    median: +percentile(L, 0.5).toFixed(3),
    p90: +percentile(L, 0.9).toFixed(3),
    max: L.length ? +Math.max(...L).toFixed(3) : 0,
    min: L.length ? +Math.min(...L).toFixed(3) : 0,
    frontOverRef,
  };
}

// The observer: one per race. onFrame() once per frame (the single hot-loop seam); result() at end.
export function makeCohesionObserver({ isOpen, lenScale, finishT }) {
  const cps = [];
  let nextCp = 0;
  let frames = 0;
  const minLinks = []; // per-frame minimum link (the "glued" detector)
  let lineSnap = null;
  // Per candidate cap: framesOver (≥1 link over cap), candidate counts (duty), servo-conflict counts.
  const perCap = COHESION_CAPS.map((cap) => ({
    cap,
    framesOver: 0,
    candSum: 0,
    candMax: 0,
    totalCand: 0,
    servoConflictCand: 0,
  }));
  // Hero adjacency of the frontmost link over the reference cap, tallied per frame it exists.
  const heroTally = { frames: 0, hh: 0, hp: 0, ph: 0, pp: 0 };

  return {
    onFrame(racers, progress) {
      frames++;
      const { live, links } = consecutiveLinks(racers, isOpen, lenScale);
      if (links.length === 0) return;
      const L = links.map((x) => x.len);
      minLinks.push(Math.min(...L));

      for (const pc of perCap) {
        let cand = 0;
        let conflict = 0;
        for (const lk of links) {
          if (lk.len > pc.cap) {
            cand++; // the racer AHEAD of an over-cap link is where a downward correction would apply
            if ((lk.ahead.trajectoryMult ?? 1) > 1.0 + 1e-6) conflict++; // servo pushing that racer UP
          }
        }
        if (cand > 0) pc.framesOver++;
        pc.candSum += cand;
        if (cand > pc.candMax) pc.candMax = cand;
        pc.totalCand += cand;
        pc.servoConflictCand += conflict;
      }

      const fi = links.findIndex((x) => x.len > COHESION_REF_CAP);
      if (fi >= 0) {
        heroTally.frames++;
        const a = !!links[fi].ahead.isHeroChoreographed;
        const b = !!links[fi].behind.isHeroChoreographed;
        if (a && b) heroTally.hh++;
        else if (a && !b) heroTally.hp++;
        else if (!a && b) heroTally.ph++;
        else heroTally.pp++;
      }

      while (nextCp < CPS.length && progress >= CPS[nextCp]) {
        cps.push({ progress: CPS[nextCp], ...snapshot(links) });
        nextCp++;
      }
      if (!lineSnap && finishT > 0 && live[0].t >= finishT)
        lineSnap = snapshot(links);
    },

    result() {
      return {
        frames,
        lenScale: +lenScale.toFixed(4),
        checkpoints: cps,
        line: lineSnap,
        // The "glued" detector: how tight is the tightest gap each frame.
        minLinkPerFrame: {
          median: +percentile(minLinks, 0.5).toFixed(3),
          p10: +percentile(minLinks, 0.1).toFixed(3),
        },
        // The limiter-vs-spring numbers, per candidate cap.
        perCap: perCap.map((pc) => ({
          cap: pc.cap,
          fracTimeExceeded: frames ? +(pc.framesOver / frames).toFixed(4) : 0, // fraction of frames with ≥1 over-cap link
          dutyMeanCandidates: pc.framesOver
            ? +(pc.candSum / pc.framesOver).toFixed(2)
            : 0, // mean racers corrected WHEN active
          dutyMaxCandidates: pc.candMax, // most racers corrected at once
          servoConflictFrac: pc.totalCand
            ? +(pc.servoConflictCand / pc.totalCand).toFixed(4)
            : 0, // of correction-instances, share where the servo pushes up
        })),
        // Hero adjacency of the frontmost over-(refCap) link: settles whether the chasm is hero→hero.
        heroFrontmost: {
          refCap: COHESION_REF_CAP,
          framesWithFrontOver: heroTally.frames,
          heroHero: heroTally.hh,
          heroPack: heroTally.hp, // ahead=hero, behind=pack
          packHero: heroTally.ph, // ahead=pack, behind=hero
          packPack: heroTally.pp,
        },
      };
    },
  };
}
