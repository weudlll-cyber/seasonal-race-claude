// ============================================================
// File:        PlayerSetup.test.jsx
// Path:        client/src/screens/SetupScreen/PlayerSetup.test.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Unit tests for PlayerSetup — add, remove, and reshuffle players
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import PlayerSetup from './PlayerSetup.jsx';

// Helper: render with controlled props; returns the onChange spy
function setup(players = []) {
  const onChange = vi.fn();
  render(<PlayerSetup players={players} onChange={onChange} />);
  return { onChange };
}

describe('PlayerSetup', () => {
  it('shows empty-state hint when no players are present', () => {
    setup([]);
    expect(screen.getByText(/No players yet/i)).toBeInTheDocument();
  });

  it('shows "0 / 20 players" counter initially', () => {
    setup([]);
    expect(screen.getByText(/0 \/ 20 players/i)).toBeInTheDocument();
  });

  it('Add button is disabled when input is empty', () => {
    setup([]);
    expect(screen.getByText('Add')).toBeDisabled();
  });

  it('calls onChange with the new player when Add is clicked', () => {
    const { onChange } = setup([]);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledOnce();
    const [newPlayers] = onChange.mock.calls[0];
    expect(newPlayers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Alice' })])
    );
  });

  it('calls onChange with the new player when Enter is pressed', () => {
    const { onChange } = setup([]);
    const input = screen.getByPlaceholderText(/Enter player name/i);
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('trims whitespace from player names before adding', () => {
    const { onChange } = setup([]);
    fireEvent.change(screen.getByPlaceholderText(/Enter player name/i), {
      target: { value: '  Carol  ' },
    });
    fireEvent.click(screen.getByText('Add'));
    const [newPlayers] = onChange.mock.calls[0];
    expect(newPlayers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Carol' })])
    );
  });

  it('removes a player when the remove button is clicked', () => {
    const players = [{ name: 'Alice', racerNumber: 1 }];
    const { onChange } = setup(players);
    fireEvent.click(screen.getByTitle('Remove player'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('calls onChange when Reshuffle is clicked', () => {
    const players = [
      { name: 'Alice', racerNumber: 1 },
      { name: 'Bob', racerNumber: 2 },
    ];
    const { onChange } = setup(players);
    fireEvent.click(screen.getByText(/Reshuffle/i));
    expect(onChange).toHaveBeenCalledOnce();
    const [reshuffled] = onChange.mock.calls[0];
    // All original names must still be present after reshuffle
    expect(reshuffled.map((p) => p.name).sort()).toEqual(['Alice', 'Bob']);
  });

  it('renders each player with a racer badge and name', () => {
    const players = [
      { name: 'Alice', racerNumber: 1 },
      { name: 'Bob', racerNumber: 2 },
    ];
    setup(players);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
