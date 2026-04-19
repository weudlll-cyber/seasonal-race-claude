// ============================================================
// File:        index.js
// Path:        client/src/components/Modal/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Overlay modal component with title, body slot, and close handler
// ============================================================

import React from 'react';

function Modal({ isOpen, title, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <span>{title}</span>
          <button className="modal__close" onClick={onClose}>×</button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
