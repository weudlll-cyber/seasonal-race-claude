// ============================================================
// File:        scripts/lib/fingerprintCheck.mjs
// Project:     RaceArena — FP-COMPARE-2
//
// COMPARE A MEASURED FINGERPRINT AGAINST THE RECORD. One implementation, used by all three
// instruments.
//
// WHY IT IS A MODULE AND NOT A COPIED BLOCK. FP-COMPARE-1 gave `fingerprint-default.mjs` a `--check`
// in 2026-08-14 and the other two never got one; the obvious repair is to paste that block into
// `camera-fingerprint.mjs` and `render-fingerprint.mjs`. That would put THREE copies of one
// comparison in the tree — the exact shape this project spent the week removing, and the shape Rule A
// was built to catch. So the block moved here and all three read it.
//
// WHAT IT GUARDS AGAINST, in the words of the incident that produced it: on 2026-08-14 a renamed
// column moved the world hash off its recorded value; `npm run verify` ran the instrument, PRINTED
// the new number, and reported PASS. CI was green. The defect reached master and was found only
// because a later audit happened to read the value. **An instrument that emits a value nobody
// compares is not a guard. It is a log line.**
//
// THE RECORD IS THE ONE HOME. It reads `docs/fingerprints.json`, the same file
// `check-fingerprints.mjs` reads, so it cannot drift from it. No hash is written in this file.
//
// A FAILURE HERE IS NOT ALWAYS A BUG. A ship that deliberately moves a fingerprint SHOULD fail this
// until the value is minted — that is the ceremony working, and the message says so rather than
// implying something is broken.
// ============================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Compare `measured` against the record's value for `role`, and exit non-zero on a mismatch.
 *
 * @param {object}  o
 * @param {string}  o.role      the role key in `docs/fingerprints.json` — "world", "world-off",
 *                              "camera" or "render".
 * @param {string}  o.label     what to call it in the message ("WORLD", "CAMERA", "RENDER").
 * @param {string}  o.measured  the hash this run produced.
 * @param {boolean} o.cheap     a cheap run's hash is prefixed and cannot be compared; it SAYS so
 *                              rather than passing silently, which is the whole point of the file.
 * @param {string}  o.root      repository root.
 * @param {string} [o.localise] one line naming what to read first when it fails, if the instrument
 *                              has something better to offer than "start again".
 */
export function checkAgainstRecord({
  role,
  label,
  measured,
  cheap,
  root,
  localise = "",
}) {
  if (cheap) {
    console.log(
      `check: SKIPPED under --cheap — a reduced-scope hash is prefixed and cannot be compared ` +
        `against the full record.`,
    );
    return;
  }
  const RECORD = join(root, "docs", "fingerprints.json");
  let expected = null;
  try {
    expected =
      JSON.parse(readFileSync(RECORD, "utf8"))?.roles?.[role]?.value ?? null;
  } catch (e) {
    console.error(
      `FAIL: cannot read the fingerprint record at ${RECORD}: ${e.message}`,
    );
    process.exit(1);
  }
  if (!expected) {
    // LOUD FAILURE (Lesson 187): a check with nothing to check against is a no-op wearing a guard's
    // name, and that is the shape this whole module exists to end.
    console.error(
      `FAIL: the record declares no value for role "${role}". Nothing to check.`,
    );
    process.exit(1);
  }
  if (measured !== expected) {
    console.error(
      `FAIL: ${label} fingerprint does not match the record.\n` +
        `      role     : ${role}\n` +
        `      recorded : ${expected}\n` +
        `      measured : ${measured}\n` +
        (localise ? `      ${localise}\n` : "") +
        `      If this change was NOT meant to move it, something reached the instrument that you\n` +
        `      did not intend. If it WAS meant to, this is the ship ceremony asking for a deliberate\n` +
        `      mint; see docs/SHIP-CEREMONY.md. Do not edit the record to make this pass.`,
    );
    process.exit(1);
  }
  console.log(`check: ${label} matches the record for role "${role}" (${expected}).`);
}
