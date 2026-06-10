# Branding / Sponsored-Event Concept

**Status:** Proposal — for game-master review  
**Date:** 2026-06-11  
**Author:** Claude Code (generated from codebase analysis)

---

## 1. Core Use Case

A game-master runs an **evening of multiple consecutive races for a single brand (sponsor)**. Across the session the brand recurs everywhere: its logo and banners appear on the track, its company colors are applied consistently, race after race. The game-master configures the branding once before the event starts; every subsequent race in the session picks it up automatically.

---

## 2. Placement Zones

### 2.1 Canvas-Rendered Zones (drawn in the render loop)

These appear inside the 1280 × 720 canvas that already renders track, racers, and overlays (`client/src/screens/RaceScreen/drawing/`).

| Zone | Location on canvas | What it shows | Canvas feasibility |
|---|---|---|---|
| **Race title / event header** | Top center (closed: above track; open: y ≈ 38) | `eventName` + optional sponsor tagline | **Already exists** — `drawTitle` / `drawTitleOpen` in `overlayRendering.js` |
| **HUD corner logo** | Top-left or bottom-right corner (16 px inset) | Logo image (max ~120 × 60 px) | Low-cost: `ctx.drawImage` from pre-loaded `HTMLImageElement`; must be loaded once per race start |
| **Start/finish gate banner** | World-space, aligned to finish-line geometry | Coloured banner rectangle with sponsor text | Medium: needs gate position from `EditorShape`; drawn in world transform before camera restore |
| **Trackside banners** | World-space, sampled from outer boundary | Repeating pill/rectangle panels with logo | Medium: sample `cachedLights.outer` array (same positions as light dots) for placement anchors |
| **Final-results overlay** | Full-screen at race end | Sponsor message + logo behind results table | Low-cost: extend `drawFinishedOverlay` with a semi-transparent brand-color backdrop |
| **Countdown overlay** | Pre-race 3-2-1 countdown | Brand color tint on existing countdown | Low-cost: extend `drawCountdownOverlay` with brand palette |

**No-go zones (canvas):**

- The render loop fixed-step block is in the TC-01 HOT set — do not touch physics computations.
- `racerRendering.js`, `trackRendering.js`, `particleRendering.js` are TC-02 — no structural changes there; a brand decal on racer livery is possible only as a uniform color coat override, not as arbitrary image compositing in the draw path.

### 2.2 React / CSS Zones (HTML overlay, outside canvas)

These sit in the DOM layer above the canvas using absolute positioning. Zero cost to the render loop.

| Zone | Component / location | What it shows |
|---|---|---|
| **Persistent screen corner overlay** | Absolute `<div>` in `RaceScreen/index.jsx` | Small logo + sponsor text; always visible during race |
| **Loading / transition screen** | `TransitionContext.jsx` + `TransitionOverlay.css` | Full-brand splash between races (color + logo on fade) |
| **Setup screen header** | `SetupScreen` top bar | Event name as the current session title |
| **Result screen banner** | Post-race result card | Brand color strip + logo below the results table |

---

## 3. Brand Profile Data Model

The existing `BrandingProfiles.jsx` already defines a working profile shape. The proposal below extends it to support the full session/event concept:

```json
{
  "id": "bp_abc123",
  "name": "Acme Winter Event",
  "eventName": "Winter Race Championship",
  "subtitle": "Powered by Acme Corp",
  "primaryColor": "#e63946",
  "secondaryColor": "#f4a261",
  "sponsorText": "Sponsored by Acme Corp",
  "logo": "<base64 data-URL>",
  "isDefault": false,

  // --- NEW fields (Phase 2+) ---
  "placementZones": {
    "cornerOverlay": true,
    "tracksideBanners": true,
    "startGateBanner": false,
    "resultsSplash": true,
    "transitionSplash": true
  },
  "cornerPosition": "top-left",
  "bannerDensity": "medium",
  "logoOpacity": 0.85
}
```

**Storage:** `KEYS.BRANDING` array in localStorage (already used by `BrandingProfiles`). No server-side storage needed for Phase 1.

---

## 4. Session / Event Model

A **session** groups consecutive races under one active brand profile:

```json
{
  "activeBrandingProfileId": "bp_abc123",
  "sessionStartedAt": 1749650000000,
  "racesInSession": 5,
  "sessionName": "Acme Friday Night Races"
}
```

**Storage key:** `KEYS.ACTIVE_SESSION` (new key in `storage.js`).

**Lifecycle:**

1. Game-master opens Dev Screen → Branding Profiles → selects a profile → clicks **"Start Event Session"**.
2. Session ID is written to `KEYS.ACTIVE_SESSION`.
3. Every race start reads `activeBrandingProfileId` and passes it into the race config.
4. Game-master clicks **"End Session"** to clear `KEYS.ACTIVE_SESSION` (races revert to unbranded).

This lifecycle is entirely UI-configurable — no code changes per event.

---

## 5. Color Application (CSS Variables / Theme Layer)

The brand palette should flow through the existing CSS-variable system rather than hard-coded inline styles:

```css
/* Injected at session start by a small React effect in App.jsx or RaceScreen */
:root {
  --brand-primary: #e63946;
  --brand-secondary: #f4a261;
  --brand-text: #ffffff;       /* auto-computed contrast color */
}
```

- The effect reads `activeBrandingProfileId`, finds the profile, and sets these three variables on `document.documentElement`.
- Any React component can then use `var(--brand-primary)` in its inline styles or CSS modules.
- The canvas overlay renderers receive the raw hex values as render-call arguments (CSS vars are not accessible inside `ctx.fillStyle`).

---

## 6. Mapping to the 5 Placeholder Components

These components exist in `client/src/components/` and are currently stubs — none of them are imported by production code. Each maps naturally to a branding UI need:

| Component | Path | Branding use |
|---|---|---|
| **Button** | `components/Button/index.js` | Styled CTA buttons in the event-management flow ("Start Session", "End Session", "Preview"). Variant `'brand'` maps to `--brand-primary`. |
| **Modal** | `components/Modal/index.js` | "Start Event Session" confirmation dialog; live preview of the full branding set before going live. |
| **InputField** | `components/InputField/index.js` | `sessionName` text input; sponsor tagline override per-race (opt-in override field in SetupScreen). |
| **ColorPicker** | `components/ColorPicker/index.js` | Replacement for the raw `<input type="color">` in `BrandingProfiles.jsx` — swap in the swatch picker for a more game-master-friendly UX. Default swatches could be seeded from recently used brand colors. |
| **LogoUploader** | `components/LogoUploader/index.js` | Drop-in replacement for the manual `<input type="file">` logo upload in `BrandingProfiles.jsx`. Handles drag-and-drop and emits `{ file, url }` — convert `url` to base64 via `FileReader` before saving to the profile. |

---

## 7. Phasing

### Phase 1 — Minimal (zero canvas changes)

- **React corner overlay** (absolute `<div>` in `RaceScreen/index.jsx`) — logo + sponsor text, always visible.
- **Transition/loading brand tint** — brand-color background on the existing fade overlay in `TransitionContext`.
- **Event session model** — `KEYS.ACTIVE_SESSION`, "Start/End Session" buttons in `BrandingProfiles`.
- **CSS variable injection** in `App.jsx` effect.
- Integrate `InputField` for `sessionName` and `LogoUploader` for logo upload.

**Risk:** Very low. All changes are in React/DOM layer; zero render-loop or physics touch.

### Phase 2 — Fuller (canvas drawing, additive only)

- **HUD corner logo** — `ctx.drawImage` of pre-loaded brand logo in the post-camera-restore region of `overlayRendering.js`.
- **Results overlay branding** — extend `drawFinishedOverlay` with brand color backdrop and logo.
- **Countdown tint** — extend `drawCountdownOverlay` with brand primary color.
- Integrate `ColorPicker` into `BrandingProfiles` (replace raw `<input type="color">`).
- Add `placementZones` toggles to the branding profile form.

**Risk:** Low. Canvas additions are in `overlayRendering.js`, which is in the DOM-overlay role (not the HOT physics set). Pre-load image once on race mount.

### Phase 3 — Advanced (world-space canvas elements)

- **Start/finish gate banner** — world-space rectangle drawn before the camera inverse transform.
- **Trackside banners** — sampled from `cachedLights.outer` anchor positions; pill shapes with brand color and optional mini-logo.
- **Racer livery tint** — brand `primaryColor` blended into coat assignment for branded "team" liveries.
- Integrate `Modal` for "Preview branding" before going live.
- Integrate `Button` variants throughout the branding management UI.

**Risk:** Medium. Gate and trackside elements require world-coordinate math and must be sandwiched correctly in the draw order. Test on both closed and open track types.

---

## 8. Open Questions

1. **Per-race override or session-lock?** Should the game-master be able to switch branding mid-session (e.g., a second sponsor sponsors the final race), or is a session always one brand start-to-finish?

2. **Logo format constraints.** Currently logos are stored as base64 data-URLs in localStorage (existing `BrandingProfiles` behavior). Large PNG logos (~1 MB) will hit the localStorage 5 MB quota quickly in multi-race sessions. Should logos be stored in IndexedDB or uploaded to the backend?

3. **Canvas 1280 × 720 assumption.** `overlayRendering.js` hardcodes `CW = 1280 / CH = 720`. If the canvas ever becomes responsive/resizable, HUD corner positions will need recalculation. Worth making the brand overlay positions relative (e.g., `CW * 0.02`) from Phase 2 onwards.

4. **Contrast auto-calculation.** `--brand-text` should be computed (WCAG 4.5:1) from the primary color to guarantee readability on any background. A small utility (`client/src/utils/colorContrast.js`) could do this.

5. **Trackside banner density vs. performance.** Sampling every 5th light position as a banner anchor gives ~40–50 banners on a standard oval. Each banner is a `fillRect` + `fillText` — benchmarking recommended before shipping Phase 3.

6. **The 5 stub components are currently unconnected.** They export `default` only (no named exports, no CSS modules). Before integrating them in Phase 1, decide whether they should stay as module-default components or gain named exports + CSS-module styling consistent with the DevScreen system.
