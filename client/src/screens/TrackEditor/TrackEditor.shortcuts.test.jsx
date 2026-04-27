import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackEditor from './TrackEditor.jsx';

// jsdom has no Canvas 2D implementation — provide a no-op stub so the
// render effect doesn't crash when it calls ctx.clearRect etc.
const ctxStub = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  setLineDash: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  globalAlpha: 1,
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub);
  // Return a real-size rect so getCanvasCoords() produces valid integers (1:1 scale).
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    x: 0,
    y: 0,
  }));
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
});

function renderEditor() {
  return render(
    <MemoryRouter>
      <TrackEditor />
    </MemoryRouter>
  );
}

// Click the canvas twice to push two history entries.
function addTwoPoints(canvas) {
  fireEvent.click(canvas, { clientX: 200, clientY: 200 });
  fireEvent.click(canvas, { clientX: 400, clientY: 300 });
}

describe('TrackEditor keyboard shortcuts', () => {
  it('Ctrl+Z triggers undo and enables the Redo button', () => {
    const { container } = renderEditor();
    const canvas = container.querySelector('canvas');

    addTwoPoints(canvas);

    const undoBtn = container.querySelector('button[title="Undo (Ctrl+Z)"]');
    expect(undoBtn.disabled).toBe(false);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: false });

    const redoBtn = container.querySelector('button[title="Redo (Ctrl+Shift+Z)"]');
    expect(redoBtn.disabled).toBe(false);
  });

  it('Ctrl+Shift+Z with uppercase Z triggers redo (regression for the key-case bug)', () => {
    const { container } = renderEditor();
    const canvas = container.querySelector('canvas');

    addTwoPoints(canvas);

    // Undo once so there is an entry to redo.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: false });

    const redoBtn = container.querySelector('button[title="Redo (Ctrl+Shift+Z)"]');
    expect(redoBtn.disabled).toBe(false);

    // Browsers send uppercase 'Z' when Shift is held — this was the bug.
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });

    // Redo consumed the only entry; button must be disabled again.
    expect(redoBtn.disabled).toBe(true);
  });
});
