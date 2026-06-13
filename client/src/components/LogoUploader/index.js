// ============================================================
// File:        index.js
// Path:        client/src/components/LogoUploader/index.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Drag-and-drop logo uploader for team/racer branding
// Status:      H-03 branding placeholder — intentional stub, not yet wired into the UI. Keep (not dead code).
// ============================================================

import { useRef } from 'react';

function LogoUploader({ value, onChange }) {
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ file, url });
  }

  return (
    <div
      className="logo-uploader"
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {value?.url ? (
        <img src={value.url} alt="Logo preview" className="logo-uploader__preview" />
      ) : (
        <span className="logo-uploader__placeholder">Drop logo here or click to upload</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

export default LogoUploader;
