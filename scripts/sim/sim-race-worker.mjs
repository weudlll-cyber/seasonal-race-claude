// ============================================================
// sim-race-worker.mjs — worker_threads race runner for sim-fairness.mjs --jobs=<n> (PART C).
//
// Runs ONE race at a time using the SAME race routine the serial path uses (runRaceForCombo, imported —
// never cloned). The worker is created with `{ argv: <the sweep's CLI args> }`, so sim-fairness.mjs's
// module-level constants (GLOBAL_SEED / N_RACES / CHOREO_* / LBB_DIAG / …) recompute identically here; its
// main() body is skipped because process.argv[1] is THIS file, not sim-fairness.mjs. raceBehavior.js's
// module-level physics state is per-worker by construction, so concurrent races never share it.
//
// The only non-serializable per-combo value is the EditorShape (a class instance with methods); it is
// rebuilt ONCE here from the combo's plain `track` JSON. Results are packed (an array with extra own
// properties does not survive structuredClone) and posted back tagged with raceIdx for an ordered merge.
// ============================================================

import { parentPort, workerData } from 'worker_threads';
import { EditorShape } from '../../client/src/modules/track-editor/EditorShape.js';
import { runRaceForCombo, packResultArray } from '../sim-fairness.mjs';

// Rebuild the per-combo context once: the serializable fields arrive in workerData, the EditorShape is
// reconstructed from the track JSON (deterministic — same input the main thread used).
const comboData = workerData.comboData;
const comboCtx = { ...comboData, shape: new EditorShape(comboData.track) };

parentPort.on('message', ({ raceIdx }) => {
  const { result, seed, raceSollRankMap, b1Indices } = runRaceForCombo(comboCtx, raceIdx);
  // raceSollRankMap (Map|null) and b1Indices (Set) are structuredClone-safe; `result` is packed because
  // its extra own properties (heroObs / lbbDecisions / …) would otherwise be dropped by the clone.
  parentPort.postMessage({ raceIdx, packed: packResultArray(result), seed, raceSollRankMap, b1Indices });
});
