# RaceArena — Documentation Index

Project overview and quick start live in the root [`README.md`](../README.md).
This index maps the documents under `docs/`.

## Start here / core

- [SETUP.md](SETUP.md) — local setup guide (Node 20+, client + Phase L backend).
- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview: React client, in-browser race logic, Phase L backend, persistence.
- [API.md](API.md) — backend API reference (port 4000, `/api/` endpoints).
- [ROADMAP.md](ROADMAP.md) — development roadmap and phase completion status.
- [BACKLOG.md](BACKLOG.md) — living backlog (see ROADMAP.md for phase context).
- [PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md) — project principles that override convenience when they conflict.
- [DEAD-ENDS.md](DEAD-ENDS.md) — **required reading before ANY race-mechanism proposal or diagnosis:** approaches already built, measured, and retired.

## Subsystem specs & references

- [TRACK_EDITOR.md](TRACK_EDITOR.md) — track editor specification (Center/Boundary modes).
- [TRACK_LIFECYCLE.md](TRACK_LIFECYCLE.md) — track lifecycle and hybrid persistence (TLH-1/2 done, TLH-3 deferred).
- [RACER_DATA_MODEL.md](RACER_DATA_MODEL.md) — racer data model and type definitions.
- [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md) — CameraDirector technical reference (state machine, zoom modes).
- [camera-target-architecture.md](camera-target-architecture.md) — camera target-computation architecture (per-frame target writers).
- [SIM.md](SIM.md) — simulation system documentation (physics, forces, race loop).
- [branding.md](branding.md) — branding system (Phase 1 complete).

## Diagnoses, analyses & history

- [CAMERA_TUNING_DIAGNOSIS.md](CAMERA_TUNING_DIAGNOSIS.md) — camera tuning effectiveness diagnosis report.
- [SPEED_REFACTOR_ANALYSIS.md](SPEED_REFACTOR_ANALYSIS.md) — PR-A2 speed-pipeline refactor analysis.
- [LESSONS.md](LESSONS.md) — accumulated development lessons (L-numbered).
- [AUDIT.md](AUDIT.md) — security & quality audit log (per-cycle entries).
- [AUTH.md](AUTH.md) — authentication & authorization architecture (DESIGN, not built yet).
