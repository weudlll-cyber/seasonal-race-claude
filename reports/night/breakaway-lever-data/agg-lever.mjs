// The BREAKAWAY-LEVER-1 table: rows A-D over the growing frames, plus the tie count.
// Reads lever-frames.json; computes nothing the harness could have computed, so the two can be
// re-run independently.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const races = JSON.parse(readFileSync(join(HERE, process.argv[2] ?? "lever-frames.json"), "utf8"));
const eps = races.filter((r) => r.category === "episode");
const F = eps.flatMap((r) => r.frames);
const N = F.length;

const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pc = (n) => (N ? ((100 * n) / N).toFixed(1) + "%" : "—");
const f3 = (x) => (x == null ? "—" : x.toFixed(3));

console.log(`races ${races.length}, with an episode ${eps.length}, GROWING FRAMES N=${N}`);
console.log(`gap at those frames: median ${f3(med(F.map((f) => f.gapPx)))} px, max ${f3(Math.max(...F.map((f) => f.gapPx)))} px\n`);

// ── A · THE RANK SERVO ────────────────────────────────────────────────────────────────────────
const aHelp = F.filter((f) => f.tmTarget > 1 + 1e-9);
const aHurt = F.filter((f) => f.tmTarget < 1 - 1e-9);
const aFlat = N - aHelp.length - aHurt.length;
const arrived = aHelp.map((f) => (f.tmTarget - 1 === 0 ? null : (f.tmInForce - 1) / (f.tmTarget - 1))).filter((x) => x != null);
const restarts = F.filter((f) => f.easeRestarted);
console.log("A · RANK SERVO");
console.log(`   commanding him FORWARD (target > 1)      ${pc(aHelp.length)}   median command ${f3(med(aHelp.map((f) => f.tmTarget)))}`);
console.log(`   commanding him SLOWER  (target < 1)      ${pc(aHurt.length)}   median command ${f3(med(aHurt.map((f) => f.tmTarget)))}`);
console.log(`   commanding exactly 1.0                   ${pc(aFlat)}`);
console.log(`   ★ of the forward commands, share ARRIVED median ${f3(med(arrived))}  (in force ${f3(med(aHelp.map((f) => f.tmInForce)))} vs commanded ${f3(med(aHelp.map((f) => f.tmTarget)))})`);
console.log(`   ease RESTARTED on                        ${pc(restarts.length)}   median travel when restarted ${f3(med(restarts.map((f) => f.easeTravelled).filter((x) => x != null)))}`);
console.log(`   his drawn place: median ${med(F.map((f) => f.drawnRank).filter((x) => x != null))}, share drawn 1st ${pc(F.filter((f) => f.drawnRank === 1).length)}\n`);

// ── B · DRAFTING ──────────────────────────────────────────────────────────────────────────────
const bIn = F.filter((f) => f.inDraftRange);
const bOn = F.filter((f) => f.draftActive);
console.log("B · DRAFTING");
console.log(`   inside draftingMaxDistance (80 px)       ${pc(bIn.length)}`);
console.log(`   boost actually ACTIVE                    ${pc(bOn.length)}`);
console.log(`   median gap to the leader                 ${f3(med(F.map((f) => f.gapPx)))} px   (median when in range ${f3(med(bIn.map((f) => f.gapPx)))})\n`);

// ── C · THE GAP RE-ROLL TILT (reconstructed condition) ────────────────────────────────────────
const cDown = F.filter((f) => f.tilt === "DOWN");
const cUp = F.filter((f) => f.tilt === "UP");
const cNone = F.filter((f) => f.tilt === "none");
const ties = F.filter((f) => f.tie);
console.log("C · GAP RE-ROLL TILT  (the CONDITION the law would read, not an observed roll)");
console.log(`   would tilt DOWN (slower)                 ${pc(cDown.length)}   median gapBehind ${f3(med(cDown.map((f) => f.gapBehindL)))} L`);
console.log(`   would tilt UP   (faster)                 ${pc(cUp.length)}   median gapAhead  ${f3(med(cUp.map((f) => f.gapAheadL)))} L`);
console.log(`   no tilt                                  ${pc(cNone.length)}`);
console.log(`   median gapAhead ${f3(med(F.map((f) => f.gapAheadL)))} L, median gapBehind ${f3(med(F.map((f) => f.gapBehindL)))} L  (G = 0.5 L)`);
console.log(`   ★ TIE (gapBehind EXACTLY == gapAhead, both > G): ${ties.length} of ${N} frames\n`);

// ── D · HIS OWN CEILING ───────────────────────────────────────────────────────────────────────
const dAtMax = F.filter((f) => f.atMaxMult);
const dHeld = F.filter((f) => f.isHeld);
console.log("D · HIS OWN CEILING");
console.log(`   commanded AT maxMult (1.1) — nothing tightening   ${pc(dAtMax.length)}`);
console.log(`   commanded BELOW maxMult                          ${pc(N - dAtMax.length)}   median ${f3(med(F.filter((f) => !f.atMaxMult).map((f) => f.tmTarget)))}`);
console.log(`   he is a HELD hero (the arrival-ceiling population) ${pc(dHeld.length)}\n`);

// ── the whole-race counters, as the cross-check on C ───────────────────────────────────────────
const tel = eps.map((r) => r.telemetry).filter(Boolean);
const sum = (k) => tel.reduce((s, t) => s + (t[k] ?? 0), 0);
console.log("CROSS-CHECK — whole-race counters from collectTelemetry() over the 24 episode races");
console.log(`   gapWindowRolls ${sum("gapWindowRolls")}, gapDownTilts ${sum("gapDownTilts")}, gapUpTilts ${sum("gapUpTilts")}, gapDownAheadGtBehind ${sum("gapDownAheadGtBehind")}`);
