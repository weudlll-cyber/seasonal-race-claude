// ============================================================
// File:        testAidsProbes.test.js
// Path:        client/src/modules/testAidsProbes.test.js
// Project:     RaceArena — TEST-AIDS-1
// Description: The console-only probes are test aids: switched on in the address bar or in storage,
//              they still do nothing while the test-aids switch is OFF.
//                · `?perfprobe=1`  → rAFProbe.js       (`window.__perfProbe`)
//                · `?viewerprobe=1` → viewerProbe.js   (`window.__viewerProbe().active`)
//                · `racearena:holdProbe` → raceLoopDiagnostics.js (`window.__raHoldTrace`)
//              (`racearena:raceInputsProbe` is in screens/RaceScreen/testAidsRace.test.jsx.)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Fresh modules, so each probe reads its flag the way it does on a page load. */
async function fresh() {
  vi.resetModules();
  const aids = await import('./testAids.js');
  const rAF = await import('./rAFProbe.js');
  const viewer = await import('./viewerProbe.js');
  const loop = await import('../screens/RaceScreen/raceLoopDiagnostics.js');
  return { aids, rAF, viewer, loop };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  delete window.__perfProbe;
  delete window.__raHoldTrace;
});

describe('?perfprobe — the frame probe', () => {
  it('OFF: the flag is set and the probe stays off', async () => {
    sessionStorage.setItem('_ra_perfprobe', '1');
    const { aids, rAF } = await fresh();
    aids._setTestAidsForTests(false);
    expect(rAF.initProbe()).toBe(false);
    expect(window.__perfProbe).toBeUndefined();
  });

  it('ON: the probe starts', async () => {
    sessionStorage.setItem('_ra_perfprobe', '1');
    const { aids, rAF } = await fresh();
    aids._setTestAidsForTests(true);
    expect(rAF.initProbe()).toBe(true);
    expect(typeof window.__perfProbe).toBe('function');
  });
});

describe('?viewerprobe — the viewer probe', () => {
  it('OFF: a race begins and the probe does not run', async () => {
    sessionStorage.setItem('_ra_viewerprobe', '1');
    const { aids, viewer } = await fresh();
    aids._setTestAidsForTests(false);
    viewer.beginViewerProbe({ seed: 1 });
    expect(window.__viewerProbe().active).toBe(false);
  });

  it('ON: the probe runs for the race', async () => {
    sessionStorage.setItem('_ra_viewerprobe', '1');
    const { aids, viewer } = await fresh();
    aids._setTestAidsForTests(true);
    viewer.beginViewerProbe({ seed: 1 });
    expect(window.__viewerProbe().active).toBe(true);
  });
});

describe('racearena:holdProbe — the hold trace', () => {
  const held = { getHeldRelease: () => new Map([[0, 1000]]) };
  const st = { racers: [{ index: 0, t: 0.5 }] };

  it('OFF: nothing is traced', async () => {
    localStorage.setItem('racearena:holdProbe', '1');
    const { aids, loop } = await fresh();
    aids._setTestAidsForTests(false);
    loop.recordHoldProbe(st, held);
    expect(window.__raHoldTrace).toBeUndefined();
  });

  it('ON: the held racer is traced', async () => {
    localStorage.setItem('racearena:holdProbe', '1');
    const { aids, loop } = await fresh();
    aids._setTestAidsForTests(true);
    loop.recordHoldProbe(st, held);
    expect(window.__raHoldTrace?.length).toBeGreaterThan(0);
  });
});
