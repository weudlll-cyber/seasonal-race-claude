// ============================================================
// comeback-precedence.spec.js — the owner's comeback rule, in a real browser
//
// ★ REWRITTEN 2026-10-03 (BROWSER-SPECS-2) for the owner's decisions of 2026-10-02. The spec it
// replaces read the precedence off the camera-state HUD as "a COMEBACK_ZOOM entered before the state
// it left reached its hold"; with the cut delay (`comebackCutDelayMs`) and the leader shot re-picked in place, that
// signature can no longer be read from the screen (BROWSER-SPECS-RECHECK-1). What it checks now is
// the rule itself, every number READ from defaults.js:
//
//   1. THE CUT WAITS. A comeback cut is preceded by a wait for the same racer, and comes when that
//      wait reaches `comebackCutDelayMs` — not before it.
//   2. THE SHOT ENDS AT THE TARGET PLACE after the minimum: on the first frame on which he holds
//      `comebackTargetRank` or better and `comebackMinDuration` has passed.
//   3. NEVER ABOVE THE MAXIMUM (COMEBACK_ZOOM `maxStateDuration`) and NEVER INTO THE FINAL SCENE.
//
// ── HOW A BROWSER SPEC CAN SEE THIS ─────────────────────────────────────────────────────────────
//
// Nothing on the screen says who the comebacker is or when the wait began: the camera HUD shows the
// state, the anchor label is set for the leader shots only, and the scoreboard's order moves on its
// own 500 ms cadence. So the spec reads the race screen's LIVE CameraDirector — the object the
// screen draws with, reached from the canvas through React's own fiber links. No product code
// exposes it, and none was added. The cut and the end are the director's own clock
// (`stateEnteredAt`, `_comebackDue.since`), which is the clock its delay, minimum and maximum run
// on; every rank is the comeback detector's own (`latestRank`), the rank the rule reads. The trace
// callback is registered before the race loop's, so each frame it reads what the last one decided.
//
// THE FIXTURE: Space Sprint, Quick-Test seed 8, a fresh Quick Test's 20 racers. Its race has one
// comeback shot in the browser that waits, then ends when the racer reaches the target place after
// the minimum (measured 2026-10-03: the cut 1517 ms into the wait, the shot 10.8 s). Neither the
// maximum nor the final scene ends it, so those two are asserted as bounds and exercised by
// `comebackHold.test.js`.
// ============================================================

import { test, expect } from '@playwright/test';
import { ensureTrackGeometriesCached } from './appReady.js';
import { DEFAULT_CAMERA_CONFIG } from '../src/modules/storage/defaults.js';

const TRACK = /Space Sprint/;
const SEED = '8';

const DELAY = DEFAULT_CAMERA_CONFIG.comebackCutDelayMs;
const MIN_MS = DEFAULT_CAMERA_CONFIG.comebackMinDuration * 1000;
const MAX_MS = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.COMEBACK_ZOOM.maxStateDuration;
const TARGET = DEFAULT_CAMERA_CONFIG.comebackTargetRank;
const ENDGAME = DEFAULT_CAMERA_CONFIG.endgameThreshold;
// A decision lands on the first FRAME at which its condition holds, so it can trail the exact
// instant by a frame — a few on a loaded machine. 250 ms bounds "at the first chance" without
// letting a cut or an end by some other route pass for it.
const FRAME_SLACK_MS = 250;

test('the comeback cut waits, and the shot ends at the target place within its bounds', async ({
  page,
}) => {
  test.setTimeout(300_000);

  await page.addInitScript(() => {
    window.__cdTrace = [];
    const findDirector = () => {
      const el = document.querySelector('canvas');
      const key = el && Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      for (let f = key ? el[key] : null, d = 0; f && d < 40; f = f.return, d++)
        for (let h = f.memoizedState, n = 0; h && n < 200; h = h.next, n++) {
          const c = h.memoizedState?.current;
          if (c && typeof c === 'object' && 'comebackLockedRacerIndex' in c && '_comeback' in c)
            return c;
        }
      return null;
    };
    let lastKey = '';
    let lastLocked = null;
    const tick = (now) => {
      const cd = window.__cd ?? (window.__cd = findDirector());
      if (cd) {
        const due = cd._comebackDue;
        if (cd.comebackLockedRacerIndex != null) lastLocked = cd.comebackLockedRacerIndex;
        const who = cd.comebackLockedRacerIndex ?? due?.index ?? lastLocked;
        const row = {
          t: now, // this frame's rAF time — the same clock the director's timestamps are on
          st: cd.state,
          at: cd.stateEnteredAt,
          locked: cd.comebackLockedRacerIndex,
          due: due ? { i: due.index, since: due.since } : null,
          rank: who == null ? null : cd._comeback.latestRank(who),
          why: cd._lastTransitionReason,
          lp: cd._diagLeaderProgress ?? 0,
          finale: !!(cd._inPhotoFinish || cd._inFinishDrama || cd._inFinishMode),
        };
        const key = JSON.stringify([row.st, row.at, row.locked, row.due, row.rank, row.finale]);
        if (key !== lastKey) {
          lastKey = key;
          window.__cdTrace.push(row);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto('/setup');
  await ensureTrackGeometriesCached(page);
  await page.evaluate((seed) => sessionStorage.setItem('quickTestSeed', seed), SEED);
  await page.reload();
  await ensureTrackGeometriesCached(page);
  await page.locator('button', { hasText: TRACK }).first().click();
  await page.getByRole('button', { name: /Quick Test/ }).click();
  await page.waitForURL(/\/race/);
  await expect(page.getByTestId('winner-card')).toBeVisible({ timeout: 280_000 });

  const { found, trace } = await page.evaluate(() => ({
    found: !!window.__cd,
    trace: window.__cdTrace ?? [],
  }));
  expect(found, "the race screen's CameraDirector was not found from the canvas").toBe(true);

  // One shot per COMEBACK_ZOOM entry: its rows, the last wait seen before it, and the first row after
  // it — the exit, carrying the reason the director recorded and the rank it decided on.
  const shots = [];
  let lastDue = null;
  for (let i = 0; i < trace.length; i++) {
    const r = trace[i];
    const prev = trace[i - 1];
    if (r.st === 'COMEBACK_ZOOM' && prev?.st !== 'COMEBACK_ZOOM')
      shots.push({ enter: r, due: lastDue, rows: [r] });
    else if (r.st === 'COMEBACK_ZOOM') shots.at(-1).rows.push(r);
    else if (prev?.st === 'COMEBACK_ZOOM') shots.at(-1).exit = r;
    if (r.due) lastDue = r.due;
  }
  console.log(
    '[comeback] ' +
      JSON.stringify(
        shots.map((s) => ({
          racer: s.enter.locked,
          waitedMs: s.due ? +(s.enter.at - s.due.since).toFixed(1) : null,
          shotMs: s.exit ? +(s.exit.at - s.enter.at).toFixed(1) : null,
          endedBy: s.exit?.why ?? null,
          rankAtEnd: s.exit?.rank ?? null,
        }))
      )
  );
  expect(shots.length, 'the race never cut to the comebacker').toBeGreaterThan(0);

  for (const s of shots) {
    const racer = s.enter.locked;
    // 1 · THE CUT WAITS, for HIM, and comes when the wait matures
    expect(s.due, 'a comeback cut with no wait before it').not.toBeNull();
    expect(s.due.i, 'the wait was for a different racer than the cut').toBe(racer);
    const waited = s.enter.at - s.due.since;
    expect(waited, `the cut came ${waited} ms into the wait`).toBeGreaterThanOrEqual(DELAY);
    expect(
      waited,
      `the cut came ${waited} ms into the wait, not when it matured`
    ).toBeLessThanOrEqual(DELAY + FRAME_SLACK_MS);

    expect(s.exit, 'the comeback shot was still running when the race ended').toBeDefined();
    const dur = s.exit.at - s.enter.at;

    // 3 · NEVER ABOVE THE MAXIMUM, NEVER INTO THE FINAL SCENE
    expect(dur, `the shot ran ${dur} ms`).toBeLessThanOrEqual(MAX_MS + FRAME_SLACK_MS);
    for (const r of s.rows) {
      expect(r.lp, 'a comeback frame with the leader past the endgame').toBeLessThanOrEqual(
        ENDGAME
      );
      expect(r.finale, 'a comeback frame inside the finish sequence').toBe(false);
    }

    // 2 · IT ENDS AT THE TARGET PLACE, AFTER THE MINIMUM, AT THE FIRST CHANCE. This fixture's shot
    // is ended by that rule — asserted, so a changed race is reported as such, not misread.
    expect(s.exit.why, "this fixture's shot is ended by its racer reaching the target place").toBe(
      'comeback-target-reached'
    );
    expect(dur, `the shot ended after ${dur} ms, before the minimum`).toBeGreaterThanOrEqual(
      MIN_MS
    );
    expect(s.exit.rank, 'he was not at the target place when the shot ended').toBeLessThanOrEqual(
      TARGET
    );
    // The first chance: the first moment at or after the minimum at which he held the target place.
    // His rank at a moment is the last recorded change at or before it.
    const minAt = s.enter.at + MIN_MS;
    const all = [...s.rows, s.exit];
    const rankAt = (time) => all.filter((r) => r.t <= time).at(-1)?.rank ?? null;
    const firstChance =
      rankAt(minAt) <= TARGET ? minAt : all.find((r) => r.t > minAt && r.rank <= TARGET)?.t;
    expect(
      s.exit.at - firstChance,
      `the shot ended ${s.exit.at - firstChance} ms after its first chance to end`
    ).toBeLessThanOrEqual(FRAME_SLACK_MS);
  }
});
