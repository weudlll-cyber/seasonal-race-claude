// ============================================================
// PackDynamicsEngine.js
// Pack-Dynamics PoC — three-layer simulation engine.
//
// Layer 1: Groups (pack entities with shared speed / centroid t)
// Layer 2: Hero racers (individual t, lateral micro-movement, duel logic)
// Layer 3: Crowd racers (position derived from group centroid + fixed offsets)
//
// Simulation order per frame (spec §PFLICHT-DEFINITIONEN 1):
//   a) Groups update  b) Heroes update  c) Crowd update
//   d) Z-sort        e) Rendering (caller's responsibility)
// ============================================================

// ─── Seeded RNG (Mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Decision: BASE_SPEED chosen so peloton completes ~3 laps in 60 s.
// Centerline circumference ≈ 1 720 px → 3 laps = 5 160 px in 60 s = 86 px/s.
// In normalised-t units at 60 fps: 86 / 60 / 1720 ≈ 0.000834/frame (16 ms).
export const BASE_SPEED = 0.00085; // t per 16 ms frame

// Decision: group speed multipliers create visible gaps in ~15 s.
// Fix (Phase-1 repair): spread was 4.4 % — invisible on screen. Now 16 % → groups
// visibly separate within 5–10 s; P1–P40 gap ≥20 % of a lap after 30 s.
const GROUP_SPEEDS = { lead: 1.08, peloton: 1.0, chase: 0.92 };

// Decision: merge when centroids are within 8/1000 of a lap.
const MERGE_THRESHOLD = 0.008;

// Decision: speed perturbation every 4–8 s, ±5 % of BASE_SPEED, mean-reverting.
// Bug fix: original 0.003 was 3.5× BASE_SPEED — way too large, causing instant merge.
const PERTURB_AMPLITUDE = BASE_SPEED * 0.05; // ≈ 0.0000425 t/frame

// Decision: hero promotion — crowd racer within 0.025 t of any hero,
// OR time-based fallback every ~8 s to prevent hero pool from draining.
// Fix (Phase-1 repair): threshold was 0.015 and prob 0.3 % — too rare to fire.
const PROMO_T_THRESHOLD = 0.025;
const PROMO_FALLBACK_INTERVAL_MS = 8000; // forced promo if pool below MIN_HEROES+2

// Hysteresis (spec §PFLICHT-DEFINITIONEN 3):
const MIN_HERO_DURATION_MS = 5000;
const DEMOTION_COOLDOWN_MS = 3000;
const MAX_HEROES = 10;
const MIN_HEROES = 5; // never drop below this to keep action visible

// Duel: two heroes within this t-gap are forced side-by-side.
const DUEL_T_THRESHOLD = 0.011;

// Lateral spring constants.
// Fix (Phase-1 repair, round 2): HOME_K raised from 0.038 to 0.10 so the spring
// tracks the sinusoidal target with much less attenuation (natural period ~20 frames
// vs driving period 125–312 frames → quasi-static tracking regime).
const HOME_K = 0.1;
const DUEL_LATERAL_TARGET = 0.28; // side-by-side separation
// Fix (Phase-1 repair): was 0.17 → only ~6 px world-space. physicalY 1.0 ≈ 75 px
// (half corridor), so 0.65 → ~49 px target; spring tracks at ~80 % → ~39 px ≥30 px.
const MICRO_DRIFT_AMP = 0.65;

// Crowd cloud half-width (physicalY units).
const CLOUD_Y_HALF = 0.82;

// ─── Name pool ───────────────────────────────────────────────────────────────
const NAMES = [
  'Blaze',
  'Storm',
  'Thunder',
  'Flash',
  'Comet',
  'Arrow',
  'Jet',
  'Bolt',
  'Dash',
  'Swift',
  'Gale',
  'Frost',
  'Ember',
  'Nova',
  'Titan',
  'Spark',
  'Raven',
  'Dusk',
  'Echo',
  'Flint',
  'Ghost',
  'Hawk',
  'Ivy',
  'Jade',
  'Kite',
  'Lark',
  'Mist',
  'Night',
  'Onyx',
  'Pike',
  'Quill',
  'Rush',
  'Sage',
  'Thorn',
  'Umber',
  'Vale',
  'Wren',
  'Xena',
  'Yew',
  'Zeal',
];

// ─── Coat assignment (deterministic by index) ────────────────────────────────
const COAT_IDS = [
  'cream',
  'bay',
  'chestnut',
  'palomino',
  'gray',
  'black',
  'dark-bay',
  'buckskin',
  'sorrel',
  'roan',
  'dun',
];

const RACER_COLORS = [
  '#ff6b35',
  '#4fc3f7',
  '#a5d6a7',
  '#ffcc02',
  '#ce93d8',
  '#f48fb1',
  '#80cbc4',
  '#ffab40',
  '#90caf9',
  '#ef9a9a',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Continuous track fraction for rendering (wrap to [0, 1)).
export function tPos(t) {
  return ((t % 1) + 1) % 1;
}

// Triangular-distribution lateral offset — more density at centre.
function cloudY(rng) {
  return ((rng() + rng()) / 2 - 0.5) * 2 * CLOUD_Y_HALF;
}

// ─── Main engine class ────────────────────────────────────────────────────────
export class PackDynamicsEngine {
  constructor(seed = 42, numRacers = 40) {
    this._numRacers = numRacers;
    this.raceTimeMs = 0;
    this.restart(seed);
  }

  // Full reset with a new seed.
  restart(seed) {
    this.raceTimeMs = 0;
    this._nextFallbackPromoAt = PROMO_FALLBACK_INTERVAL_MS;
    this.promotionCount = 0;
    this.demotionCount = 0;
    const rng = mulberry32(seed >>> 0);
    this._rng = rng;

    // ── Build groups ────────────────────────────────────────────────────────
    // Decision: 3 groups at start (spec §ARCHITEKTUR Schicht 1).
    //   Lead  : racers  0 –  3  (4)   — small breakaway
    //   Peloton: racers 4 – 31  (28)  — main field
    //   Chase : racers 32 – 39  (8)   — trail group
    this.groups = [
      {
        id: 'lead',
        label: 'Führungs-Gruppe',
        t: 0.04, // larger initial gap so groups are visually separate at t=0
        speed: BASE_SPEED * GROUP_SPEEDS.lead,
        baseSpeed: BASE_SPEED * GROUP_SPEEDS.lead,
        nextPerturbAt: 4000 + rng() * 4000,
        members: new Set(),
      },
      {
        id: 'peloton',
        label: 'Hauptfeld',
        t: 0.0,
        speed: BASE_SPEED * GROUP_SPEEDS.peloton,
        baseSpeed: BASE_SPEED * GROUP_SPEEDS.peloton,
        nextPerturbAt: 4000 + rng() * 4000,
        members: new Set(),
      },
      {
        id: 'chase',
        label: 'Verfolger',
        t: -0.03, // larger initial gap
        speed: BASE_SPEED * GROUP_SPEEDS.chase,
        baseSpeed: BASE_SPEED * GROUP_SPEEDS.chase,
        nextPerturbAt: 4000 + rng() * 4000,
        members: new Set(),
      },
    ];

    const nRacers = this._numRacers;

    // ── Initial hero set (spec §ARCHITEKTUR Schicht 2) ──────────────────────
    // Decision: all lead-group members + 3 peloton members as initial heroes.
    // Total 7 heroes at start (within 5–10 range).
    const initialHeroIndices = new Set([0, 1, 2, 3, 8, 16, 26]);

    // ── Build racers ────────────────────────────────────────────────────────
    this.racers = Array.from({ length: nRacers }, (_, i) => {
      const groupId = i < 4 ? 'lead' : i < 32 ? 'peloton' : 'chase';
      const group = this.groups.find((g) => g.id === groupId);
      group.members.add(i);

      const isHero = initialHeroIndices.has(i);
      const tOffset = (rng() - 0.5) * 0.036; // ±0.018 spread within group
      const cY = cloudY(rng);

      return {
        index: i,
        name: NAMES[i % NAMES.length],
        coatId: COAT_IDS[i % COAT_IDS.length],
        color: RACER_COLORS[i % RACER_COLORS.length],

        // Group ownership (spec §OWNERSHIP)
        groupId,

        // Hero/Crowd status (spec §OWNERSHIP)
        isHero,
        heroSince: isHero ? 0 : null,
        demotedAt: null,

        // Track progress (spec §OWNERSHIP):
        //   Hero  → owns its own t
        //   Crowd → derived from group.t + tOffset (set in _updateCrowd)
        t: group.t + tOffset,
        tOffset, // fixed crowd offset from group centroid

        // Lateral (spec §OWNERSHIP):
        //   Hero  → owns physicalY
        //   Crowd → derived from cloudOffsetY (set in _updateCrowd)
        physicalY: cY,
        cloudOffsetY: cY, // fixed crowd lateral position within cloud

        lateralVel: 0,

        // World-space position (set by caller via EditorShape.getPosition)
        x: 0,
        y: 0,
        angle: 0,

        // Duel state
        duelPartnerId: null,
        duelLateralTarget: 0,

        // Animation hint for the renderer
        speed: group.speed,

        // Per-hero micro-drift phase (unique per racer)
        driftPhase: rng() * Math.PI * 2,
        driftPeriodMs: 2000 + rng() * 3000, // 2–5 s (spec §SCHICHT-2)
      };
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get heroCount() {
    return this.racers.filter((r) => r.isHero).length;
  }

  get groupCount() {
    return this.groups.length;
  }

  /**
   * Advance simulation by dt milliseconds.
   * Returns racers sorted by tPos(t) ascending (lowest t = rendered first = drawn below).
   * Simulation order: a) groups, b) heroes, c) crowd.
   */
  update(dt, ts) {
    this.raceTimeMs += dt;
    const factor = dt / 16; // normalise to 60 fps ticks

    this._updateGroups(dt, ts, factor);
    this._updateHeroes(dt, ts, factor);
    this._updateCrowd();

    // Z-sort: ascending tPos → lowest t rendered first (behind)
    return [...this.racers].sort((a, b) => tPos(a.t) - tPos(b.t));
  }

  // ── Layer 1: Groups ─────────────────────────────────────────────────────────

  _updateGroups(dt, ts, factor) {
    // a) Advance each group centroid.
    for (const g of this.groups) {
      g.t += g.speed * factor;

      // Periodic speed perturbation (mean-reverting).
      if (ts > g.nextPerturbAt) {
        const delta = (this._rng() - 0.5) * 2 * PERTURB_AMPLITUDE;
        // Pull 30% back toward base speed + add jitter.
        g.speed = g.baseSpeed + (g.speed - g.baseSpeed) * 0.7 + delta;
        g.nextPerturbAt = ts + 4000 + this._rng() * 4000;
      }
    }

    // b) Merge check: if two group centroids come within MERGE_THRESHOLD, merge.
    // Iterate until stable (at most O(n²) but n ≤ 3 for this PoC).
    let changed = true;
    while (changed && this.groups.length > 1) {
      changed = false;
      outer: for (let i = 0; i < this.groups.length; i++) {
        for (let j = i + 1; j < this.groups.length; j++) {
          if (Math.abs(this.groups[i].t - this.groups[j].t) < MERGE_THRESHOLD) {
            this._mergeGroups(i, j);
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  _mergeGroups(iIdx, jIdx) {
    const a = this.groups[iIdx];
    const b = this.groups[jIdx];
    // Larger group absorbs smaller (stable anchor for crowd offsets).
    const absorber = a.members.size >= b.members.size ? a : b;
    const absorbed = absorber === a ? b : a;

    for (const racerIdx of absorbed.members) {
      absorber.members.add(racerIdx);
      const r = this.racers[racerIdx];
      r.groupId = absorber.id;
      if (!r.isHero) {
        // Recalculate tOffset relative to new centroid, clamped to ±0.035.
        r.tOffset = Math.max(-0.035, Math.min(0.035, r.t - absorber.t));
      }
    }

    // Average the speeds weighted by member count.
    const total = absorber.members.size;
    const wA = (absorber.members.size - absorbed.members.size) / total;
    const wB = absorbed.members.size / total;
    absorber.speed = absorber.speed * wA + absorbed.speed * wB;
    absorber.baseSpeed = absorber.baseSpeed * wA + absorbed.baseSpeed * wB;

    this.groups.splice(this.groups.indexOf(absorbed), 1);
  }

  // ── Layer 2: Hero racers ────────────────────────────────────────────────────

  _updateHeroes(dt, ts, factor) {
    const heroes = this.racers.filter((r) => r.isHero);

    // Duel detection: update lateral targets before moving.
    this._updateDuels(heroes, ts);

    for (const r of heroes) {
      const group = this.groups.find((g) => g.id === r.groupId);
      const gSpeed = group ? group.speed : BASE_SPEED;

      // a) Individual track progress.
      // Heroes own their own t; tiny variance differentiates their speed.
      // Bug fix: was 0.0004 which caused ~0.4 lap drift over 16 s (way too large).
      // Now ±3 % of BASE_SPEED → ±0.025 lap max accumulated drift (subtle, micro).
      const heroVariance = Math.sin(r.driftPhase * 0.37 + ts * 0.0001) * BASE_SPEED * 0.03;
      r.t += (gSpeed + heroVariance) * factor;
      r.speed = gSpeed + heroVariance;

      // Re-assign hero to closest group by t distance (handles drift).
      this._reassignHeroGroup(r);

      // b) Lateral: spring toward home + micro-drift + duel target.
      const driftY =
        MICRO_DRIFT_AMP * Math.sin((ts / r.driftPeriodMs) * 2 * Math.PI + r.driftPhase);

      let targetY = duelLateralTarget(r);
      if (r.duelPartnerId === null) {
        // No duel: home-force pulls toward driftY (centered micro-movement).
        targetY = driftY;
      }

      const springForce = -HOME_K * (r.physicalY - targetY);
      r.lateralVel = r.lateralVel * 0.85 + springForce;
      r.physicalY = Math.max(-1, Math.min(1, r.physicalY + r.lateralVel * factor));

      // c) Demotion check.
      this._checkDemotion(r, ts, heroes);
    }

    // d) Promotion check for crowd racers.
    this._checkPromotions(ts, heroes);
  }

  _updateDuels(heroes, _ts) {
    // Clear stale duel links first.
    for (const r of heroes) {
      if (r.duelPartnerId !== null) {
        const partner = this.racers[r.duelPartnerId];
        if (!partner || !partner.isHero) {
          r.duelPartnerId = null;
        }
      }
    }

    // Detect new duels among hero pairs.
    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        const a = heroes[i];
        const b = heroes[j];
        const tDiff = Math.abs(tPos(a.t) - tPos(b.t));
        // Handle wraparound (0.99 vs 0.01).
        const tGap = Math.min(tDiff, 1 - tDiff);

        if (tGap < DUEL_T_THRESHOLD && a.duelPartnerId === null && b.duelPartnerId === null) {
          a.duelPartnerId = b.index;
          b.duelPartnerId = a.index;
          // Assign opposing lateral targets.
          a.duelLateralTarget = -DUEL_LATERAL_TARGET;
          b.duelLateralTarget = +DUEL_LATERAL_TARGET;
        }

        // Exit duel if gap widens.
        if (tGap > DUEL_T_THRESHOLD * 1.8 && a.duelPartnerId === b.index) {
          a.duelPartnerId = null;
          b.duelPartnerId = null;
          a.duelLateralTarget = 0;
          b.duelLateralTarget = 0;
        }
      }
    }
  }

  _reassignHeroGroup(r) {
    if (this.groups.length <= 1) return;
    let bestGroup = this.groups[0];
    let bestDist = Math.abs(r.t - this.groups[0].t);
    for (const g of this.groups) {
      const d = Math.abs(r.t - g.t);
      if (d < bestDist) {
        bestDist = d;
        bestGroup = g;
      }
    }
    if (bestGroup.id !== r.groupId) {
      this.groups.find((g) => g.id === r.groupId)?.members.delete(r.index);
      bestGroup.members.add(r.index);
      r.groupId = bestGroup.id;
    }
  }

  _checkDemotion(r, ts, heroes) {
    if (r.heroSince === null) return;
    const age = ts - r.heroSince;
    if (age < MIN_HERO_DURATION_MS) return;
    if (r.duelPartnerId !== null) return; // active duel → keep hero status
    if (heroes.filter((h) => h.isHero).length <= MIN_HEROES) return;

    // Demote with low probability after min-duration, capped to avoid rapid churn.
    // Decision: 0.03 %/frame after 5 s, rising to max 0.15 %/frame after 30 s.
    // At 60 fps that is ~1.8 %/s rising to ~9 %/s — visible turnover without flicker.
    const demoteProb = Math.min(0.0015, 0.0003 * ((age - MIN_HERO_DURATION_MS) / 5000 + 1));
    if (this._rng() < demoteProb) {
      r.isHero = false;
      r.heroSince = null;
      r.demotedAt = ts;
      r.duelPartnerId = null;
      r.duelLateralTarget = 0;
      this.demotionCount++;

      // Snap crowd fields so the racer smoothly transitions.
      const group = this.groups.find((g) => g.id === r.groupId);
      r.tOffset = group ? Math.max(-0.035, Math.min(0.035, r.t - group.t)) : r.tOffset;
      r.cloudOffsetY = r.physicalY;
    }
  }

  _checkPromotions(ts, heroes) {
    const heroCount = heroes.filter((h) => h.isHero).length;
    if (heroCount >= MAX_HEROES) return;

    const heroTs = heroes.filter((h) => h.isHero).map((h) => tPos(h.t));

    // Drama-based promotion: crowd racer within PROMO_T_THRESHOLD of a hero.
    for (const r of this.racers) {
      if (r.isHero) continue;
      if (r.demotedAt !== null && ts - r.demotedAt < DEMOTION_COOLDOWN_MS) continue;

      const rt = tPos(r.t);
      const nearHero = heroTs.some((ht) => {
        const d = Math.abs(rt - ht);
        return Math.min(d, 1 - d) < PROMO_T_THRESHOLD;
      });

      if (nearHero && this._rng() < 0.008) {
        this._promoteRacer(r, ts);
        heroTs.push(tPos(r.t));
        if (this.racers.filter((x) => x.isHero).length >= MAX_HEROES) return;
      }
    }

    // Time-based fallback: if pool is low, promote a random eligible crowd racer
    // every PROMO_FALLBACK_INTERVAL_MS to keep hero count healthy.
    if (heroCount < MIN_HEROES + 2 && ts > (this._nextFallbackPromoAt ?? 0)) {
      this._nextFallbackPromoAt = ts + PROMO_FALLBACK_INTERVAL_MS;
      const eligible = this.racers.filter(
        (r) => !r.isHero && (r.demotedAt === null || ts - r.demotedAt >= DEMOTION_COOLDOWN_MS)
      );
      if (eligible.length > 0) {
        const pick = eligible[Math.floor(this._rng() * eligible.length)];
        this._promoteRacer(pick, ts);
      }
    }
  }

  _promoteRacer(r, ts) {
    r.isHero = true;
    r.heroSince = ts;
    r.demotedAt = null;
    r.duelPartnerId = null;
    r.duelLateralTarget = 0;
    this.promotionCount++;
  }

  // ── Layer 3: Crowd racers ───────────────────────────────────────────────────

  _updateCrowd() {
    for (const r of this.racers) {
      if (r.isHero) continue;
      const group = this.groups.find((g) => g.id === r.groupId);
      if (!group) continue;

      // Track-progress: owned by group + fixed offset (spec §OWNERSHIP).
      r.t = group.t + r.tOffset;

      // Lateral: owned by group cloud + fixed offset (spec §OWNERSHIP).
      r.physicalY = r.cloudOffsetY;

      r.speed = group.speed;
    }
  }
}

// Helper used in _updateHeroes to avoid closure capture issues.
function duelLateralTarget(r) {
  return r.duelLateralTarget ?? 0;
}
