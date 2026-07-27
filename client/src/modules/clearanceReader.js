// ============================================================
// File:        clearanceReader.js
// Path:        client/src/modules/clearanceReader.js
// Project:     RaceArena
// Description: LOCAL-CLEARANCE ADMISSION (ACTION-BUILD-5 — the owner's situational rule). A pure,
//              admission-side reader that decides, PER INSTANCE, whether one compression-family element
//              (a lateral script beat or an accordion pulse) may be authored at the arc position + time
//              window where it is planned. It reads ONLY LOCAL SPACE:
//                • planned track WIDTH at that arc position → the physical lane count there, and
//                • planned lane OCCUPANCY from the compiled curves in that window → how many of those
//                  lanes the field already fills.
//              A lateral maneuver is admitted only where a free lane (the wandering corridor) remains
//              AFTER the field's occupancy AND after the corridors already claimed by overlapping,
//              already-admitted lateral maneuvers — the open-lane invariant: the author never occupies
//              the last free lane, and the corridor is a SHARED resource (one maneuver at a time on
//              narrow geometry, more where the track is wide).
//
//              BINDING (the owner's rule): NOTHING here reads open/closed topology, track names, or any
//              per-track / per-topology constant. Two locations with identical local width + occupancy
//              get identical decisions regardless of any labeling. A prohibition is SITUATIONAL — a
//              maneuver is refused only WHERE there is no room, and admitted WHERE room exists (a wide
//              stretch of any track). Longitudinal scripts are NOT gated here (admissible everywhere).
//
//              Admission-side only (frozen runtime budget): it reads plans and moves no one.
// ============================================================

/**
 * Build a per-race clearance reader. Stateful only in the list of corridors already committed this race
 * (so overlapping lateral maneuvers are sequenced through the shared free lane).
 *
 * @param {object} args
 * @param {(progress:number)=>number} args.widthAt   planned track width (px) at an arc position (progress).
 *                                                    Constant for a uniform track; a profile for a track
 *                                                    that is wide in some places and narrow in others.
 * @param {number} args.carWidth                      drawn car footprint width (px). lanes = floor(width/carWidth).
 * @param {(progress:number)=>number[]} args.plannedRanksAt  every racer's PLANNED rank at a progress — the
 *                                                    "planned lane occupancy from all compiled curves".
 * @param {number} [args.rankPad]                     ranks either side of a maneuver counted as sharing its lanes.
 * @returns {{ admit: Function, lanesAt: Function, committedCount: () => number }}
 */
export function createClearanceReader({ widthAt, carWidth, plannedRanksAt, rankPad = 1 }) {
  const committed = []; // {p0,p1} of admitted lateral maneuvers — the claimed corridors
  const lanesAt = (p) => Math.max(1, Math.floor(widthAt(p) / Math.max(1e-6, carWidth)));

  /**
   * Decide one lateral instance. Returns the decision plus the raw reads (for telemetry).
   * @param {{p0:number, p1:number, rankLo:number, rankHi:number}} m  the maneuver's window + rank span.
   */
  function admit(m) {
    const { p0, p1, rankLo, rankHi } = m;
    // Tightest lane count anywhere in the window — a narrow pinch inside the window blocks the maneuver
    // even if the window's endpoints are wide (chicane-safe).
    const STEPS = 4;
    let lanes = Infinity;
    for (let i = 0; i <= STEPS; i++) lanes = Math.min(lanes, lanesAt(p0 + ((p1 - p0) * i) / STEPS));
    // Planned crowd sharing the maneuver's lanes at the window midpoint (± a small rank pad). This is the
    // field's own occupancy — the racers that must leave a lane free for the pass to have somewhere to go.
    const ranks = plannedRanksAt((p0 + p1) / 2);
    let crowd = 0;
    for (const rk of ranks) if (rk >= rankLo - rankPad && rk <= rankHi + rankPad) crowd++;
    const abreast = Math.min(lanes, crowd); // the crowd fills up to `lanes` lanes
    const freeLanes = lanes - abreast; // lanes with no planned occupant → wandering corridor(s)
    // The corridor is SHARED: each overlapping already-admitted lateral maneuver has claimed one.
    const committedHere = committed.filter((w) => !(w.p1 < p0 || w.p0 > p1)).length;
    const admitted = freeLanes - committedHere >= 1; // a free, uncommitted corridor remains
    if (admitted) committed.push({ p0, p1 });
    return { admitted, lanes, crowd, freeLanes, committedHere };
  }

  return { admit, lanesAt, committedCount: () => committed.length };
}
