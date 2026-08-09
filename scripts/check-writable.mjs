// ============================================================
// File:        scripts/check-writable.mjs
// Project:     RaceArena — MERGE-AND-GUARD-1 stage 6b
//
// A TRACKED FILE THAT CAN BE READ BUT NOT WRITTEN IS INVISIBLE TO EVERY OTHER GUARD IN THIS REPO.
//
// THE INCIDENT. CONFIG-TRUTH-1 tried to add a one-line marker to nine archive documents and died on
// the first with `EPERM`. Not a lock and not transient: **ten tracked files under `docs/diagnose/`
// carried the Windows HIDDEN attribute** (OneDrive dehydrated placeholders), and Windows refuses to
// open a hidden file with `O_CREAT|O_TRUNC` — which is exactly what `writeFileSync` does. They had
// been in that state for months. Every guard in this repository READS, so every guard passed over
// them, forever, and only an attempt to WRITE ever revealed it.
//
// WHAT IT CHECKS, AND WHY IT CHECKS THE CAUSE RATHER THAN THE SYMPTOM. Measured on this machine,
// with the attribute set on a real file:
//
//     open 'r'   OK        open 'a'   OK
//     open 'r+'  OK        open 'w'   FAIL EPERM      writeFileSync  FAIL EPERM
//
// So there is NO non-destructive open that reproduces it: the only mode that fails is the one that
// truncates. Probing with `'w'` and restoring afterwards would mean truncating every tracked file in
// the repository and putting it back — a crash mid-run would destroy the tree, and it is the very
// pattern Lesson 205 exists to forbid. So this reads the ATTRIBUTE instead, in one process, and
// writes nothing at all.
//
// WHAT THIS DOES **NOT** CHECK, stated here rather than discovered later:
//   - **Anything at all on Linux or macOS**, including CI. There is no HIDDEN attribute there, so
//     this check is a NO-OP on the machine where CI runs, and it says so out loud instead of
//     printing a green line. **The one place it matters is the owner's Windows tree, so it earns its
//     keep in the pre-commit hook and in `verify`, not in CI.**
//   - **File locks.** A file held open by another process (the `UNKNOWN: -4094` class that
//     CLEAN-STATE-1 hit on `docs/SIM.md`) is a moment-to-moment condition, not an attribute, and is
//     not visible here.
//   - **Directory permissions, ACLs, or a read-only volume.** Only the two file attributes below.
//   - **Untracked files**, and files listed by git that are not present on disk.
//   - **Whether a write would SUCCEED.** It proves the absence of two known causes, not the presence
//     of permission. Antivirus, quota and OneDrive hydration failures are all still possible.
//
// LOUD-FAILURE RULE (Lesson 187): zero tracked files enumerated is a FAILURE. On a non-Windows
// platform the check does not pass quietly — it prints that it checked NOTHING and why.
//
// Usage:
//   node scripts/check-writable.mjs             # fail if a tracked file carries a blocking attribute
//   node scripts/check-writable.mjs --root=<d>  # check a fixture (used by its test)
//   node scripts/check-writable.mjs --fix       # clear the attributes it found, then re-check
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-writable",
  covers:
    "a tracked file that can be READ but not WRITTEN — a OneDrive hidden placeholder, invisible to every other guard because they all only read",
  blind: [
    "files that are writable now and become hidden later; it is a snapshot",
    "untracked files",
  ],
  dirs: [],
  files: [],
  everything: true,
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = process.argv.includes("--fix");

// The two Windows file attributes that make a tracked file readable but not writable. HIDDEN is the
// one that actually bit; READONLY is the other member of the same class and costs nothing to add.
const BLOCKING = ["Hidden", "ReadOnly"];

const tracked = execFileSync("git", ["ls-files"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

if (tracked.length === 0) {
  console.error(
    "FAIL: `git ls-files` returned NOTHING, so nothing was checked. A guard that passes because it\n" +
      "      found no files is a no-op. See Lesson 187.",
  );
  process.exit(1);
}

if (process.platform !== "win32") {
  // NOT a pass. The distinction matters: this prints what it did NOT do, so a green CI run is never
  // mistaken for evidence that the owner's tree is writable.
  console.log(
    `check-writable: SKIPPED — ${tracked.length} tracked file(s) NOT checked. ` +
      `The blocking attributes (${BLOCKING.join(", ")}) exist only on Windows, and this is ` +
      `${process.platform}. This check cannot speak for the owner's tree from here.`,
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

// One PowerShell process for the whole tree — per-file spawning would cost minutes on 3,000 files.
const ps = [
  "$ErrorActionPreference='SilentlyContinue';",
  '$in = [Console]::In.ReadToEnd() -split "`n";',
  "foreach ($f in $in) {",
  "  $f = $f.Trim(); if (-not $f) { continue }",
  "  $i = Get-Item -Force -LiteralPath $f; if (-not $i) { continue }",
  "  $hit = @();",
  // One test per attribute, generated from BLOCKING so the list has one home in this file.
  ...BLOCKING.map(
    (a) =>
      `  if ($i.Attributes -band [IO.FileAttributes]::${a}) { $hit += '${a}' }`,
  ),
  "  if ($hit.Count -gt 0) { Write-Output ($f + '|' + ($hit -join ',')) }",
  "}",
].join(" ");

let out = "";
try {
  out = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
    cwd: ROOT,
    input: tracked.join("\n"),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (e) {
  console.error(
    `FAIL: could not read file attributes — ${e.message}\n` +
      `      The check could not run, which is not the same as passing.`,
  );
  process.exit(1);
}

const blocked = out
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [file, attrs] = l.split("|");
    return { file, attrs };
  });

if (blocked.length === 0) {
  console.log(
    `check-writable: ${tracked.length} tracked file(s), 0 carrying a blocking attribute ` +
      `(${BLOCKING.join(" / ")}). (Attributes only — it does NOT prove a write would succeed, and ` +
      `it cannot see locks, ACLs or a read-only volume.)`,
  );
  console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

if (FIX) {
  const fixPs =
    "$ErrorActionPreference='Stop';" +
    '$in = [Console]::In.ReadToEnd() -split "`n";' +
    "foreach ($f in $in) { $f = $f.Trim(); if (-not $f) { continue }" +
    "  $i = Get-Item -Force -LiteralPath $f;" +
    `  $i.Attributes = $i.Attributes -band (-bnot ([IO.FileAttributes]::${BLOCKING.join(" -bor [IO.FileAttributes]::")})) }`;
  execFileSync("powershell", ["-NoProfile", "-Command", fixPs], {
    cwd: ROOT,
    input: blocked.map((b) => b.file).join("\n"),
    encoding: "utf8",
  });
  console.log(
    `check-writable --fix: cleared ${BLOCKING.join(" / ")} on ${blocked.length} file(s). Re-run to confirm.`,
  );
  process.exit(0);
}

console.error(
  `\nFAIL: ${blocked.length} TRACKED file(s) carry an attribute that makes them readable but NOT writable.\n` +
    blocked.map((b) => `      ${b.file}  [${b.attrs}]`).join("\n") +
    `\n\n      Every guard in this repository READS, so this state is invisible to all of them and can\n` +
    `      persist for months; it surfaces only when something tries to EDIT the file, as an EPERM.\n` +
    `      Git does not track attributes, so it will never appear in a diff.\n` +
    `      Fix: node scripts/check-writable.mjs --fix`,
);
console.error(`[ra-elapsed-ms ${Date.now() - started}]`);
process.exit(1);
