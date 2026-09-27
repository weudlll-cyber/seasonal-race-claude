# MORNING SHEET — DELIVERY-CLEAN-2, the unattended run

**Read this top to bottom.** One sheet for all four arcs, updated as each finishes. Started from
master `392bf975` on 2026-09-27. The OPEN section at the foot is regenerated from the tree each
time, never appended to.

---

## THE ONE-LINE ANSWER SO FAR

**Arc 1 is done: the doors DELIVERY-CLEAN-1 named are now either pinned by a test that fails if they
reopen, or recorded as your decision with both sides.** Nothing that changes what you see was
touched. The one thing I would want you to read first is **B9**, below — you can put this on a
public address over plain HTTP today and *nothing in the product will ever tell you*.

---

## ARC 1 — HARDENING · **MERGED** *(see the merge line at the foot of this section)*

### What was built

| | |
| --- | --- |
| `trustBoundary.audit.test.js` | 3 tests pinning that the server stores and does not adjudicate |
| `uploadBoundsAgreement.audit.test.js` | 4 tests pinning the three upload handlers identical |
| `crossTeamAccess.audit.test.js` | header block: it is **supposed** to go red when tenancy is built |
| `docs/DEPLOY-NOTES.md` §4 | two measured facts added to the section that owns HTTPS |
| `docs/DEPLOY-NOTES.md` §5 | *"How to stand this up without leaving a door open"* — six doors, who decides each |

★ **Every test was sabotaged to prove it fails.** Four sabotages, four reds, all reverted: a
winner-vs-position check, an engine reference in `server/src`, a 413→500 drift, a hardcoded upload
limit.

### ★★ THE ONE TO READ — B9

You can serve this on a public address over plain HTTP, **sign-in will work**, the password and the
session cookie will travel in clear, and **nothing will warn you**. `NODE_ENV` is set nowhere in the
shipped deployment files, so the cookie is never marked `Secure`; `startupReadiness.js` warns about
three other things and contains zero mentions of https, tls or secure. **The fix is one readiness
line and I did not build it** — a new warning at boot is a runtime change you would see. Your word.

### What I did NOT take, and why

| | why |
| --- | --- |
| **binding to `127.0.0.1`** | not purely safer — it **removes** direct same-origin access, which `DEPLOYMENT.md:242` describes as a supported shape with the proxy *optional* |
| **pinning the base image to a digest** | your condition was *"if purely safer"* and it is not: a digest **freezes security patches**, and nothing here watches `FROM` |
| **shortening the 30-day cookie** | the cost is real — an organiser mid-event does not want to re-authenticate, and there is no refresh flow |
| **a boot warning for plain HTTP** | runtime change you would see → B9 |
| **merging the three upload handlers** | live request handling → already commissioned, not arc 1's |

### Two corrections to earlier work

- **B7 overstated its risk.** The upload *bound* is already single-homed in
  `server/utils/imageUpload.js`; only the error *response* is triplicated. One route cannot accept a
  bigger file — it can only answer a violation differently.
- **The 58/59 "contradiction" was not one**, and the brief that raised it was wrong: 58 is the
  router surface, 59 adds `/api/health`. Both correct; the report just never said the scopes
  differed. Now labelled everywhere.

---

## ARC 2 — THE 39 DOCUMENTS · *not started*

## ARC 3 — THE 281 TOOLS · *not started*

## ARC 4 — THE SOURCE · *not started*

---

## WHAT NEEDS YOUR WORD — regenerated from `docs/BACKLOG.md` PART ONE

Nothing here is answerable by measurement; each is a choice between readings.

1. **B9 — a boot warning for plain HTTP?** One readiness line, in the voice of the three that
   already exist. Not built: you would see it.
2. **B4 — bind to loopback?** Safer on a VPS, and it removes direct same-origin access. Either the
   bind or a host firewall is required on a rented server; with neither, a proxy is decoration.
3. **The base image** — reproducibility versus automatic patching. Recorded with both sides.
4. **The 30-day cookie** — convenience versus exposure window.

---

## THE OPEN LIST — regenerated from the tree

**PART ONE: 7 non-audit subjects + 8 open DELIVERY-CLEAN rows = 15.** `docs/OPEN.md` lists **15**.
The two agree.

★ Arc 1 **closed no rows and opened one** (B9). It was a hardening arc: it makes existing
weaknesses harder to reopen silently, which does not resolve them.

---

## BLOCKED

Nothing in arc 1 was blocked.
