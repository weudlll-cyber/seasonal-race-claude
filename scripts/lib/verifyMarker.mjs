// ============================================================
// File:        scripts/lib/verifyMarker.mjs
// Project:     RaceArena — VERIFY-INCREMENTAL-1
//
// WHAT AN INTERMEDIATE `verify` SHOULD COMPARE ITSELF AGAINST.
//
// ── THE PROBLEM, MEASURED ON `feat/playable-four-1` ON 2026-09-05 ───────────────────────────────
//
// `verify.mjs` builds its file set from `git diff --name-only <BASE>...HEAD` with BASE = master. On
// a branch that has been open for a day that was THIRTY-ONE files, so every intermediate run
// re-checked everything the branch had ever touched. A two-line fix to `SetupScreen.jsx` ran
// `world-fingerprint` for 112 s because `apiClient.js`, changed two days earlier, was still in the
// branch diff. Nothing was misrouted — the set was simply the wrong set for the question an
// intermediate run asks, which is "is what I just did all right".
//
// ── ★ THE SAFETY THIS RESTS ON, AND IT IS THE WHOLE ARGUMENT ────────────────────────────────────
//
// THE FULL COMPARISON AGAINST MASTER STILL HAPPENS, EXACTLY ONCE, IN THE `--premerge` RUN BEFORE
// THE MERGE. That run is untouched by everything in this file: it always diffs against master, and
// it neither reads nor writes the marker. The incremental mode is therefore only ever allowed to
// skip work that a GREEN run already covered, and the merge is still gated on the whole branch.
//
// Two consequences follow, and both are enforced below rather than trusted:
//
//   1. THE MARKER ADVANCES ONLY ON A FULLY GREEN, COMPLETE RUN. One failing guard, or an
//      interruption, and it stays where it was. A partially verified tree recorded as verified is
//      the one outcome that would make this mode unsafe, because the NEXT run would then skip the
//      ground that just failed.
//   2. EVERY DOUBT FALLS BACK TO MASTER, LOUDLY. There is no state in which this file quietly
//      compares against less than it can justify. A `verify` that silently checks less than it
//      claims is worse than a slow one.
//
// ── WHERE THE MARKER LIVES, and it is not a free choice ─────────────────────────────────────────
//
// Inside git's own directory, at `<git-dir>/racearena-verify/<branch>.json`. Three reasons, and the
// third is one this repository has already paid for:
//
//   * Git never carries its own directory into a commit, so the brief's "nowhere git will carry
//     into a commit" holds BY CONSTRUCTION rather than by a `.gitignore` line somebody could edit.
//   * `git rev-parse --git-dir` resolves PER WORKTREE (`.git/worktrees/<name>` in a linked one), so
//     two worktrees on two branches cannot share or overwrite each other's marker.
//   * ★ IT MUST NOT BE A FILE IN THE WORKING TREE. `.gitignore` records the incident: the build
//     stamp reads `git status --porcelain`, which counts untracked files, so a stray file makes a
//     bundle built from a clean commit report `+dirty` — at exactly the moment the owner is judging
//     that bundle. Ignored files are not listed by `--porcelain`, so a gitignored path would also
//     have been safe; the git directory is safe without anyone having to remember why.
// ============================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** The format of the marker file. Bumping it invalidates every marker rather than misreading one. */
export const MARKER_VERSION = 1;

/** A branch name is a path with slashes in it; the marker is one file, so the name is flattened. */
export function markerFileName(branch) {
  return `${branch.replace(/[^A-Za-z0-9._-]/g, "_")}.json`;
}

/**
 * THE DECISION, PURE — no git, no filesystem, so every branch of it is tested rather than run.
 *
 * @param {object} p
 * @param {boolean} p.premerge        `--premerge` was given
 * @param {boolean} p.explicitBase    the caller passed `--base=` themselves
 * @param {string|null} p.branch      current branch, or null when HEAD is detached
 * @param {string} p.defaultBranch    the branch a merge targets ("master")
 * @param {object|null} p.marker      the parsed marker, or null when there is none
 * @param {string|null} p.masterSha   what `defaultBranch` points at NOW
 * @param {boolean} p.markerIsAncestor  is the marker's commit an ancestor of HEAD
 * @returns {{base: string, incremental: boolean, note: string}}
 */
export function chooseBase({
  premerge,
  explicitBase,
  branch,
  defaultBranch,
  marker,
  masterSha,
  markerIsAncestor,
}) {
  const full = (note) => ({ base: defaultBranch, incremental: false, note });

  // The pre-merge run is the safety this whole mode rests on. It is never incremental, and it is
  // listed first so no later condition can accidentally reach past it.
  if (premerge)
    return full(
      "the PRE-MERGE run always compares against the whole branch — that is what makes the incremental mode below safe",
    );
  if (explicitBase)
    return {
      base: null, // the caller's own value; verify keeps it
      incremental: false,
      note: "--base was given explicitly, so nothing here second-guesses it",
    };
  if (!branch)
    return full("HEAD is detached, so there is no branch to record progress against");
  if (branch === defaultBranch)
    return full(
      `this IS ${defaultBranch}, where an incremental base would change what an empty run means`,
    );
  if (!marker) return full(`no fully green verify has been recorded for ${branch} yet`);
  if (marker.version !== MARKER_VERSION)
    return full(
      `the recorded marker is format ${marker.version ?? "?"} and this build reads format ${MARKER_VERSION}`,
    );
  if (marker.branch !== branch)
    return full(`the recorded marker was written on ${marker.branch}, not ${branch}`);
  if (!markerIsAncestor)
    return full(
      `the recorded commit ${short(marker.head)} is NOT an ancestor of HEAD — the branch was rebased, reset or switched, so that run says nothing about this tree`,
    );
  // ★ A guard's answer can change because MASTER changed, not only because the branch did: a
  // fingerprint, a doc-link target, a guard's own code can all move underneath a branch that did
  // not touch them.
  if (masterSha && marker.master && marker.master !== masterSha)
    return full(
      `${defaultBranch} has moved since that run (${short(marker.master)} → ${short(masterSha)}), so a guard's answer can differ for reasons this branch did not cause`,
    );

  return {
    base: marker.head,
    incremental: true,
    note: `comparing against the last fully green verify on this branch, ${short(marker.head)}`,
  };
}

const short = (sha) => (typeof sha === "string" ? sha.slice(0, 8) : "?");

// ── The git and filesystem edges, kept thin so the decision above stays pure ────────────────────

const git = (args, cwd) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

/** `<git-dir>/racearena-verify`, resolved per worktree. Null when this is not a git checkout. */
export function markerDir(cwd) {
  const dir = git(["rev-parse", "--absolute-git-dir"], cwd);
  return dir ? join(dir, "racearena-verify") : null;
}

/** Everything the decision needs, gathered from git in one place. */
export function gatherMarkerContext(cwd, defaultBranch) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const dir = markerDir(cwd);
  const path =
    dir && branch && branch !== "HEAD" ? join(dir, markerFileName(branch)) : null;

  let marker = null;
  if (path && existsSync(path)) {
    try {
      marker = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      // A damaged marker is treated as no marker: the fallback is master, which is never wrong.
      marker = null;
    }
  }

  // `merge-base --is-ancestor` exits 0 for yes and 1 for no, so a null from `git()` above would be
  // indistinguishable from "no". It is asked for directly instead.
  let markerIsAncestor = false;
  if (marker?.head) {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", marker.head, "HEAD"], {
        cwd,
        stdio: "ignore",
      });
      markerIsAncestor = true;
    } catch {
      markerIsAncestor = false;
    }
  }

  return {
    branch: branch === "HEAD" ? null : branch,
    head: git(["rev-parse", "HEAD"], cwd),
    masterSha: git(["rev-parse", `${defaultBranch}^{commit}`], cwd),
    marker,
    markerIsAncestor,
    path,
  };
}

/**
 * ★ MAY THIS RUN BE RECORDED AS VERIFIED? Pure, and separate from the writing, so the one rule the
 * mode's safety depends on can be tested directly instead of inferred from a call site.
 *
 * It is deliberately duplicated by a guard at the call site in `verify.mjs`. That is not redundancy
 * for its own sake: the call site knows something this cannot — that the run REACHED THE END — and
 * this knows something a call site can be edited to forget. Either one alone would let a sabotage
 * through; the sabotage recorded in this piece removed the call-site guard, and this caught it.
 *
 * @param {{failed: number, premerge: boolean, dry: boolean}} outcome
 * @returns {{advance: boolean, why: string}}
 */
export function shouldAdvance({ failed, premerge, dry }) {
  if (premerge)
    return {
      advance: false,
      why: "the pre-merge run neither reads nor writes the marker — it is the full comparison the incremental mode leans on",
    };
  if (dry) return { advance: false, why: "--dry ran no guard, so nothing was verified" };
  if (!Number.isInteger(failed))
    return { advance: false, why: "the failure count was not established, so the run cannot be called green" };
  if (failed > 0)
    return {
      advance: false,
      why: `${failed} guard(s) failed — a partially verified tree must never be recorded as verified, or the next run would skip the ground that just failed`,
    };
  return { advance: true, why: "the run was complete and every selected guard passed" };
}

/**
 * Record that this tree was fully verified. The green-only rule is enforced HERE as well as at the
 * call site — see `shouldAdvance` above for why both.
 *
 * @returns {boolean} whether it was written (false = refused, or there was nowhere to write it,
 *                    which is not an error: the next run falls back to master and says so)
 */
export function advanceMarker(cwd, { path, head, branch, masterSha, failed, premerge, dry }) {
  // ★ THE REFUSAL THAT MAKES SABOTAGE (a) VISIBLE. `failed` defaults to 0 for no caller — it is
  // required, and an absent one is treated as "not established" and refused above.
  if (!shouldAdvance({ failed, premerge: !!premerge, dry: !!dry }).advance) return false;
  if (!path || !head || !branch) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify(
        {
          version: MARKER_VERSION,
          branch,
          head,
          master: masterSha,
          at: new Date().toISOString(),
          note: "Written by scripts/verify.mjs after a FULLY GREEN, COMPLETE run. Delete this file to force the next run to compare against master.",
        },
        null,
        2,
      ) + "\n",
    );
    return true;
  } catch {
    return false;
  }
}
