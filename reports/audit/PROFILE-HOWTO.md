# How to capture a DevTools Performance profile (PROD build)

**Purpose:** identify what causes the per-frame stutter in the PROD preview build.
We need a real recorded trace — not a screenshot, not the Performance Monitor.

---

## Step 1 — One server only

Close any browser tabs that have the game open. Then kill all existing Node processes and start
a fresh PROD preview server:

```
# In the project root (Seasonal race claude):
taskkill /F /IM node.exe

cd client
npm run build
npm run preview
```

The terminal will print something like:

```
  ➜  Local:   http://localhost:4173/
```

Note the port (almost always **4173**). Keep this terminal window open.

---

## Step 2 — Open in a normal browser window

Open **Edge** (or Chrome) — **normal window, not incognito**
(incognito was already confirmed not to change the stutter, normal window is fine and keeps DevTools
fully functional).

Navigate to: **`http://localhost:4173`**

---

## Step 3 — Open DevTools → Performance tab

Press **F12** to open DevTools.

Click the **"Performance"** tab at the top of DevTools.
*(Not "Performance monitor" — that's a side panel. The Performance tab has a round ● Record button
in the top-left corner of the panel.)*

---

## Step 4 — Configure capture settings

Click the **gear icon** (⚙ Capture settings) near the top-right of the Performance panel.

Set these two options:
- **CPU:** `No throttling`
- **Enable advanced paint instrumentation:** **OFF** (leave unchecked — keeps the file small)

Screenshots (the camera icon at the top) can be on or off — doesn't matter for this analysis.

---

## Step 5 — Start a race, then record during the stutter

1. On the Setup screen: use **Quick Test** (10 racers is fine — the stutter happens regardless of count).
2. The race starts. Wait for the countdown to finish and the race to begin.
3. **Watch for the stutter moment** — it's most visible right when the first racer jumps ahead
   (the camera zooms in / LEADER phase) and when entering OVERVIEW. That usually happens in the
   first 10–20 seconds of the race.
4. When you **see the stutter happening** (or just before the moment you expect it):
   click the **● Record** button in the Performance panel.
5. Let it record for **5–8 seconds** while the stutter is occurring.
6. Click **Stop** (same button, now shows a square ■).

DevTools will process the trace for a few seconds.

---

## Step 6 — Save the profile

Once the flame chart appears in the Performance panel:

Click the **download arrow icon** (⬇ "Save profile") near the top of the Performance panel.

Save the file as a `.json` file anywhere convenient (e.g., Desktop).

---

## Step 7 — Hand it back

Attach or paste the `.json` file into the chat with CC. That's it.

---

## What we're looking for (one-liner)

We want to see which kind of bar is tallest in the long frames:

| Bar color / label | What it means |
|-------------------|---------------|
| **Yellow "Scripting"** + `Minor GC` / `Major GC` sub-bars | JavaScript garbage collection pausing the main thread |
| **Yellow "Scripting"** + a named function | A specific function consuming CPU |
| **Purple "Rendering" / "Paint"** or **green "GPU"** blocks | Canvas repaint or GPU compositing overhead |
| **Gray "System"** or **"Other"** | OS scheduler / driver overhead |

Any of these can cause the stutter. The profile will tell us which.
