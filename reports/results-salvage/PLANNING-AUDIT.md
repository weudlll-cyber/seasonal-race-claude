# Planning-Docs Audit — OPEN items vs shipped code

*Compiled 2026-07-14, master `d26d1c5`. Read-only verification; corrections noted.*

## Headline

The task's premise (ROADMAP marks **D3–D6 Brands/Racers as OPEN, blocked by default brand content**) is
**not what the docs say.** ROADMAP.md and BACKLOG.md **do not track D1–D6 (player-groups / brands / racers
server+client) as open** at all. Phase D is fully shipped (verified in the prior audit: routes, client
services, UI managers, sync components, seeds, tests). The only doc that still presents Phase D as unbuilt
is **`PHASE-D-KONZEPT.md`**, a **German-language concept/planning artifact** from 2026-06-14 (`Stand:
0dda9db`) written *before* implementation — now superseded.

**Net:** very few genuinely falsely-open items. Most flagged "open/pending/deferred" entries are
**correctly** open or deliberately deferred.

## Falsely-open (marked open/planned but SHIPPED)

| File / loc | Item | Claimed | Actual | Evidence | Action |
|---|---|---|---|---|---|
| `ARCHITECTURE.md:78` | surface-effects system | "(planned — VRE-1+)" | ✅ SHIPPED | Module exists (`client/src/modules/surface-effects/`: index, defaultClasses, surfaceClassApi w/ full CRUD, registry, trailResolver, tests); the tree below the comment lists the shipped files | **FIXED** → "(shipped — VRE-1..4)" |
| `PHASE-D-KONZEPT.md` (whole doc) | Brands + Racers + Player-Groups server persistence | "liegen heute nur im localStorage … werden serverseitig persistiert" (localStorage-only today; to be server-persisted) | ✅ SHIPPED | `server/src/routes/{brands,racers,playerGroups}.js` (full CRUD + logo/sprite assets), `client/src/services/{brandApi,racerApi,playerGroupApi}.js`, `BrandingSyncOnAuth`/`RacerSyncOnAuth`, seeded `seasonal-entertainment` brand | **FLAG FOR OWNER** (German + superseded — delete/archive vs banner) |

## Genuinely open / deferred (correctly marked — LEAVE AS-IS)

| File / loc | Item | Status | Verified |
|---|---|---|---|
| `BACKLOG.md:26` | Re-Gate all 4 closed tracks on `9cfa953` | STILL OPEN (already owner-flagged) | No commit/tag confirms completion; correctly open |
| `ROADMAP.md:519`, `BACKLOG.md:188` | TLH-3 (code fallback + export) | ⏳ deferred | Not implemented; correctly deferred |
| `BACKLOG.md:207` | D7d — 100-racer perf (spatial grid, LOD) | deferred | Correctly deferred |
| `BACKLOG.md` B-UX2 / B-UX3 / B-UX4 / B-UX-MinMax | DevScreen cleanup, docs, sprite overhaul, min/max UX | spec still pending | Not built; correctly open |
| `BACKLOG.md:283` | Sim parity — open-track ranking | open | Sim uses raw t; browser uses projected pos — genuinely unmirrored |
| `BACKLOG.md:292` | COMEBACK frequency / sim-parity | open | Genuinely open |
| `BACKLOG.md:724` | Dead-zone guard metric in sim | not yet added | Genuinely open |
| `BACKLOG.md:728` | Longitudinal open-track body overlap (P-1) | still open | Genuinely open physics issue |
| `BACKLOG.md:445` | Q-27 background PNG compression | deferred | Correctly deferred |
| `branding.md:8` | Branding Phase 2/3 (canvas overlays, trackside banners, livery) | not built | Genuinely not built |
| `ROADMAP.md:441` | governor/director follow-ups | ABANDONED | Correctly marked abandoned |

## Ambiguous (owner input needed)

| File / loc | Item | Finding | Question |
|---|---|---|---|
| `PHASE-D-KONZEPT.md` | Phase-D concept doc | Superseded (Phase D shipped) **and** entirely German (violates the English-only rule) | Delete/archive it, or keep with an English "SHIPPED" banner? |
| `BACKLOG.md` D8 | "Full racer config editor: coats edit UI, all fields, sprite-swap UI" | `RacerEditModal.jsx` + `RacerManager.jsx` provide **partial** racer editing; the "full" D8 editor (coats UI, sprite swap) may not be complete | Mark D8 partially-done, or leave fully open? |
| `ROADMAP.md:61` | "Issue D — Racer Redesign Parts 4–5 pending" | Separate track (racer **types**/sprites, not CRUD); status not verified here | Out of this audit's scope — confirm separately if needed |

## Corrections applied
- `ARCHITECTURE.md:78` surface-effects "(planned)" → "(shipped)". Committed `bdfe4c6`.
- `PHASE-D-KONZEPT.md` **deleted** (owner: superseded + German rule-violation). Committed `c22fd86`.
- `BACKLOG.md` D8 marked **PARTIAL** (owner) — basic racer editing shipped (RacerManager +
  RacerEditModal); coats-edit + sprite-swap UI remain. Committed `c22fd86`.

## Resolved — nothing left held.
