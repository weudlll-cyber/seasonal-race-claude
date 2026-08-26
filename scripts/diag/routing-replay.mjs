// ENGINE-REACH-DATA-FIX-1 (c) — REPLAY THE COMMIT THAT GOT THROUGH.
//
// A repair that cannot demonstrate the historical failure is not demonstrated. This replays one
// commit's real file list through the routing as it is NOW and as it WAS, and prints whether the
// guard that would have caught the break is selected.
//
// It changes nothing and runs no guard.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "../lib/routing.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const SHA = arg("sha", "ba4a4442");
const WANT = arg("want", "script-suite");

const files = execFileSync("git", ["show", "--name-only", "--format=", SHA], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const { guards } = collect();
const matchesOld = (g, f) => {
  if (g.everything) return true;
  if ((g.notDirs ?? []).some((p) => f.startsWith(p))) return false;
  if (new Set(g.files).has(f)) return true;
  return (g.dirs ?? []).some((p) => f.startsWith(p));
};

const subject = execFileSync("git", ["log", "-1", "--format=%s", SHA], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

process.stdout.write(`COMMIT ${SHA} — ${subject}\n`);
process.stdout.write(`  changed ${files.length} file(s):\n`);
for (const f of files) process.stdout.write(`    ${f}\n`);

const oldSel = guards.filter((g) => files.some((f) => matchesOld(g, f))).map((g) => g.id).sort();
const newSel = guards.filter((g) => files.some((f) => g.matches(f))).map((g) => g.id).sort();
const added = newSel.filter((id) => !oldSel.includes(id));

process.stdout.write(`\n  BEFORE — ${oldSel.length} guard(s): ${oldSel.join(", ")}\n`);
process.stdout.write(`  AFTER  — ${newSel.length} guard(s): ${newSel.join(", ")}\n`);
process.stdout.write(`  ADDED  — ${added.length}: ${added.join(", ") || "(none)"}\n\n`);

const wasSelected = oldSel.includes(WANT);
const isSelected = newSel.includes(WANT);
process.stdout.write(`  ${WANT}\n`);
process.stdout.write(`    selected BEFORE this repair : ${wasSelected ? "YES" : "NO  ← the hole"}\n`);
process.stdout.write(`    selected AFTER  this repair : ${isSelected ? "YES ← closed" : "NO"}\n`);

// WHY, in the arbiter's own terms, so the selection can be justified rather than asserted.
const g = guards.find((x) => x.id === WANT);
if (g) {
  const hit = files.find((f) => g.matches(f));
  const via = (g.dataDirs ?? []).find((p) => hit === p || hit?.startsWith(`${p}/`));
  if (via)
    process.stdout.write(
      `    because ${hit}\n      falls under ${via}, which is named by ${(g.dataFrom?.[via] ?? []).join(", ")}\n`
    );
}

process.exitCode = isSelected && !wasSelected ? 0 : 1;
