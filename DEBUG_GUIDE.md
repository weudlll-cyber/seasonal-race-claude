# RaceScreen Debug Guide

The race screen now includes comprehensive debugging tools to diagnose the black screen issue.

## What You'll See

When you navigate to http://localhost:3001/race, you'll see a **green debug panel in the top-left corner** with diagnostic information:

```
DEBUG INFO
raceData: LOADED or MISSING
error: none or error message
gameState: countdown/racing/finished
racers count: [number]
trackId: dirt-oval
event: Quick Test
racers:
- Player 1 (🐴)
- Player 2 (🦆)
...
sessionStorage.activeRace: EXISTS or MISSING
```

## Testing Steps

### Option 1: Use Quick Test Button (Recommended)
1. Go to http://localhost:3001/setup
2. Click the **⚡ Quick Test** button
3. Watch the console for messages: `[QuickTest] Saving race data...`
4. You'll be redirected to /race
5. **Look at the green debug panel** to see:
   - Is raceData LOADED?
   - Are all 6 players listed with icons?
   - Does sessionStorage.activeRace show EXISTS?

### Option 2: Manual Test Race (If Quick Test doesn't work)
1. Go to http://localhost:3001/race directly
2. You should see the green debug panel
3. Click the **START TEST RACE** button (green button at bottom of debug panel)
4. This will manually create test data and start the race

## What Each Status Means

| Status | Meaning | Action |
|--------|---------|--------|
| `raceData: LOADED` | Race data exists | Check if canvas is rendering or if there's an error |
| `raceData: MISSING` | No race data in sessionStorage | Click "START TEST RACE" to manually create data |
| `error: none` | No errors detected | Canvas should be rendering or loading |
| `error: [message]` | Canvas or initialization failed | Red error overlay will show the exact error |
| `sessionStorage.activeRace: EXISTS` | Data persisted correctly | Issue is likely with canvas rendering |
| `sessionStorage.activeRace: MISSING` | Data wasn't saved | Issue is with Quick Test button or navigation |

## Debugging Checklist

- [ ] Can you see the green debug panel in the top-left?
- [ ] Does it show `raceData: LOADED`?
- [ ] Does it list 6 players with icons?
- [ ] Does `sessionStorage.activeRace` show `EXISTS`?
- [ ] Does `error:` show `none`?
- [ ] What does `gameState:` show?
- [ ] Can you click "START TEST RACE" button?

## Browser Console

Also check your browser's developer console (F12 or Ctrl+Shift+I):

Look for messages like:
```
[QuickTest] Saving race data:...
[QuickTest] Saved to sessionStorage, navigating to /race
[RaceScreen] Failed to load race data:...
[RaceScreen] Failed to initialize race:...
```

These will tell you exactly where the problem occurs.

## If You See...

### Black screen with no green panel
- Page might not be loading correctly
- Try refreshing the page (Ctrl+Shift+R for hard refresh)
- Check browser console for JavaScript errors

### Green panel shows "raceData: MISSING"
- sessionStorage data isn't persisting
- Click "START TEST RACE" button to manually create data
- Or check browser console for Quick Test errors

### Green panel shows "raceData: LOADED" but black canvas
- Canvas context initialization may be failing
- Check if `error:` shows any message
- Look for errors in browser console

### Green panel shows "error: ..."
- The exact error message will help debug the issue
- Red error overlay will also show the error
- Click "BACK TO SETUP" button to reset

## Report Back

When debugging, please share:
1. What the green debug panel shows (copy the text)
2. Any error messages (from panel or console)
3. What gameState shows
4. Whether raceData is LOADED or MISSING
5. Whether sessionStorage.activeRace shows EXISTS
