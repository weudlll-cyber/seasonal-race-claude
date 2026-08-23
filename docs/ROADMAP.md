# RaceArena — Development Roadmap

**Owns: the PHASE STATUS TABLE below, and nothing else.**

**This file was reduced to a table on 2026-08-23** by ROADMAP-FOLD-1 (NIGHT-2026-08-23 piece 3),
under the owner's decision **D24**: *BACKLOG owns both, with ROADMAP reduced to a phase-status
table.* Before that it half-owned "what is done and what is next" together with
[BACKLOG.md](BACKLOG.md), and two documents half-owning one subject is the thing the merge existed to
end.

**WHERE EVERYTHING WENT — nothing was deleted:**

- **Every completed phase's detail** — its PR numbers, master hashes and what shipped in it — moved
  **whole and unedited** to [BACKLOG.md](BACKLOG.md) → PART TWO → *Phase history — moved whole from
  ROADMAP*.
- **The planned Phases 5, 6 and 7** (server, deployment, multi-tenant) moved **whole** to
  [BACKLOG.md](BACKLOG.md) → PART ONE → *Phases 5–7 — the planned server, deployment and multi-tenant
  arc*.
- **Phase V and Phase T** were already only pointers into BACKLOG and were **not copied**, because
  copying a pointer creates the second home this merge removes. Their items are `V-1`–`V-9` and
  `T-1`–`T-4` in BACKLOG.
- **The session log and the four status updates** moved to the same PART TWO history section.

**It was a MOVE, not an audit.** No verdict was re-checked and no completion claim was confirmed or
withdrawn in the move. **If a record here and one in BACKLOG PART ONE disagree, PART ONE is live.**

**For open work, do not read this file — read [BACKLOG.md](BACKLOG.md) for the evidence, or
[OPEN.md](OPEN.md) for the short list grouped by what has to happen next.**

---

## Phase status

| phase | status | where its detail lives now |
| --- | --- | --- |
| Phase 1 — Setup Screen  100% complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase 2 — Race Engine  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase 2.5 — Track Editor  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase L — Local Backend for Track Storage  Complete (PR #43, #44) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Issue D — Racer Redesign  Parts 1–3 merged, Parts 4–5 pending | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase B — Bug Fixes & Wiring  B-Wave done (PR #25) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D9 — Race Engine Speed Refactor  Done (PR #19, master `dad3300`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D3.5.5 — Per-Type-Tuning-UI  Done (PR #21, master `2d76bc3`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D10 — Track Size Variability + Auto-Sprite-Scaling  Done (PR #23, master `13a2dd2`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| fix/camera-polish + Q-14  Done (PR #28, master `750d826`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D11 — Racer Behavior: Soft Avoidance + Drafting  Done (PR #30, master `d46cab2`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| D7a — Proportional Sprite Scaling + Zoom-Ratios + Label-Scaling  Done (PR #33, master `a49baa0`) | **DONE** | BACKLOG PART TWO — *Phase history* |
| W3 — Race-Type Override  Done (PR #17) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A1 — Open-Track Duration UX + Q-25 Fix  Done (2026-05-03) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2-Diagnose — Speed-Pipeline Scope Analysis  Done (2026-05-03) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2.6 — Race Dynamics  Done (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2.5 — Visual Race Naturalness  Done (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| PR-A2 — Duration-Driven Speed Architecture  Done (2026-05-03) + fix (2026-05-04) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Racer Editor — Phase 1+2  Done (feature/racer-editor → master squash, 2026-05-28) | **DONE** | BACKLOG PART TWO — *Phase history* |
| QA Pipeline  Complete | **DONE** | BACKLOG PART TWO — *Phase history* |
| D7c — Row Start with Speed Bonus + Track Capacity  Done (PR #39) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase D — Server-Side Storage Migration (groups / brands / racers)  Complete (2026-06-14/15) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase R — Lateral Physics Redesign & Race-Action Controller  Complete — shipped to master (July 2026) | **DONE** | BACKLOG PART TWO — *Phase history* |
| Phase Q — Quality Hygiene | MIXED | BACKLOG PART TWO — *Phase history*; open `Q-` items are in PART ONE |
| Phase V — Verification Sprint (planned) | PLANNED | BACKLOG PART ONE — `V-1`–`V-9` / `T-1`–`T-4` |
| Phase T — Tooltip Retrofit (planned) | PLANNED | BACKLOG PART ONE — `V-1`–`V-9` / `T-1`–`T-4` |
| Phase 5 — Race-Integrity Server & Leaderboard (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Phase 6 — Public Deployment (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Phase 7 — Multi-Tenant (planned) | PLANNED | BACKLOG PART ONE — *Phases 5–7* |
| Session Log | HISTORY | BACKLOG PART TWO — *Phase history* |
| Planned Phase Order (as of 2026-05-06) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-10 — status update (INFRA: sim-trust) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-20 — status update (B2-Heroes shipped: OUTCOME front-action) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-26 — status update (Evolution Act 1: assignment-follows-field CLOSED — reverted after negative SCREEN) | HISTORY | BACKLOG PART TWO — *Phase history* |
| 2026-07-26 — status update (Evolution Act 2: finale front-compression CLOSED — all three builds reverted) | HISTORY | BACKLOG PART TWO — *Phase history* |

---

**Nothing else belongs in this file.** A new phase gets a row here and its work goes in the backlog.
