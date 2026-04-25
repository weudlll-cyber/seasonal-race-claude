// ============================================================
// File:        SetupScreen.test.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Integration tests for the SetupScreen — guards on the
//              Start Race button and tab navigation
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import SetupScreen from './SetupScreen.jsx';

// Wrap in MemoryRouter because SetupScreen uses <Link> from react-router-dom
function renderSetupScreen() {
  return render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>
  );
}

describe('SetupScreen', () => {
  beforeEach(() => {
    // Start each test with clean localStorage so storage defaults apply
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the RaceArena brand in the header', () => {
    renderSetupScreen();
    // Logo splits text across nodes ("Race" + <span>Arena</span>); check full body text
    expect(document.body).toHaveTextContent(/RaceArena/i);
  });

  it('Start Race button is disabled when no players and no track selected', () => {
    renderSetupScreen();
    expect(screen.getByText(/Start Race/i)).toBeDisabled();
  });

  it('shows the Players tab as selected by default', () => {
    renderSetupScreen();
    // The tab with aria-selected="true" should be "Players"
    const selectedTab = screen.getByRole('tab', { selected: true });
    expect(selectedTab).toHaveTextContent('Players');
  });

  it('navigates to the Track tab when clicked', () => {
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]); // "Track" is the second tab
    expect(screen.getByText('Select Track')).toBeInTheDocument();
  });

  it('navigates to the Settings tab when clicked', () => {
    renderSetupScreen();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[2]); // "Settings" is the third tab
    expect(screen.getByText('Race Settings')).toBeInTheDocument();
  });

  it('shows the gear icon link to /dev', () => {
    renderSetupScreen();
    const gearLink = screen.getByTitle('Open Dev Panel');
    expect(gearLink).toBeInTheDocument();
  });

  it('Quick Test button is disabled when no tracks have a drawn geometry', () => {
    renderSetupScreen();
    // Default tracks all have geometryId: null — button is disabled until a track is drawn.
    const quickTestBtn = screen.getByTitle('Draw a track in the Track Editor first');
    expect(quickTestBtn).toBeDisabled();
  });
});
