// ============================================================
// File:        scripts/lib/cheapMode.mjs
// Project:     RaceArena — VERIFY-COST-2
//
// `--cheap`: ONE TRACK, SO A WIRING MISTAKE COSTS SECONDS INSTEAD OF TWO MINUTES.
//
// ── WHY ─────────────────────────────────────────────────────────────────────────────────────────
// On the night this was written the render fingerprint ran FIVE times at ~115 s each — nearly ten
// minutes — and most of those runs existed to look at a PRINTED SUMMARY LINE that said
// `undefined+16 frames`. There was no smaller thing to run: checking a format string cost a full
// ten-track measurement, and so did each retry after a scripted edit went wrong.
//
// ── THE ONE RULE THIS MODE MUST OBEY ────────────────────────────────────────────────────────────
// A CHEAP HASH IS NOT A FINGERPRINT, AND IT MUST BE IMPOSSIBLE TO MISTAKE FOR ONE. The whole value
// of these instruments is that a hash means something; a mode that prints a plausible-looking
// sixteen hex characters from one track would be the most dangerous thing in the repository — it
// would compare equal to nothing and unequal to everything, and somebody would eventually paste one
// into `docs/fingerprints.json`.
//
// So the banner is loud, it is printed FIRST and LAST, the hash is prefixed with `CHEAP-` so it can
// never match the 16-hex shape the record and the containment guard expect, and `--quiet` — the
// mode a script would use to capture a value — REFUSES to run cheap at all.
// ============================================================

/** True when the caller asked for the cheap wiring check. */
export const isCheap = (argv = process.argv) => argv.includes("--cheap");

/**
 * Reduce a track list to the single cheapest representative.
 *
 * ALPHABETICALLY FIRST, deliberately: it is a fixed choice, so two cheap runs are comparable to each
 * other even though neither is comparable to the real thing. `--cheap-track=<id>` overrides it, for
 * a wiring bug that only shows on one track.
 */
export function cheapTracks(all, idOf = (t) => t, argv = process.argv) {
  const want = (argv.find((a) => a.startsWith("--cheap-track=")) ?? "").slice(14);
  if (want) {
    const found = all.filter((t) => idOf(t) === want);
    if (found.length) return found;
  }
  return all.slice(0, 1);
}

/**
 * The banner. Printed before the work and again after it, because the reason someone runs this mode
 * is that they are looking at the output — and the line they are looking at may scroll the first
 * banner away.
 */
export function cheapBanner(what, detail) {
  return (
    `\n${"!".repeat(78)}\n` +
    `!! CHEAP MODE — THIS HASH IS NOT THE ${what.toUpperCase()} FINGERPRINT.\n` +
    `!! ${detail}\n` +
    `!! It exists to check WIRING and FORMATTING only. It compares to nothing, it may not be\n` +
    `!! written to docs/fingerprints.json, and it is not evidence about the shipped picture.\n` +
    `!! Drop --cheap for a real measurement.\n` +
    `${"!".repeat(78)}\n`
  );
}

/**
 * Refuse the combination that could produce a fake fingerprint: `--quiet` prints the bare hash and
 * nothing else, which is exactly what a script would capture.
 */
export function refuseCheapQuiet(argv = process.argv) {
  if (isCheap(argv) && argv.includes("--quiet")) {
    console.error(
      "FAIL: --cheap and --quiet together would print a bare hash with no warning around it,\n" +
        "      which is the one output that could be mistaken for a fingerprint. Pick one.",
    );
    process.exit(2);
  }
}

/** The prefix that makes a cheap hash unable to impersonate a real one. */
export const cheapHash = (h) => `CHEAP-${h.slice(0, 8)}`;
