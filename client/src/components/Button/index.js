// ============================================================
// File:        index.js
// Path:        client/src/components/Button/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Reusable button component with variant and size props
// ============================================================

import React from 'react';

function Button({ children, variant = 'primary', size = 'md', onClick, disabled }) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
