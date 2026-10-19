// ============================================================================================
// THE BACKUP AND RESET TEXTS SAY WHAT THE BROWSER REALLY HOLDS (fix/backup-reset-texts).
//
// WHAT WAS WRONG. The Dev Screen's "Backup and reset" card promised that the browser export covered
// "tracks, racers, groups, branding", that the reset deleted custom tracks, racers, groups and
// branding, and that it restored "the 5 built-in tracks, 5 built-in racers". None of it was true:
// `exportAllStorage` / `clearAllStorage` (storage.js) touch only this browser's `racearena:*`
// registry keys, while tracks, racers, player groups and brands live on the server
// (reports/release/OLD-ITEMS-1.md, the V-5 finding). An operator trusting the label believed he
// held a backup he did not hold. Owner decision, 2026-10-13: the texts state what the browser
// backup and the reset cover, and point to the server backup.
//
// WHAT THIS PINS. The CLAIMS, not the wording: the card names the server backup commands and the
// operator guide, no longer lists tracks among what the export holds, and the reset no longer
// promises built-in tracks or racers. Rewording is free; reinstating the false promise is not.
// ============================================================================================
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SystemSettings from './SystemSettings.jsx';
import { CONTROL_INFO } from './controlInfo.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// The card's DESCRIPTION paragraph only — the paragraph right after the title. Not the whole card:
// the card also renders the buttons' info texts, which name `npm run backup` themselves, so a
// whole-card read stayed green with the old description restored (found by the sabotage run).
function cardText(title) {
  return screen.getByText(title).nextElementSibling.textContent;
}

describe('Backup and reset texts', () => {
  // IF DELETED: the export card can again claim to back up tracks, racers, groups and brands, and an
  // operator would skip the server backup believing the JSON file held them.
  it('the export card names the server backup and does not claim to hold tracks', () => {
    render(<SystemSettings />);
    const text = cardText('Backup & Restore');
    expect(text).toContain('npm run backup');
    expect(text).toContain('racearena backup');
    expect(text).toContain('docs/OPERATOR-GUIDE.md');
    expect(text).not.toMatch(/settings \(tracks/);
    expect(text).toMatch(/does not back\s+up tracks, racers, player groups or brands/);
  });

  // IF DELETED: the reset card can again promise built-in tracks and racers it never restores.
  it('the reset card promises no built-in tracks or racers and points to the server backup', () => {
    render(<SystemSettings />);
    const text = cardText('Factory Reset');
    expect(text).not.toMatch(/built-in/);
    expect(text).toContain('npm run backup');
    expect(text).toMatch(/neither deletes nor restores them/);
  });

  // IF DELETED: the confirmation can again say the reset deletes tracks, racers, groups and
  // branding — the last text read before an irreversible click.
  it('the reset confirmation says server data is not deleted', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SystemSettings />);
    fireEvent.click(screen.getByText('Reset All Settings to Defaults'));
    expect(confirm).toHaveBeenCalledTimes(1);
    const msg = confirm.mock.calls[0][0];
    expect(msg).not.toMatch(/deletes all custom tracks/);
    expect(msg).toMatch(/live on the server and are not deleted/);
  });

  // IF DELETED: the About table can again name a React major that is not the one running — it said
  // "React 18" as a literal through the React 19 upgrade until A7-03 piece 5 (2026-10-19).
  it('the About table names the React major that is actually running', () => {
    render(<SystemSettings />);
    const cell = screen.getByText('Client build').nextElementSibling;
    expect(cell.textContent).toBe(`Vite + React ${React.version.split('.')[0]}`);
  });

  // IF DELETED: the info texts can drift back to implying the export is a full backup.
  it('the export and import info texts send the reader to the server backup', () => {
    expect(CONTROL_INFO['SystemSettings:handleExport']).toContain('npm run backup');
    expect(CONTROL_INFO['SystemSettings:importRef.current?.click']).toMatch(/server backup/);
    expect(CONTROL_INFO['SystemSettings:handleReset']).toMatch(/neither deleted nor restored/);
  });
});
