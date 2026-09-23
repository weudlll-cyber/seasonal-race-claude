// ============================================================
// File:        useTrackIO.js
// Path:        client/src/screens/TrackEditor/useTrackIO.js
// Project:     RaceArena
// Created:     2026-05-25
// Description: React hook managing track server I/O state — create, update,
//              delete, and background image upload operations.
// ============================================================

import { useState } from 'react';
import { listTracks, deleteTrack } from '../../modules/track-editor/trackStorage.js';
import { cacheTrackGeometry, removeCachedTrackData } from '../../modules/storage/trackLoader.js';
import {
  createTrackOnServer,
  updateTrackOnServer,
  deleteTrackFromServer,
  uploadTrackBackground,
  removeTrackBackground,
} from '../../services/trackApi.js';
import { API_BASE_URL } from '../../services/api.js';
import { buildTrackFromEditorState, validateEditorState } from './trackEditorSave.js';

/**
 * Manages track server I/O state and operations.
 *
 * @param {object} config
 * @param {object} config.serverTracksCtl  Server tracks controller (from useServerTracksControl).
 * @param {React.MutableRefObject} config.saveTimerRef  Timer ref for the "Saved ✓" label reset.
 */
export function useTrackIO({ serverTracksCtl, saveTimerRef }) {
  const [loadedGeometryId, setLoadedGeometryId] = useState(null);
  const [loadedServerId, setLoadedServerId] = useState(null);
  const [localTracks, setLocalTracks] = useState(() => listTracks());
  const [saveLabel, setSaveLabel] = useState('Save');
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  /**
   * Saves the current track to the server.
   *
   * @param {object} editorState  Current editor values + callbacks for post-save state updates.
   *   Values: mode, centerPoints, centerWidth, innerPoints, outerPoints, closed, trackName,
   *           backgroundImage, backgroundFile, effects, trackLights, editorWorldW, editorWorldH.
   *   Callbacks: setSaveAttempted, setSaveError, setIsDirty, resetHistory, onBgUploaded.
   */
  async function handleSave({
    mode,
    centerPoints,
    centerWidth,
    innerPoints,
    outerPoints,
    closed,
    trackName,
    backgroundImage,
    backgroundFile,
    effects,
    trackLights,
    editorWorldW,
    editorWorldH,
    setSaveAttempted,
    setSaveError,
    setIsDirty,
    resetHistory,
    onBgUploaded,
  }) {
    setSaveAttempted(true);
    if (loadedServerId === null && !backgroundImage && !backgroundFile) {
      setSaveError('Background image is required. Please upload an image first.');
      return;
    }
    const error = validateEditorState({
      mode,
      centerPoints,
      innerPoints,
      outerPoints,
      closed,
      name: trackName.trim(),
    });
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaveError(null);
    setServerError(null);
    setIsSaving(true);

    try {
      const { backgroundImage: _bgUrl, ...trackJson } = buildTrackFromEditorState({
        mode,
        centerPoints,
        centerWidth,
        innerPoints,
        outerPoints,
        closed,
        name: trackName.trim(),
        backgroundImage,
        effects,
        trackLights,
        worldWidth: editorWorldW,
        worldHeight: editorWorldH,
      });

      let savedServerId = loadedServerId;
      let savedGeometryId = loadedGeometryId;

      if (savedServerId) {
        const geometryIdForBody = savedGeometryId ?? `custom-${crypto.randomUUID()}`;
        await updateTrackOnServer(savedServerId, { ...trackJson, geometryId: geometryIdForBody });
        if (!savedGeometryId) {
          savedGeometryId = geometryIdForBody;
          setLoadedGeometryId(geometryIdForBody);
        }
      } else {
        const created = await createTrackOnServer(trackJson);
        savedServerId = created.id;
        savedGeometryId = created.geometryId;
        setLoadedServerId(created.id);
        setLoadedGeometryId(created.geometryId);
      }

      // ★★ THE BACKGROUND UPLOAD GETS ITS OWN try/catch, AND THAT IS THE WHOLE POINT OF THIS SPLIT
      // (POLISH-2026-09-24B, Q-25). These are TWO server calls and they fail for different reasons,
      // but until now one `catch` covered both, so a background that failed after the track saved
      // reported the same "Server unreachable" as a track that never saved at all — and the person
      // was left unable to tell whether their geometry was safe. It is: the track is already on the
      // server at this point. Say so, and name the half that did not land.
      let bgFailed = null;
      if (backgroundFile) {
        try {
          await uploadTrackBackground(savedServerId, backgroundFile);
          onBgUploaded(`${API_BASE_URL}/api/tracks/${savedServerId}/background`);
        } catch (err) {
          bgFailed = err?.message || 'the upload failed';
        }
      }

      await cacheTrackGeometry({ id: savedServerId, geometryId: savedGeometryId });
      await serverTracksCtl.refresh();
      setLocalTracks(listTracks());

      if (bgFailed) {
        // ★ The track is saved and the geometry is cached, so the work is not at risk — but
        // something the person asked for did not happen, so this is NOT "Saved ✓" and the editor is
        // NOT marked clean. `backgroundFile` is deliberately left in state so Save retries the
        // upload alone; the track half will simply update again, which is idempotent.
        setSaveError(
          `The track was SAVED, but its background image did not upload (${bgFailed}). ` +
            'Your geometry is safe on the server. Press Save again to retry just the image.'
        );
        return;
      }

      setIsDirty(false);
      resetHistory();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveLabel('Saved ✓');
      saveTimerRef.current = setTimeout(() => setSaveLabel('Save'), 2000);
    } catch (err) {
      // Reaching here means the TRACK did not save. Named as such, so it cannot be confused with
      // the background-only failure above.
      setServerError(err.message || 'Server unreachable.');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Removes the background image for the currently loaded server track.
   *
   * @param {File|null} backgroundFile  Current backgroundFile state (to clear it on success).
   * @param {Function} setBackgroundImage  Setter from parent (to null on success).
   * @param {Function} setBackgroundFile   Setter from parent (to null on success).
   */
  async function handleRemoveBackground(backgroundFile, setBackgroundImage, setBackgroundFile) {
    if (loadedServerId) {
      setIsSaving(true);
      try {
        await removeTrackBackground(loadedServerId);
      } catch (err) {
        setServerError(err.message || 'Failed to remove background.');
        return;
      } finally {
        setIsSaving(false);
      }
    }
    setBackgroundImage(null);
    setBackgroundFile(null);
  }

  /**
   * Permanently deletes the currently loaded track from server and/or local cache.
   *
   * @param {string} trackName  Track name for the confirmation dialog.
   * @param {Function} onDeleteSuccess  Called after successful delete; parent resets editor state.
   */
  async function handleDelete(trackName, onDeleteSuccess) {
    if (!loadedServerId && !loadedGeometryId) return;
    if (
      !window.confirm(
        `Delete track "${trackName}" and its background image permanently? This cannot be undone.`
      )
    )
      return;

    setIsSaving(true);
    try {
      if (loadedServerId) {
        await deleteTrackFromServer(loadedServerId);
        removeCachedTrackData(loadedGeometryId);
        await serverTracksCtl.refresh();
      } else if (loadedGeometryId) {
        deleteTrack(loadedGeometryId);
      }
      setLocalTracks(listTracks());
      setLoadedGeometryId(null);
      setLoadedServerId(null);
      onDeleteSuccess();
    } catch (err) {
      setServerError(err.message || 'Failed to delete track.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    loadedGeometryId,
    setLoadedGeometryId,
    loadedServerId,
    setLoadedServerId,
    localTracks,
    setLocalTracks,
    saveLabel,
    isSaving,
    serverError,
    setServerError,
    handleSave,
    handleRemoveBackground,
    handleDelete,
  };
}
