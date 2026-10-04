# reports/release — Index

**Owns:** the index of the first-release reports. The work they report on is in
[docs/BACKLOG.md](../../docs/BACKLOG.md). This page only links to them.

| report | what it is |
| --- | --- |
| [MORNING-RELEASE-1.md](MORNING-RELEASE-1.md) | The morning sheet for the night chain of 2026-10-01: done, running, open, and what needs the owner's word. **Read this first.** |
| `TENANCY-SURVEY-1.md` — **not on master**; in the tag `archive/tenancy-survey-1` (`042f06cc`). Read it with `git show archive/tenancy-survey-1:reports/release/TENANCY-SURVEY-1.md` | Piece 2: the tenancy survey, build plan T1–T8 and eight questions. **Not built — decision of 2026-10-01.** |
| [VERIFY-ON-DEMAND-1.md](VERIFY-ON-DEMAND-1.md) | The server half of B1 (2026-10-04, branch `feat/verify-on-demand`, not merged): `POST /api/races/:key/verify`, admin-only, one shared replay module; open-track races were refused before and are not now; 0.8–1.8 s at 20 racers, 3.9–6.5 s at 40. |
| [DELIVERY-DIFF-1.md](DELIVERY-DIFF-1.md) | His installation against the shipped seeds (2026-10-04, read-only): 9 of 12 units identical; searound and seatrack differ in their effects; one own brand, two test groups and three unused backgrounds not shipped. |
| [PROBE-INSTALL-1.md](PROBE-INSTALL-1.md) | The install guide followed literally on 2026-10-03: install, backup, restore, update, rollback and the Docker build. Two doc fixes; the admin, sign-in and race steps not run (`curl` denied by the session). |
| [RELEASE-BASICS-1.md](RELEASE-BASICS-1.md) | Piece 1, delivery basics: install, update and rollback followed literally; `npm run backup`, `npm run status`, `RA_BIND_ADDRESS`; the personal-data and delivery-plan inventories. |
