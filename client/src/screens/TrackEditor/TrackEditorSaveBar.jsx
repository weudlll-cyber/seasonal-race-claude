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
