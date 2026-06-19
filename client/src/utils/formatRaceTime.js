// ============================================================
// File:        formatRaceTime.js
// Path:        client/src/utils/formatRaceTime.js
// Project:     RaceArena
// Description: Format elapsed race milliseconds as m:ss.hh (1:05.32) or ss.hh (45.32).
// ============================================================

export function formatRaceTime(ms) {
  const hundredths = Math.floor(ms / 10) % 100;
  const totalSecs = Math.floor(ms / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60);
  return mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
    : `${secs}.${String(hundredths).padStart(2, '0')}`;
}
