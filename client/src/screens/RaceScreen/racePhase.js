// ============================================================
// File:        racePhase.js
// Path:        client/src/screens/RaceScreen/racePhase.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THIS IS FOR: the ONE encoding of which phase a race is in. `st.phase` is a number on the
// wire and these are its names.
//
// WHY IT IS A FILE. It was declared in three places — `PHASE` in RaceScreen/index.jsx and
// `PHASE_RACING = 1` separately in both racerRendering.js and battleDiagRendering.js. Three
// constants that must agree and nothing making them, which is the shape every silent divergence on
// this branch has taken. Extracting the render path made a fourth copy necessary, which is what
// turned it up.
// ============================================================

/** Race phases, as stored in `st.phase`. */
export const PHASE = Object.freeze({ COUNTDOWN: 0, RACING: 1, FINISHED: 2 });
