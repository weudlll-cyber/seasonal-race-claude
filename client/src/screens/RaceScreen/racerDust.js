// ============================================================
// File:        racerDust.js
// Path:        client/src/screens/RaceScreen/racerDust.js
// Project:     RaceArena — PARTICLES-VISIBILITY-2
// Description: One frame of the racers' dust: spawn behind racers still running, advance every
//              racer's dust (running or finished) and the shared fallback pool. Render-only state —
//              nothing here touches physics or reads the race's random stream.
//
// WHY IT IS A FUNCTION OF ITS OWN. Spawning and advancing used to sit together inside
// `if (!r.finished)` in RaceScreen's RACING branch, and the FINISHED branch advanced no dust at all.
// So a racer's dust stopped fading the moment it crossed, and everyone's froze once the last one
// had: PARTICLES-VISIBILITY-1 measured 100 of 103 live particles standing still at the last racing
// frame. RaceScreen now calls this from BOTH branches, so a finished racer's dust fades out and is
// compacted away like anyone else's; the only thing a finish stops is new dust.
// ============================================================

/**
 * @param {object[]} racers         the race's racers (`surfaceEmitter`, `surfaceParticles`, pose, `finished`)
 * @param {object[]} dustParticles  the fallback pool for racers with no surface emitter, mutated in place
 * @param {object} racerType        supplies `getTrailParticles` for the fallback path
 * @param {number} dtFrames         elapsed time in 60 fps frames (1 = 16 ms), as the generators expect
 * @param {number} ts               the frame timestamp, passed through to the spawners
 */
export function advanceRacerDust(racers, dustParticles, racerType, dtFrames, ts) {
  for (const r of racers) {
    if (r.surfaceEmitter) {
      // Surface-class trail: each racer drives its own emitter. spawn appends IN PLACE into
      // r.surfaceParticles and update advances/compacts it in place (swap-remove).
      // PARTICLES-VISIBILITY-2: only the spawn is gated on the finish — the update is not, so a
      // finished racer's dust keeps fading until it is gone instead of freezing where it was.
      if (!r.finished)
        r.surfaceEmitter.spawn(r.surfaceParticles, r.x, r.y, r.baseSpeed, r.angle, ts);
      r.surfaceEmitter.update(r.surfaceParticles, dtFrames);
    } else if (!r.finished) {
      // Native trail fallback: trailFactory particles, pooled globally and advanced below.
      dustParticles.push(...racerType.getTrailParticles(r.x, r.y, r.baseSpeed, r.angle, ts));
    }
  }
  // Advance the fallback pool — in-place mutation + swap-remove (no allocation).
  let i = 0;
  while (i < dustParticles.length) {
    const p = dustParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.022;
    p.r *= 0.97;
    if (p.alpha <= 0) {
      dustParticles[i] = dustParticles[dustParticles.length - 1];
      dustParticles.length--;
    } else i++;
  }
}
