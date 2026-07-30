# CAMERA-FOCUS-4 — prove what the owner's browser actually executes

Base `origin/master @34f87ad` · presentation-only · fingerprint **`ded0a126048e4cdb` IDENTICAL** (re-minted on the committed state). The owner reports 1:1 identical camera behaviour while the replay measures a transformed camera. The v1 world-edge framing is withdrawn (the owner's geometry: above the leader lies the second border + the INFIELD, not out-of-world). This task refuses to theorize — it makes the live path **printable**.

## STEP 0 — LIVE TRUTH line (permanent)
Every race start now logs one dev-console line (`RaceScreen`), with the short commit stamped into the bundle at build time (`vite.config.js` → `__RA_COMMIT__`):

```
[RA CAMERA LIVE TRUTH] commit=<short> resolvedGrammar=<cut|legacy> leaderForwardFrac=<n|null>
  storedSchema=<v|none> hadStoredConfig=<bool> source{cameraTransitionGrammar}=<stored|default>
  source{leaderForwardFrac}=<stored|default> (observerPhase logged on first anchored entry)
[RA CAMERA LIVE TRUTH] first anchored entry: state=<S> observerPhase=<idle|follow> grammar=<…>
```

`resolvedGrammar` is read from the **live** `CameraDirector` (`transitionGrammar` getter), not from the config object; `observerPhase` is captured on the first LEADER/BATTLE/COMEBACK/LEAD_CHANGE entry (`'follow'` proves the grammar-cut path ran; `'idle'` then a glide proves legacy). The commit tells stale-bundle (old hash) apart from stale-config (new hash + `resolvedGrammar=legacy`) in one glance. **The owner reloads once and pastes this line.** It stays forever — this ends the ghost hunts.

## The prime suspect, tested — and exonerated
The spec's prime suspect was the config merge dropping new keys → the constructor's `'legacy'` fallback. **Measured directly** (`{...DEFAULT_CAMERA_CONFIG, ...stored}` with a realistic v17 stored config: 5 off-default cosmetic keys, no `cameraTransitionGrammar`):

```
resolved cameraTransitionGrammar = cut
resolved leaderForwardFrac        = 0.66
constructor resolves grammar      = cut
```

**The v17 merge already keeps `'cut'`** — a stored config spread over DEFAULT can override values but cannot omit DEFAULT's new keys. Every schema branch in `loadCameraConfig` is `{...DEFAULT, ...stored}` + deep-merged profiles, and there is **no server-side camera-config path** (grep‑confirmed; RaceScreen reads `loadCameraConfig()` from localStorage only). So the config merge is **not** the cause. By elimination the live divergence is almost certainly a **stale bundle** — the owner's browser running pre-FOCUS-3 JS — which the commit stamp will confirm. (The dev server predated the `__RA_COMMIT__` define; it has been restarted so the stamp is live.)

## STEP 1 — the config-merge rule (systemic fix, shipped regardless)
Even though v17 already merges correctly, the "flag never reaches the live config" bug class is real, so the guarantee is now **explicit and branch-independent**: `loadCameraConfig()` resolves the stored config through its migration path, then fills **any** absent top-level DEFAULT key from DEFAULT. A stored config may override a value but can never silently omit new machinery; the `'legacy'` constructor fallback now only ever fires for a truly bare `new CameraDirector()` (test callers). Four unit tests prove it: a v17 config lacking the new keys resolves grammar `cut` + forward-frac 0.66 (and a `CameraDirector` built from it reports `transitionGrammar==='cut'`); a v9-era branch resolves the new keys too; only the no-config constructor is `legacy`; and `cameraConfigProvenance` reports per-key source + schema version.

## STEP 2 — deferred to the owner's eye
Once the owner pastes the LIVE TRUTH line and it shows the new commit + `resolvedGrammar=cut` + `observerPhase=follow`, his browser is verifiably on the new path and his eye on seed 5601 decides. Only **then** re-diagnose whatever remains — **without** the world-edge assumption: on the owner's geometry, centring higher shows the second border and the infield, so if the view still sits low the cause is elsewhere (most likely the legacy centreline path, which STEP 1 rules out, or the Y-framing bias, re-examinable directly).

## Five sentences
1. The camera now prints a commit-stamped LIVE TRUTH line at every race start — resolved grammar, observer phase after entry, and per-key config source — so which build + path the browser runs is settled by a paste, not a theory.
2. The spec's prime suspect (config merge dropping new keys) was tested directly and **exonerated**: the v17 merge already resolves `cameraTransitionGrammar='cut'` for a realistic persisted config, and there is no server-side config path.
3. By elimination the owner's "1:1 identical" is almost certainly a **stale bundle**; the commit stamp in the truth line will confirm it in one glance.
4. STEP 1 still ships the systemic guarantee — `loadCameraConfig` fills any missing DEFAULT key on every branch, so new machinery can never be silently omitted — with four unit tests.
5. Fingerprint is byte-identical (`ded0a126048e4cdb`); the whole change is presentation/diagnostic-only, and the world-edge framing assumption is withdrawn per the owner's track geometry.

## Proposals (≥2)
1. **Owner action: hard-reload and paste the line.** Ctrl-F5 (or clear the site's cache) on seed 5601 and paste the `[RA CAMERA LIVE TRUTH]` line. If `commit` is not `34f8…`/newer, it is a stale bundle → the fix is the reload, not the code. If it shows the new commit + `resolvedGrammar=cut` + `observerPhase=follow`, FOCUS-3 is live and STEP 2's re-diagnosis begins.
2. **Surface a build-version badge + a "cache-bust" reload.** A tiny dev HUD line showing `__RA_COMMIT__` (and a one-click hard reload) would make stale bundles self-evident without opening the console — killing this bug class at the UI layer.
3. **Fold the grammar + forward-frac into the Dev camera panel.** Exposing `cameraTransitionGrammar` and `leaderForwardFrac` as controls lets the owner confirm the resolved values and A/B the grammar live (project principle: everything UI-configurable), and makes any future "flag never reached the config" instantly visible.

> Divergence from the spec, stated plainly: the prime suspect (config merge) does not reproduce — measurement shows it resolves `cut`. The systemic fix ships anyway as defense-in-depth, and the LIVE TRUTH line is the instrument that will name the real cause on the owner's next reload.
