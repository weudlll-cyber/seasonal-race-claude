// ============================================================
// clearanceReader.test.js — the owner's situational rule (ACTION-BUILD-5). Admission reads ONLY local
// space (width @ arc + planned occupancy), never topology/track labels. Two mandated tests:
//   • locally-identical width profiles → identical decisions regardless of any labeling;
//   • one track with a mixed profile → lateral admitted in the wide stretch, refused in the narrow one.
// ============================================================
import { describe, it, expect } from 'vitest';
import { createClearanceReader } from './clearanceReader.js';

// A contiguous finale field (drawn ranks 1..N) as the planned occupancy — the terminal state of all curves.
const N = 40;
const fullField = Array.from({ length: N }, (_, i) => i + 1);
const occupancy = () => fullField;
const CAR = 28.5; // drawn car footprint (px)

// A front-band lateral maneuver (fight-for-lead peak): ranks ~1-4 in a short late window.
const frontManeuver = (p0) => ({ p0, p1: p0 + 0.05, rankLo: 1, rankHi: 4 });

describe("createClearanceReader — the owner's situational rule", () => {
  it('MANDATED: locally-identical width profiles give identical decisions regardless of labeling', () => {
    // Two "tracks" with the SAME local width function but which a caller might THINK of as open vs closed.
    // The reader has no topology input, so the decisions must be byte-identical.
    const widthAt = (p) => (p < 0.85 ? 240 : 120); // wide early, narrow late — identical for both
    const readerOpenLabelled = createClearanceReader({
      widthAt,
      carWidth: CAR,
      plannedRanksAt: occupancy,
    });
    const readerClosedLabelled = createClearanceReader({
      widthAt,
      carWidth: CAR,
      plannedRanksAt: occupancy,
    });
    const windows = [0.72, 0.8, 0.88, 0.94].map(frontManeuver);
    const a = windows.map((w) => readerOpenLabelled.admit(w).admitted);
    const b = windows.map((w) => readerClosedLabelled.admit(w).admitted);
    expect(a).toEqual(b);
  });

  it('MANDATED: on one mixed-width track, lateral is admitted in the wide stretch and refused in the narrow', () => {
    // Wide stretch 0.70-0.82 (≈8 lanes) and a narrow pinch 0.84-0.96 (≈4 lanes) on the SAME track/race.
    const widthAt = (p) => (p < 0.83 ? 240 : 120);
    const reader = createClearanceReader({ widthAt, carWidth: CAR, plannedRanksAt: occupancy });
    const wide = reader.admit(frontManeuver(0.74)); // in the wide stretch
    const narrow = reader.admit(frontManeuver(0.88)); // in the narrow pinch
    expect(wide.admitted).toBe(true);
    expect(narrow.admitted).toBe(false);
    // The refusal is because the front crowd fills the narrow stretch's lanes (no free corridor).
    expect(narrow.freeLanes).toBe(0);
    expect(wide.freeLanes).toBeGreaterThan(0);
  });

  it('SEQUENCING: the free corridor is a shared resource — one lateral at a time on narrow geometry', () => {
    // A moderate width (≈6 lanes vs a front crowd of ~6 → exactly one free corridor).
    const reader = createClearanceReader({
      widthAt: () => 178,
      carWidth: CAR,
      plannedRanksAt: occupancy,
    });
    const first = reader.admit(frontManeuver(0.75)); // claims the single corridor
    const overlapping = reader.admit(frontManeuver(0.76)); // same window → corridor already taken
    const later = reader.admit(frontManeuver(0.95)); // non-overlapping → corridor free again
    expect(first.admitted).toBe(true);
    expect(overlapping.admitted).toBe(false); // sequenced out
    expect(later.admitted).toBe(true);
  });

  it('SEQUENCING: a wide track carries several overlapping laterals (more corridors)', () => {
    const reader = createClearanceReader({
      widthAt: () => 300,
      carWidth: CAR,
      plannedRanksAt: occupancy,
    });
    const a = reader.admit(frontManeuver(0.75));
    const b = reader.admit(frontManeuver(0.755));
    expect(a.admitted).toBe(true);
    expect(b.admitted).toBe(true); // 10 lanes − ~6 crowd → several free corridors
  });

  it('OCCUPANCY: a sparse local field admits where a dense one refuses (same width)', () => {
    const width = () => 131; // narrow (≈4 lanes)
    const dense = createClearanceReader({
      widthAt: width,
      carWidth: CAR,
      plannedRanksAt: () => fullField,
    });
    // Sparse: only a couple of racers planned near the front (a real gap in the field there).
    const sparse = createClearanceReader({
      widthAt: width,
      carWidth: CAR,
      plannedRanksAt: () => [1, 2],
    });
    expect(dense.admit(frontManeuver(0.8)).admitted).toBe(false);
    expect(sparse.admit(frontManeuver(0.8)).admitted).toBe(true);
  });

  it('lanesAt is a clean monotone read of width (floor width/car, min 1)', () => {
    const reader = createClearanceReader({
      widthAt: (p) => p * 300,
      carWidth: 30,
      plannedRanksAt: occupancy,
    });
    expect(reader.lanesAt(1.0)).toBe(10);
    expect(reader.lanesAt(0.5)).toBe(5);
    expect(reader.lanesAt(0.0)).toBe(1); // floored to at least one lane
  });
});
