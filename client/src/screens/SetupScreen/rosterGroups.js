// ============================================================
// File:        rosterGroups.js
// Path:        client/src/screens/SetupScreen/rosterGroups.js
// Project:     RaceArena — PLAYER-GROUPS-1
// Created:     2026-09-03
// Description: How a roster divides into its player groups. One home, shared by the picker, the
//              roster list and the start bar.
// ============================================================
//
// It is a plain module rather than an export beside a component for the reason the lint rule gives
// — a file that exports both a component and a helper breaks fast refresh — and for a better one:
// THREE places ask this question (the chips' counts, the roster's headings, the start bar's
// summary), and three answers to it would be three chances to disagree about who is in which group.

/** The heading hand-added players appear under. They belong to no group and are not made to. */
export const UNGROUPED_LABEL = 'All';

/**
 * Split a roster into its groups, ungrouped players last under `UNGROUPED_LABEL`.
 *
 * ORDER IS THE ORDER THE GROUPS ARRIVED IN, not alphabetical: the operator picked them in some
 * order, and a list that re-sorts itself under their hands is harder to work with than one that
 * does not. `All` is pinned last because it is the residue rather than a choice.
 *
 * @param {{name: string, group?: string}[]} players
 * @returns {{label: string, members: object[]}[]}  empty for an empty roster
 */
export function sectionsOf(players) {
  const order = [];
  const byLabel = new Map();
  for (const p of players) {
    const label = p.group || UNGROUPED_LABEL;
    if (!byLabel.has(label)) {
      byLabel.set(label, []);
      order.push(label);
    }
    byLabel.get(label).push(p);
  }
  const labels = order.filter((l) => l !== UNGROUPED_LABEL);
  if (byLabel.has(UNGROUPED_LABEL)) labels.push(UNGROUPED_LABEL);
  return labels.map((label) => ({
    label,
    // DROP-RACER-NUMBER-1: ALPHABETICAL. It sorted by the `racerNumber` badge, which the owner
    // retired on 2026-09-04 — and which was re-rolled on every add and remove, so the list moved
    // under the operator's hands. A start list is read by name.
    members: [...byLabel.get(label)].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
