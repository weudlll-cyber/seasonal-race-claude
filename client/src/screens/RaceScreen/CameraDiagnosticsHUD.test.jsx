// ============================================================
// File:        CameraDiagnosticsHUD.test.jsx
// Path:        client/src/screens/RaceScreen/CameraDiagnosticsHUD.test.jsx
// Project:     RaceArena
// Description: Regression tests — CameraDiagnosticsHUD must not crash when
//              cameraRef or diagRef values are absent, undefined, or partially
//              populated (guards against toFixed() on undefined).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import CameraDiagnosticsHUD from './CameraDiagnosticsHUD.jsx';

// Minimal CameraDirector stub — only has the fields the HUD reads.
function makeDir(overrides = {}) {
  return {
    zoom: 1,
    targetZoom: 1,
    hudState: 'OVERVIEW',
    currentTc: 0.25,
    lerpPhase: 'tracking',
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    transitioning: false,
    panProgress: 1,
    zoomProgress: 1,
    targetInFrame: true,
    _worldW: 1280,
    _bsY: 1,
    _isOpenTrack: false,
    _drawnBodyWidthRefPx: 36,
    observerPhase: 'tracking',
    camT: 0.5,
    lastFocusT: 0.5,
    followPct: 0.8,
    transitionCount60f: 0,
    entryElapsedMs: 0,
    lastEntryDeltaZoom: 0,
    lastEntryDeltaX: 0,
    lastEntryDeltaY: 0,
    _entryConvergenceZoom: 0.05,
    _entryConvergencePx: 10,
    battleDiagSnapshots: [],
    battleDiagFrozen: false,
    ...overrides,
  };
}

function makeRefs(dirOverrides = {}) {
  return {
    cameraRef: { current: makeDir(dirOverrides) },
    diagRef: { current: { dv01: 0, dv12: 0, dv01Max: 0, dv12Max: 0, constSpeed: false } },
    leaderDiagRef: { current: null },
  };
}

describe('CameraDiagnosticsHUD — undefined-safety (toFixed regression)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing when all props are fully populated', () => {
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={makeRefs().cameraRef}
          diagRef={makeRefs().diagRef}
          leaderDiagRef={makeRefs().leaderDiagRef}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('renders without crashing when cameraRef.current is null', () => {
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={{ current: null }}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when director zoom is undefined', () => {
    const cameraRef = { current: makeDir({ zoom: undefined }) };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when entryElapsedMs / entryDelta* are undefined', () => {
    const cameraRef = {
      current: makeDir({
        entryElapsedMs: undefined,
        lastEntryDeltaZoom: undefined,
        lastEntryDeltaX: undefined,
        lastEntryDeltaY: undefined,
        lerpPhase: 'entry', // triggers the entry-conv block
      }),
    };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when transitionCount60f is undefined', () => {
    const cameraRef = { current: makeDir({ transitionCount60f: undefined }) };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when dv01/dv12/dv01Max/dv12Max are undefined in diagRef', () => {
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={makeRefs().cameraRef}
          diagRef={{ current: { dv01: undefined, dv12: undefined } }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash with an empty diagRef ({})', () => {
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={makeRefs().cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when leaderSnapshots contain entries missing dispX (removed in cleanup)', () => {
    // The _display* cleanup (Etappe 27) removed dispX from snapshot pushes.
    // This test ensures the HUD does not crash on snapshots without dispX.
    const leaderDiagRef = {
      current: {
        snapshots: [
          { f: 1, rx: 100, drawX: 100, scrX: 640, tagX: 640, camX: 100 },
          { f: 2, rx: 101, drawX: 101, scrX: 641, tagX: 641, camX: 100 },
        ],
        frozen: false,
      },
    };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={makeRefs().cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={leaderDiagRef}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when leaderSnapshot entries have undefined numeric fields', () => {
    const leaderDiagRef = {
      current: {
        snapshots: [
          {
            f: 1,
            rx: undefined,
            drawX: undefined,
            scrX: undefined,
            tagX: undefined,
            camX: undefined,
          },
        ],
        frozen: false,
      },
    };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={makeRefs().cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={leaderDiagRef}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('does not crash when battleSnapshots contain entries with undefined fields', () => {
    const cameraRef = {
      current: makeDir({
        battleDiagSnapshots: [
          {
            f: 1,
            phase: 'entry',
            obs: 'lead-in',
            camT: null,
            focusT: undefined,
            dT: undefined,
            dX: undefined,
            dY: undefined,
            dZ: undefined,
            conv: false,
          },
        ],
        battleDiagFrozen: false,
      }),
    };
    expect(() =>
      render(
        <CameraDiagnosticsHUD
          cameraRef={cameraRef}
          diagRef={{ current: {} }}
          leaderDiagRef={{ current: null }}
          visible={true}
        />
      )
    ).not.toThrow();
  });

  it('renders null when visible=false', () => {
    const { container } = render(
      <CameraDiagnosticsHUD
        cameraRef={{ current: null }}
        diagRef={{ current: {} }}
        leaderDiagRef={{ current: null }}
        visible={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
