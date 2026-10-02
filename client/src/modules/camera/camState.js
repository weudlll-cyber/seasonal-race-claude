// ============================================================
// File:        camState.js
// Path:        client/src/modules/camera/camState.js
// Project:     RaceArena — P1-CAMERADIRECTOR-SPLIT-1
//
// WHAT THIS IS FOR: the camera's state names, `CAM_STATE`, and nothing else.
//
// WHY IT IS ITS OWN MODULE: the enum used to be declared in CameraDirector.js, which made every
// module the director imports unable to name a state without a circular import (see the notes in
// transitionDecision.js and cameraTimingComputation.js). Splitting the director needs modules that
// DO name states — the offer pool in offerArbitration.js first — so the enum moved here, to a file
// that imports nothing. CameraDirector.js re-exports it, so `import { CAM_STATE } from
// './CameraDirector.js'` keeps working for every existing caller and resolves to this same object.
// ============================================================

export const CAM_STATE = {
  OVERVIEW: 'OVERVIEW',
  LEADER_ZOOM: 'LEADER_ZOOM',
  BATTLE_ZOOM: 'BATTLE_ZOOM',
  COMEBACK_ZOOM: 'COMEBACK_ZOOM',
  LEAD_CHANGE: 'LEAD_CHANGE',
  // Photo-Finish (15a): tight top-2 group shot at a close finish. Dedicated state (Option B),
  // not a reuse of BATTLE_ZOOM; reuses BATTLE's arc-midpoint pan + group spriteScale for framing.
  PHOTO_FINISH: 'PHOTO_FINISH',
};
