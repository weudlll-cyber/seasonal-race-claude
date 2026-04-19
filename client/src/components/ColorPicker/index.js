// ============================================================
// File:        index.js
// Path:        client/src/components/ColorPicker/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Swatch-based color picker for racer livery customisation
// ============================================================

import React from 'react';

const DEFAULT_SWATCHES = [
  '#e63946', '#f4a261', '#2a9d8f', '#264653',
  '#e9c46a', '#ffffff', '#aaaaaa', '#000000',
];

function ColorPicker({ value, onChange, swatches = DEFAULT_SWATCHES }) {
  return (
    <div className="color-picker">
      {swatches.map((hex) => (
        <button
          key={hex}
          className={`color-picker__swatch${value === hex ? ' color-picker__swatch--active' : ''}`}
          style={{ background: hex }}
          onClick={() => onChange(hex)}
          aria-label={hex}
        />
      ))}
    </div>
  );
}

export default ColorPicker;
