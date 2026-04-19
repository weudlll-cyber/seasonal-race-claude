// ============================================================
// File:        index.js
// Path:        client/src/components/InputField/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Labeled text input with validation message support
// ============================================================

import React from 'react';

function InputField({ label, name, value, onChange, error, type = 'text' }) {
  return (
    <div className="input-field">
      {label && <label className="input-field__label" htmlFor={name}>{label}</label>}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={`input-field__input${error ? ' input-field__input--error' : ''}`}
      />
      {error && <span className="input-field__error">{error}</span>}
    </div>
  );
}

export default InputField;
