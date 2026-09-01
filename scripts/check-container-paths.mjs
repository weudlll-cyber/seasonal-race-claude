// ============================================================
// File:        scripts/check-container-paths.mjs
// Project:     RaceArena — CONTAINER-PATHS-1
//
// THE DOCKERFILE'S COPY SET AND THE COMPOSE MOUNT SET DRIFT APART, AND IT HAS COST THREE TIMES.
// Each time a directory was in one list and not the other, and each time it surfaced only when
// something broke rather than when it diverged:
//   · `utils/` — imported by code the image ran, in neither list; the container could not start.
//   · `shared/` — imported from above the build context, so COPY cannot reach it at all; added to
//     the mount list only after the image was next built and failed.
//   · `seeds/` — COPYed and NOT mounted, so the container ran the last image's seeds. That one was
//     worse than a crash: `readManifest()` returned `{}` and the redelivery mechanism was silently
//     inert, which is the failure the whole seed strand exists to end.
// The lists are short and the comparison is mechanical. A guard can hold it.
//
// ── THE DECISION RULE, AND WHY IT IS NOT EQUALITY ────────────────────────────────────────────────
//
// THE TWO LISTS ARE NOT MEANT TO BE IDENTICAL, and a guard demanding that they are would be wrong
// on the tree it was written against — it would fail on `shared/` and `utils/` from its first run,
// and a guard that is wrong on day one gets silenced inside a week.
//
// So the rule is: **every divergence must be DECLARED, not that none may exist.** `DECLARED_
// DIVERGENCES` below carries one entry per accepted difference WITH THE REASON IT DIVERGES, and the
// guard fails on any divergence that is not on it. Adding a divergence therefore costs a sentence
// explaining it, which is the whole mechanism: the three failures above were all undeclared and
// unexplained, and each would have been caught by having to write that sentence.
//
// ── WHAT THIS GUARD CANNOT SEE, stated here rather than discovered later ─────────────────────────
//
// IT COMPARES TWO DECLARATIONS, SO A DIRECTORY MISSING FROM BOTH LISTS IS INVISIBLE TO IT. That is
// the exact shape of the failure it cannot catch, and it is not a small one: `utils/` — the first
// of the three — was in NEITHER list, so this guard would have said nothing about it. What it does
// catch is the other two shapes, COPYed-not-mounted (`seeds/`) and mounted-not-COPYed, and it makes
// the third visible only once somebody adds the directory to one side.
// Answering the missing-from-both case needs a different instrument entirely: one that reads what
// the code IMPORTS and asks whether the container can reach it. That is `engine-reach`-shaped work
// on a different graph, and it is not this file.
//
// Also outside it:
//   · WHETHER A MOUNT WORKS. It reads text; it never starts a container.
//   · Files. Only DIRECTORY copies are compared — `COPY package.json ./` is a file and is skipped,
//     because a mounted file and a copied file are not the same kind of claim.
//   · docker-compose.override.yml, which is gitignored, local, and carries environment only.
//   · Any service but the first. This compose file has one; a second would need this widened, and
//     the loud-failure rule below means a parse that finds nothing fails rather than passing.
//
// LOUD-FAILURE RULE (Lesson 187, proof-of-live): zero COPY directories, zero mounts, or an
// unreadable file all FAIL. A guard that passes because it parsed nothing is indistinguishable
// from a no-op — and this guard's whole job is to notice an absence.
//
// Usage:
//   node scripts/check-container-paths.mjs
//   node scripts/check-container-paths.mjs --declare
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCKERFILE = "server/Dockerfile";
const COMPOSE = "docker-compose.yml";

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
export const GUARD = {
  id: "check-container-paths",
  covers:
    "a directory the Dockerfile COPYs that the compose file does not mount, and a directory it mounts that the Dockerfile does not COPY, unless the divergence is declared here with its reason",
  blind: [
    "a directory missing from BOTH lists — it compares two declarations, so the one failure shape it cannot catch is the one nobody wrote down anywhere (utils/ was exactly this)",
    "whether a mount actually works: it reads text and never starts a container",
    "files rather than directories, docker-compose.override.yml, and any service but the first",
    "what a NAMED build context brings in: `COPY --from=` is skipped because it does not read the build context, so nothing checks that `additional_contexts` and those copies agree",
  ],
  dirs: [],
  files: [DOCKERFILE, COMPOSE],
  reach: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

// VERIFY-FAST-1: every guard prints its own elapsed time.
const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

// ── THE ALLOW-LIST. One entry per accepted divergence, each with the reason it diverges. ─────────
//
// `kind` is which way it diverges, so an entry cannot silently cover the opposite case:
//   mounted-not-copied — on the host, absent from the image
//   copied-not-mounted — in the image, not overlaid from the host
export const DECLARED_DIVERGENCES = [
  // `shared` STOOD HERE and is gone, closed by IMAGE-STANDALONE-1 on 2026-09-01. Its reason was
  // "it cannot be copied — it sits above the build context", and it named the only way out: move
  // the context. The context moved, the Dockerfile copies `shared/nameLimits.mjs`, and the mount
  // was removed. **That entry was the last thing standing between this image and running on its
  // own**, which is worth recording where the entry used to be.
  {
    name: "server/data",
    kind: "mounted-not-copied",
    reason:
      "IT MUST NEVER BE IN THE IMAGE. `server/data/` is the RUNTIME STORE — this install's accounts (users.json, sessions.sqlite, setup-complete.json) sit there beside the seeded records. It used to be COPYed, which meant an image built on a used machine carried the builder's password hashes and a setup marker that made `POST /api/auth/setup` answer 409 forever on the recipient's fresh install. IMAGE-NO-CREDENTIALS-1 removed the COPY and excluded the directory from the build context; since IMAGE-STANDALONE-1 that exclusion lives in the ROOT .dockerignore, which is an allow-list, so this directory is excluded by not being named rather than by a rule that could be forgotten. This divergence is CORRECT and permanent: an operator's data belongs in a volume, never baked into a layer. Every directory the server needs under it is created at runtime with mkdirSync recursive, so nothing is lost by its absence.",
  },
  // `utils` STOOD HERE and is gone, closed by COPY-UTILS-1 on 2026-09-01. It was labelled "history,
  // not necessity" — inside the build context, one COPY line from not diverging, declared only
  // because the piece that built this guard shipped no behaviour. The Dockerfile now copies it.
  // The stale-entry check above is what surfaced this the moment the COPY landed, which is the
  // entry's last useful act: an allow-list that does not notice its own entries becoming false is
  // how an allow-list rots.
];

const fail = (lines) => {
  for (const l of lines) console.error(l);
  process.exit(1);
};

const read = (rel) => {
  try {
    return readFileSync(join(ROOT, rel), "utf8");
  } catch (err) {
    fail([
      `FAIL: ${rel} is missing or unreadable — ${err.message}`,
      "      This guard compares two lists; without one of them it checks nothing, so it refuses",
      "      rather than passing green.",
    ]);
  }
};

// ── The Dockerfile's COPY set ────────────────────────────────────────────────────────────────────
//
// `COPY <src>... <dest>`: every token but the last is a source. A source ending in `/` is a
// directory; anything else is a file and is skipped (see the blind list).

const dockerfile = read(DOCKERFILE);
const copiedDirs = new Set();
for (const line of dockerfile.split("\n")) {
  const m = /^\s*COPY\s+(.+)$/i.exec(line);
  if (!m) continue;
  // `COPY --from=<stage|context>` DOES NOT READ THE BUILD CONTEXT. It reads an earlier stage or a
  // NAMED build context, so its source is not a host directory this comparison is about and there is
  // nothing to mount. SERVE-SPA-1 found this by adding one: the guard read `dist/` as a directory of
  // `server/` and demanded a mount for `server/dist`, which does not exist. Skipping the line is
  // right — what a named context brings in is declared by the compose file's `additional_contexts`,
  // not by the volume list.
  if (/(^|\s)--from=/.test(m[1])) continue;
  const tokens = m[1]
    .trim()
    .split(/\s+/)
    .filter((t) => !t.startsWith("--"));
  if (tokens.length < 2) continue;
  for (const src of tokens.slice(0, -1)) {
    if (src.endsWith("/")) copiedDirs.add(src.replace(/^\.\//, "").replace(/\/$/, ""));
  }
}

// ── The compose file's mount set, and the build context they are measured against ────────────────

const compose = read(COMPOSE);
// BOTH COMPOSE FORMS. `build: ./server` is the short one; the long one puts the path on its own
// `context:` line, which is what a service needs the moment it declares anything else about the
// build. SERVE-SPA-1 added `additional_contexts` and this guard failed on the very tree it shipped
// with — the short form was the only one it knew.
const contextMatch =
  /^\s*build:\s*(\S+)\s*$/m.exec(compose) ?? /^\s*context:\s*(\S+)\s*$/m.exec(compose);
if (!contextMatch) {
  fail([
    `FAIL: ${COMPOSE} declares no build context (neither \`build: <path>\` nor a \`context:\` line).`,
    "      Without it there is no way to say which host directories the Dockerfile could even",
    "      reach, and the comparison would be meaningless.",
  ]);
}
// A ROOT CONTEXT IS A CONTEXT, and this guard did not know it. `context: .` (IMAGE-STANDALONE-1)
// left `context` as the literal ".", so `"server/src".startsWith("./")` was false and EVERY mount
// was reported as lying outside the build context — a guard failing on the tree it shipped with, for
// the third time. The empty string means "the repository root", under which nothing is outside.
const ctxRaw = contextMatch[1].trim();
const context =
  ctxRaw === "." || ctxRaw === "./" || ctxRaw === ""
    ? ""
    : ctxRaw.replace(/^\.\//, "").replace(/\/$/, ""); // e.g. "server"

/** @type {{host: string, container: string, inContext: boolean, name: string}[]} */
const mounts = [];
for (const line of compose.split("\n")) {
  // `- ./host/path:/container/path   # comment`. An anonymous volume (`- /app/node_modules`) has
  // no host side and is not a claim about the repository, so it never reaches this list.
  const m = /^\s*-\s+(\.\/[^:\s]+):([^:\s]+)/.exec(line);
  if (!m) continue;
  const host = m[1].replace(/^\.\//, "");
  const inContext = context === "" ? true : host.startsWith(`${context}/`);
  mounts.push({
    host,
    container: m[2],
    inContext,
    // With a root context the name IS the host path, because that is how the Dockerfile names it
    // too (`COPY server/src/ ./src/`). With a sub-context it is the path relative to it.
    name: context === "" ? host : inContext ? host.slice(context.length + 1) : host,
  });
}

if (!copiedDirs.size) {
  fail([
    `FAIL: no directory COPY found in ${DOCKERFILE}.`,
    "      A guard that scanned nothing has not found nothing (Lesson 187).",
  ]);
}
if (!mounts.length) {
  fail([
    `FAIL: no host mounts found in ${COMPOSE}.`,
    "      A guard that scanned nothing has not found nothing (Lesson 187).",
  ]);
}

// ── The comparison ───────────────────────────────────────────────────────────────────────────────

const mountedNames = new Set(mounts.map((m) => m.name));
const declared = new Map(DECLARED_DIVERGENCES.map((d) => [`${d.kind}:${d.name}`, d]));

const problems = [];

// COPYed but not mounted — the `seeds/` shape. The image carries a baked copy that the host never
// overlays, so what runs is whatever the last build put there.
for (const name of [...copiedDirs].sort()) {
  if (mountedNames.has(name)) continue;
  if (declared.has(`copied-not-mounted:${name}`)) continue;
  problems.push(
    `  ${context}/${name}/ is COPYed by ${DOCKERFILE} and NOT mounted by ${COMPOSE}.`,
    `     The container will run the copy baked into the last image build, and a change to`,
    `     ${context}/${name}/ will not reach it until somebody rebuilds — silently.`,
    `     FIX: add \`- ./${context}/${name}:/app/${name}\` to the volumes list, or declare the`,
    `     divergence in DECLARED_DIVERGENCES with the reason it is correct.`,
  );
}

// Mounted but not COPYed — the `utils/`/`shared/` shape. Works on this machine, and the image is
// not self-contained without it.
for (const m of mounts.filter((x) => x.inContext).sort((a, b) => a.name.localeCompare(b.name))) {
  if (copiedDirs.has(m.name)) continue;
  if (declared.has(`mounted-not-copied:${m.name}`)) continue;
  problems.push(
    `  ${m.host}/ is mounted by ${COMPOSE} and NOT COPYed by ${DOCKERFILE}.`,
    `     The image is not self-contained: it runs here because the mount supplies the directory,`,
    `     and would not run anywhere the repository is not checked out beside it.`,
    `     FIX: add \`COPY ${m.name}/ ./${m.name}/\` to the Dockerfile, or declare the divergence in`,
    `     DECLARED_DIVERGENCES with the reason it is correct.`,
  );
}

// A mount from OUTSIDE the build context can never be COPYed, so it is always a divergence and
// always needs declaring — `shared/` is the case this exists for.
for (const m of mounts.filter((x) => !x.inContext)) {
  if (declared.has(`mounted-not-copied:${m.name}`)) continue;
  problems.push(
    `  ${m.host} is mounted but lies OUTSIDE the build context (${context}/), so no COPY can ever`,
    `     reach it. This divergence is permanent and must be declared rather than fixed.`,
    `     FIX: add it to DECLARED_DIVERGENCES with the reason the container needs it.`,
  );
}

// A declared entry that no longer describes anything is stale, and a stale allow-list entry is how
// an allow-list stops meaning what it says.
for (const d of DECLARED_DIVERGENCES) {
  const stillDiverges =
    d.kind === "mounted-not-copied"
      ? mountedNames.has(d.name) && !copiedDirs.has(d.name)
      : copiedDirs.has(d.name) && !mountedNames.has(d.name);
  if (!stillDiverges) {
    problems.push(
      `  DECLARED_DIVERGENCES names "${d.name}" (${d.kind}), which is no longer a divergence.`,
      "     Remove the entry: an allow-list carrying entries that describe nothing stops being a",
      "     record of decisions and becomes a list nobody reads.",
    );
  }
}

if (problems.length) {
  fail([
    "FAIL: check-container-paths — the COPY set and the mount set disagree, undeclared.",
    ...problems,
  ]);
}

console.log(
  `check-container-paths: ${copiedDirs.size} COPYed dir(s), ${mounts.length} host mount(s), ` +
    `${DECLARED_DIVERGENCES.length} declared divergence(s) (${DECLARED_DIVERGENCES.map((d) => d.name).join(", ")}); ` +
    "0 undeclared. (It compares two DECLARATIONS — a directory missing from BOTH lists is invisible to it.)",
);
