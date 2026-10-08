// ============================================================
// File:        testAidsDevScreen.test.jsx
// Path:        client/src/screens/DevScreen/sections/testAidsDevScreen.test.jsx
// Project:     RaceArena — TEST-AIDS-1
// Description: The Dev Screen side of the test-aids switch:
//                · the switch itself (TestAidsSection) shows the server's value and asks the server
//                  to change it;
//                · while it is OFF, the diagnostic switches of items 13–25 are locked, with one line
//                  saying why; while ON they are free, as before.
// ============================================================

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const saveTestAids = vi.fn();
vi.mock('../../../services/settingsApi.js', () => ({
  fetchTestAids: vi.fn(),
  saveTestAids: (...a) => saveTestAids(...a),
}));

const { _setTestAidsForTests, testAidsOn } = await import('../../../modules/testAids.js');
const { default: TestAidsSection } = await import('./TestAidsSection.jsx');
const { default: CameraAdvancedSection } = await import('./CameraAdvancedSection.jsx');
const { default: DynamicsTuningSection } = await import('./DynamicsTuningSection.jsx');

/** The checkboxes of items 13–24 and the detour log (on screen and logs). Item 25 is added below. */
const DIAGNOSTIC_TEST_IDS = [
  'cam-diagnostics-toggle',
  'rp-diag-toggle',
  'rp-winner-list-toggle',
  'rp-minimap-badges-toggle',
  'rp-startrow-toggle',
  'top10-speed-monitor-toggle',
  'battle-diag-toggle',
  'comeback-diag-toggle',
  'lead-change-diag-toggle',
  'governor-diag-toggle',
  'cam-frame-log-toggle',
  'cam-detour-log-toggle',
  'perf-log-toggle',
];

function renderDiagnostics() {
  render(
    <>
      <CameraAdvancedSection part="diagnostics" />
      <CameraAdvancedSection part="logs" />
      <DynamicsTuningSection part="speedChanges" />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  saveTestAids.mockReset();
});
afterEach(() => _setTestAidsForTests('unknown'));

describe('the switch itself', () => {
  it('shows OFF, and turning it on asks the server and follows its answer', async () => {
    _setTestAidsForTests(false);
    render(<TestAidsSection />);
    const box = screen.getByTestId('test-aids-switch');
    expect(box.checked).toBe(false);
    expect(screen.getByText(/OFF/)).toBeInTheDocument();
    saveTestAids.mockResolvedValueOnce({ enabled: true });
    fireEvent.click(box);
    await waitFor(() => expect(testAidsOn()).toBe(true));
    expect(saveTestAids).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('test-aids-switch').checked).toBe(true);
  });

  it('a refused change says so and leaves the switch as it was', async () => {
    _setTestAidsForTests(false);
    render(<TestAidsSection />);
    saveTestAids.mockRejectedValueOnce(new Error('test-aids: 403'));
    fireEvent.click(screen.getByTestId('test-aids-switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not store the change/);
    expect(testAidsOn()).toBe(false);
  });
});

describe('items 13–25 in the Dev Screen', () => {
  it('OFF: every diagnostic switch is locked, and the screen says why', () => {
    _setTestAidsForTests(false);
    renderDiagnostics();
    for (const id of [...DIAGNOSTIC_TEST_IDS, 'gap-reroll-devmarker-toggle'])
      expect([id, screen.getByTestId(id).disabled]).toEqual([id, true]);
    expect(screen.getByTestId('test-aids-off-diagnostics')).toHaveTextContent(
      /test-aids switch is off/
    );
    expect(screen.getByTestId('test-aids-off-logs')).toBeInTheDocument();
    expect(screen.getByTestId('test-aids-off-reroll-marker')).toBeInTheDocument();
  });

  it('ON: every diagnostic switch is free, and the line is gone', () => {
    _setTestAidsForTests(true);
    renderDiagnostics();
    for (const id of [...DIAGNOSTIC_TEST_IDS, 'gap-reroll-devmarker-toggle'])
      expect([id, screen.getByTestId(id).disabled]).toEqual([id, false]);
    expect(screen.queryByTestId('test-aids-off-diagnostics')).toBeNull();
  });

  it('item 5, the camera-state pill, is not on the switch — its checkbox is never locked', () => {
    _setTestAidsForTests(false);
    renderDiagnostics();
    expect(screen.getByTestId('cam-hud-toggle').disabled).toBe(false);
  });

  it('turning the switch on unlocks them on the spot', () => {
    _setTestAidsForTests(false);
    renderDiagnostics();
    act(() => _setTestAidsForTests(true));
    expect(screen.getByTestId('battle-diag-toggle').disabled).toBe(false);
  });
});
