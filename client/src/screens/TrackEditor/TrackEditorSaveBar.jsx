// ============================================================
// File:        TrackEditorSaveBar.jsx
// Path:        client/src/screens/TrackEditor/TrackEditorSaveBar.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: Bottom save/load bar for the track editor — track name input,
//              background image upload status, and save button.
// ============================================================

import s from './TrackEditor.module.css';

export default function TrackEditorSaveBar({
  barRef,
  isLoadMode,
  trackName,
  backgroundImage,
  backgroundFile,
  allSavedTracks,
  saveDisabled,
  saveLabel,
  isSaving,
  saveAttempted,
  bgUploadError,
  saveError,
  saveHint,
  serverError,
  hasLoaded,
  fileInputRef,
  onNameChange,
  onNameBlur,
  onBgUpload,
  onRemoveBg,
  onSave,
  onLoad,
  onDelete,
  onRetry,
}) {
  return (
    <div className={s.saveBar} ref={barRef}>
      <div className={s.saveBarRow}>
        {isLoadMode ? null : (
          <input
            type="text"
            className={`${s.nameInput}${saveAttempted && !trackName.trim() ? ` ${s.nameInputError}` : ''}`}
            placeholder="Track name…"
            value={trackName}
            data-testid="track-name-input"
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onBgUpload}
        />
        <button
          type="button"
          className={`${s.bgUploadBtn}${!isLoadMode && !backgroundImage && !backgroundFile ? ` ${s.bgUploadBtnRequired}` : ''}`}
          onClick={() => fileInputRef.current?.click()}
          title={
            backgroundImage || backgroundFile
              ? 'Change background image'
              : isLoadMode
                ? 'Upload background image (optional)'
                : 'Upload background image (required)'
          }
        >
          {backgroundImage || backgroundFile
            ? `🖼 ${backgroundFile ? backgroundFile.name : backgroundImage.startsWith('data:') ? 'Image uploaded' : backgroundImage.split('/').pop()}`
            : isLoadMode
              ? '📷 No image'
              : '📷 No image · required'}
        </button>
        {(backgroundImage || backgroundFile) && (
          <button
            type="button"
            className={s.bgRemoveBtn}
            disabled={isSaving}
            onClick={onRemoveBg}
            data-testid="remove-background-btn"
            title="Remove background image"
          >
            Remove background
          </button>
        )}
        <button className={s.saveBtn} disabled={saveDisabled} onClick={onSave}>
          {isSaving ? 'Saving…' : saveLabel}
        </button>
        <select className={s.loadSelect} value="" onChange={onLoad}>
          <option value="" disabled>
            Load track…
          </option>
          {allSavedTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button className={s.deleteBtn} disabled={!hasLoaded || isSaving} onClick={onDelete}>
          Delete
        </button>
      </div>
      {bgUploadError && <p className={s.saveError}>{bgUploadError}</p>}
      {saveError && <p className={s.saveError}>{saveError}</p>}
      {/* ★ POLISH-4d: a HINT, not an error — the save succeeded. Styled apart from `saveError` on
          purpose: telling someone their work failed when it did not is its own defect. */}
      {saveHint && (
        <p
          data-testid="save-hint"
          style={{
            fontSize: '0.8rem',
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.28)',
            borderRadius: '4px',
            padding: '0.3rem 0.5rem',
            marginTop: '0.35rem',
          }}
        >
          ℹ️ {saveHint}
        </p>
      )}
      {serverError && (
        <div
          className={s.saveError}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <span>{serverError}</span>
          <button
            type="button"
            className={s.saveBtn}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
